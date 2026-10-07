/**
 * Hiển thị .docx trên trình duyệt bằng docx-preview (Apache-2.0): chia trang theo
 * dấu ngắt trang Word, giữ bảng/ảnh/định dạng; công thức MathType OLE được giải mã
 * thành KaTeX (congThucTaiLieu.ts). Tỉ lệ thu phóng áp bằng CSS zoom.
 */
import { Spin } from 'antd';
import { useEffect, useId, useRef, useState } from 'react';
import { thayAnhWmf, tienXuLyCongThucDocx, veDoiTuongVaoDom } from './congThucTaiLieu';

export interface ThongTinWord {
  soTrang: number;
  soCongThuc: number;
  /** Độ rộng trang (px, tỉ lệ 100%) — để tính "vừa khung" */
  rongTrang: number;
}

interface KhungWordProps {
  noiDung: Blob;
  tiLe: number;
  onThongTin: (tt: ThongTinWord) => void;
  onLoi: (thongBao: string) => void;
}

export default function KhungWord({ noiDung, tiLe, onThongTin, onLoi }: KhungWordProps) {
  const thanRef = useRef<HTMLDivElement>(null);
  const kieuRef = useRef<HTMLDivElement>(null);
  // class riêng từng phiên xem: style docx-preview sinh ra được giới hạn theo class,
  // nhiều tài liệu trên cùng trang không đè kiểu của nhau
  const lop = `txtl-dx-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [dangVe, setDangVe] = useState(true);
  const goiLaiRef = useRef({ onThongTin, onLoi });
  goiLaiRef.current = { onThongTin, onLoi };

  useEffect(() => {
    const than = thanRef.current;
    const kieu = kieuRef.current;
    if (!than || !kieu) return;
    let daHuy = false;
    setDangVe(true);
    (async () => {
      const { renderAsync } = await import('docx-preview');
      const { noiDung: daXuLy, dsDoiTuong } = await tienXuLyCongThucDocx(noiDung);
      if (daHuy) return;
      await renderAsync(daXuLy, than, kieu, {
        className: lop,
        inWrapper: true,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        renderHeaders: true,
        renderFooters: true,
        useBase64URL: true,
      });
      if (daHuy) return;
      let soCongThuc = veDoiTuongVaoDom(than, dsDoiTuong);
      soCongThuc += await thayAnhWmf(than);
      if (daHuy) return;
      const trang = than.querySelectorAll<HTMLElement>(`section.${lop}`);
      goiLaiRef.current.onThongTin({
        soTrang: trang.length,
        soCongThuc,
        rongTrang: trang[0]?.offsetWidth ?? 794,
      });
      setDangVe(false);
    })().catch(() => {
      if (!daHuy) {
        setDangVe(false);
        goiLaiRef.current.onLoi('Không đọc được tệp Word — tệp có thể bị hỏng hoặc không đúng định dạng .docx');
      }
    });
    return () => {
      daHuy = true;
      than.innerHTML = '';
      kieu.innerHTML = '';
    };
  }, [noiDung, lop]);

  return (
    <Spin spinning={dangVe} description="Đang dựng tài liệu…">
      <div ref={kieuRef} />
      <div ref={thanRef} className="txtl__word" style={{ zoom: tiLe }} />
    </Spin>
  );
}
