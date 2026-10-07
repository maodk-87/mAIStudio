/**
 * NoiDungOEditor (plugin OEditor) — hiển thị nội dung HTML do OEditor tạo ra (câu hỏi, phương án, ngữ liệu…):
 * - render sống các công thức toán <span data-cong-thuc="LaTeX"> bằng KaTeX;
 * - gắn Trình xem tài liệu trực tuyến vào các tệp đính kèm <div data-tep> (portal —
 *   giữ theme/context antd như mọi component khác).
 * Dùng thay cho dangerouslySetInnerHTML trần ở mọi nơi hiển thị nội dung câu hỏi.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import { TrinhXemTaiLieu, type NguonTaiLieu } from '../trinh-xem-tai-lieu';
import 'katex/dist/katex.min.css';

export interface NoiDungOEditorProps {
  html?: string;
  className?: string;
  /** Render thẻ span (nội dung nằm trong dòng) thay vì div */
  inline?: boolean;
}

interface KhoiTep {
  noi: HTMLElement;
  nguon: NguonTaiLieu;
}

export default function NoiDungOEditor({ html, className, inline }: NoiDungOEditorProps) {
  const ref = useRef<HTMLDivElement & HTMLSpanElement>(null);
  const [dsTep, setDsTep] = useState<KhoiTep[]>([]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll('[data-cong-thuc]').forEach((el) => {
      const latex = el.getAttribute('data-cong-thuc') ?? '';
      if (!latex) return;
      try {
        katex.render(latex, el as HTMLElement, { throwOnError: false });
      } catch {
        // giữ nguyên text LaTeX fallback bên trong span
      }
    });
    setDsTep(
      Array.from(ref.current.querySelectorAll<HTMLElement>('div[data-tep]')).map((noi) => {
        noi.replaceChildren(); // bỏ tên tệp fallback — trình xem thay thế
        noi.classList.add('tep-dinh-kem');
        return {
          noi,
          nguon: {
            maTep: noi.dataset.maTep || undefined,
            src: noi.dataset.src || undefined,
            ten: noi.dataset.ten ?? 'tep',
            mime: noi.dataset.loai ?? '',
          },
        };
      }),
    );
  }, [html]);

  const cacTrinhXem = dsTep.map((t, i) =>
    createPortal(<TrinhXemTaiLieu nguon={t.nguon} />, t.noi, `tep-${i}`),
  );

  if (inline) {
    return (
      <>
        <span ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html ?? '' }} />
        {cacTrinhXem}
      </>
    );
  }
  return (
    <>
      <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: html ?? '' }} />
      {cacTrinhXem}
    </>
  );
}
