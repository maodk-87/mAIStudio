/**
 * Hook kênh giám sát realtime (SignalR) có dự phòng polling — dùng cho màn điều hành / giám sát / coi thi.
 *
 * - Kết nối hub `duongDan` (+ query), token qua `accessTokenFactory` như `@web-shared/thong-bao`.
 * - Sau khi kết nối / nối lại → `invoke(thamGia.phuongThuc, thamGia.thamSo)` để vào nhóm; nối lại xong tải lại
 *   một lần (có thể đã lỡ sự kiện lúc mất kết nối).
 * - Mỗi sự kiện trong `suKien` → `taiLai` (gộp trong `choGopMs` để không bão request).
 * - Không kết nối được / đứt hẳn / invoke bị từ chối (HubException — sai phạm vi) → kênh `polling`:
 *   `taiLai` theo `chuKyPollingMs` (chỉ khi tab hiển thị) và thử nối lại sau 30 s.
 * - Đổi tham số (hub, query, nhóm, sự kiện) → ngắt kết nối cũ, nối lại. Unmount → dọn dẹp.
 */
import { useEffect, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
import { layAccessTokenMacDinh } from '../api';
import type { KenhCapNhat, SuKienGiamSat, ThamGiaNhom, TuyChonKenhGiamSat } from './types';

/** Chờ trước khi thử nối lại sau khi đứt hẳn / không nối được / bị từ chối vào nhóm */
const CHO_THU_LAI_MS = 30_000;

function ghepDuongDan(duongDan: string, query?: Record<string, string | null | undefined>): string {
  const thamSo = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([khoa, giaTri]) => {
    if (giaTri) thamSo.set(khoa, giaTri);
  });
  const chuoi = thamSo.toString();
  return chuoi ? `${duongDan}${duongDan.includes('?') ? '&' : '?'}${chuoi}` : duongDan;
}

export function useKenhGiamSat({
  duongDan,
  query,
  thamGia,
  suKien,
  taiLai,
  boLoc,
  khiCoSuKien,
  chuKyPollingMs = 5000,
  choGopMs = 1000,
  batDau = true,
  tuLamMoiDuPhong = true,
}: TuyChonKenhGiamSat): KenhCapNhat {
  const [kenh, setKenh] = useState<KenhCapNhat>('polling');

  // Hàm gọi lại giữ ở ref — đổi hàm không làm nối lại
  const taiLaiRef = useRef(taiLai);
  const boLocRef = useRef(boLoc);
  const khiCoSuKienRef = useRef(khiCoSuKien);
  useEffect(() => {
    taiLaiRef.current = taiLai;
    boLocRef.current = boLoc;
    khiCoSuKienRef.current = khiCoSuKien;
  });

  // Khóa tham số kết nối — so theo giá trị để object/array tạo mới mỗi render không làm nối lại
  const khoa = batDau ? JSON.stringify([ghepDuongDan(duongDan, query), thamGia, suKien]) : '';

  useEffect(() => {
    if (!khoa) return undefined;
    const [url, nhom, dsSuKien] = JSON.parse(khoa) as [string, ThamGiaNhom | null, string[]];
    let huy = false;
    let ketNoi: HubConnection | null = null;
    let henThuLai: ReturnType<typeof setTimeout> | undefined;
    let henGop: ReturnType<typeof setTimeout> | undefined;

    const goiTaiLai = () => {
      if (henGop || huy) return;
      henGop = setTimeout(() => {
        henGop = undefined;
        if (!huy) taiLaiRef.current();
      }, choGopMs);
    };

    const vaoNhom = async (kn: HubConnection) => {
      if (nhom) await kn.invoke(nhom.phuongThuc, nhom.thamSo);
    };

    const henNoiLai = () => {
      if (huy || henThuLai) return;
      henThuLai = setTimeout(() => {
        henThuLai = undefined;
        void noiKetNoi();
      }, CHO_THU_LAI_MS);
    };

    const roiVePolling = (kn: HubConnection | null) => {
      if (huy) return;
      setKenh('polling');
      if (kn) void kn.stop().catch(() => undefined);
      henNoiLai();
    };

    async function noiKetNoi() {
      if (huy) return;
      if (!layAccessTokenMacDinh()) {
        roiVePolling(null);
        return;
      }
      const kn = new HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => layAccessTokenMacDinh() ?? '' })
        .withAutomaticReconnect([0, 2_000, 10_000, 30_000])
        .configureLogging(LogLevel.None)
        .build();
      ketNoi = kn;
      dsSuKien.forEach((ten) => {
        kn.on(ten, (duLieu: SuKienGiamSat) => {
          if (huy) return;
          const sk = duLieu ?? ({ loai: '', luc: '' } as SuKienGiamSat);
          if (boLocRef.current && !boLocRef.current(ten, sk)) return;
          khiCoSuKienRef.current?.(ten, sk);
          goiTaiLai();
        });
      });
      kn.onreconnecting(() => {
        if (!huy) setKenh('polling');
      });
      kn.onreconnected(() => {
        vaoNhom(kn).then(
          () => {
            if (huy) return;
            setKenh('realtime');
            goiTaiLai();
          },
          () => roiVePolling(kn),
        );
      });
      kn.onclose(() => {
        if (ketNoi === kn) roiVePolling(null);
      });
      try {
        await kn.start();
        if (huy) {
          await kn.stop().catch(() => undefined);
          return;
        }
        await vaoNhom(kn);
        if (!huy) setKenh('realtime');
      } catch {
        roiVePolling(kn);
      }
    }

    void noiKetNoi();

    return () => {
      huy = true;
      if (henThuLai) clearTimeout(henThuLai);
      if (henGop) clearTimeout(henGop);
      const kn = ketNoi;
      ketNoi = null;
      if (kn) void kn.stop().catch(() => undefined);
      setKenh('polling');
    };
  }, [khoa, choGopMs]);

  // Dự phòng: tự làm mới định kỳ khi không có kênh đẩy (chỉ khi tab đang hiển thị)
  const dangPolling = batDau && tuLamMoiDuPhong && kenh === 'polling';
  useEffect(() => {
    if (!dangPolling) return undefined;
    const hen = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') taiLaiRef.current();
    }, chuKyPollingMs);
    return () => clearInterval(hen);
  }, [dangPolling, chuKyPollingMs]);

  return kenh;
}
