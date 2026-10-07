/**
 * Hiển thị .pptx trên trình duyệt bằng pptx-preview (ISC) ở chế độ danh sách;
 * điều hướng từng slide do thanh công cụ của trình xem điều khiển (ẩn/hiện slide),
 * không dùng nút mặc định của thư viện. Slide dựng lại theo độ rộng khung
 * (co giãn khung, toàn màn hình). Công thức MathType (ảnh WMF) được thay bằng KaTeX.
 */
import { Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { thayAnhWmf } from './congThucTaiLieu';

export interface ThongTinPowerPoint {
  soSlide: number;
  soCongThuc: number;
  /** cao / rộng của slide (16:9 = 0.5625) */
  tiLeSlide: number;
}

interface KhungPowerPointProps {
  noiDung: Blob;
  /** Độ rộng slide cần dựng (px) */
  doRong: number;
  /** 'mot-slide': chỉ hiện slide đang chọn · 'danh-sach': cuộn toàn bộ slide */
  cheDo: 'mot-slide' | 'danh-sach';
  slideHienTai: number;
  onThongTin: (tt: ThongTinPowerPoint) => void;
  onLoi: (thongBao: string) => void;
}

const TI_LE_MAC_DINH = 9 / 16;

export default function KhungPowerPoint({
  noiDung,
  doRong,
  cheDo,
  slideHienTai,
  onThongTin,
  onLoi,
}: KhungPowerPointProps) {
  const thanRef = useRef<HTMLDivElement>(null);
  const tiLeRef = useRef(TI_LE_MAC_DINH);
  const [dangVe, setDangVe] = useState(true);
  const [phienVe, setPhienVe] = useState(0);
  const goiLaiRef = useRef({ onThongTin, onLoi });
  goiLaiRef.current = { onThongTin, onLoi };

  useEffect(() => {
    const than = thanRef.current;
    if (!than || doRong < 80) return;
    let daHuy = false;
    let trinhXem: { destroy: () => void } | null = null;
    setDangVe(true);
    (async () => {
      const [{ init }, duLieu] = await Promise.all([import('pptx-preview'), noiDung.arrayBuffer()]);
      if (daHuy) return;
      const pv = init(than, {
        width: Math.round(doRong),
        height: Math.round(doRong * tiLeRef.current),
        mode: 'list',
      });
      trinhXem = pv;
      await pv.preview(duLieu);
      if (daHuy) return;
      // tỉ lệ slide thật chỉ biết sau khi đọc tệp — lệch (VD 4:3) thì dựng lại đúng tỉ lệ
      const kichThuoc = pv.pptx as unknown as { width?: number; height?: number } | undefined;
      if (kichThuoc?.width && kichThuoc.height) {
        const tiLeThat = kichThuoc.height / kichThuoc.width;
        if (Math.abs(tiLeThat - tiLeRef.current) > 0.005) {
          tiLeRef.current = tiLeThat;
          setPhienVe((p) => p + 1);
          return;
        }
      }
      const soCongThuc = await thayAnhWmf(than);
      if (daHuy) return;
      goiLaiRef.current.onThongTin({
        soSlide: pv.slideCount,
        soCongThuc,
        tiLeSlide: tiLeRef.current,
      });
      setDangVe(false);
    })().catch(() => {
      if (!daHuy) {
        setDangVe(false);
        goiLaiRef.current.onLoi('Không đọc được tệp PowerPoint — tệp có thể bị hỏng hoặc không đúng định dạng .pptx');
      }
    });
    return () => {
      daHuy = true;
      try {
        trinhXem?.destroy();
      } catch {
        // thư viện đã tự dọn
      }
      than.innerHTML = '';
    };
  }, [noiDung, doRong, phienVe]);

  // ẩn/hiện slide theo chế độ xem
  useEffect(() => {
    if (dangVe || !thanRef.current) return;
    thanRef.current
      .querySelectorAll<HTMLElement>('.pptx-preview-slide-wrapper')
      .forEach((slide, i) => {
        slide.style.display = cheDo === 'danh-sach' || i === slideHienTai ? '' : 'none';
      });
  }, [cheDo, slideHienTai, dangVe]);

  return (
    <Spin spinning={dangVe} description="Đang dựng bài trình chiếu…">
      <div
        ref={thanRef}
        className={`txtl__ppt txtl__ppt--${cheDo}`}
        style={{ minHeight: dangVe ? Math.round(doRong * tiLeRef.current) : undefined }}
      />
    </Spin>
  );
}
