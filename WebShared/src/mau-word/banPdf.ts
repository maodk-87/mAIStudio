/**
 * BẢN PDF của tệp Word đã trộn — dựng từ chính tệp .docx bằng docx-preview (cùng bộ vẽ của trình xem tài liệu)
 * để trang PDF khớp bố cục Word: khổ giấy, lề, đầu/chân trang lấy từ tệp mẫu.
 * - `dungHtmlPdf`: HTML trang A4 (xem trong iframe như trình xem PDF) — dùng cho khung "Bản PDF";
 * - `inPdf`: mở hộp in trình duyệt → "Lưu dưới dạng PDF".
 * Bản PDF thật khi xuất đề do máy chủ chuyển từ tệp Word (LibreOffice headless — docs/apis/23) — ngắt trang
 * tự động có thể lệch vài dòng so với bản xem trước này.
 */
import { boCongThuc } from '../xuat-tep/boCongThuc';
import { thayAnhWmf, tienXuLyCongThucDocx, veDoiTuongVaoDom } from '../trinh-xem-tai-lieu/congThucTaiLieu';

const LOP = 'mwpdf';

const thoat = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Lề trang (pt) đọc từ padding docx-preview gán cho trang đầu */
function leTrang(trang: HTMLElement | null): string {
  if (!trang) return '20mm 15mm 20mm 20mm';
  const s = trang.style;
  return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map((x) => x || '0').join(' ');
}

const CSS_PDF = (le: string, rong: string) => `
html, body { margin: 0; padding: 0; }
body { background: #fff; }
.${LOP}-wrapper { background: transparent !important; padding: 0 !important; display: block !important; }
@media screen {
  body { background: #525659; padding: 16px 0; }
  section.${LOP} { margin: 0 auto 16px !important; box-shadow: 0 2px 10px rgba(0,0,0,.45) !important; }
  .watermark-gia-lap { position: fixed; top: 8px; right: 12px; background: rgba(0,0,0,.55); color: #fff; font: 12px/1.4 system-ui, sans-serif;
    padding: 4px 10px; border-radius: 4px; z-index: 10; }
}
@media print {
  @page { size: ${rong}; margin: ${le}; }
  section.${LOP} { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; min-height: 0 !important;
    break-after: page; page-break-after: always; }
  section.${LOP}:last-of-type { break-after: auto; page-break-after: auto; }
  .watermark-gia-lap { display: none; }
}
`;

/** Dựng HTML tài liệu PDF (đầy đủ <html>) từ tệp .docx */
export async function dungHtmlPdf(tep: Blob, tuyChon: { tieuDe: string; nhanGiaLap?: string }): Promise<string> {
  const { renderAsync } = await import('docx-preview');
  const { noiDung, dsDoiTuong } = await tienXuLyCongThucDocx(tep);
  const than = document.createElement('div');
  const kieu = document.createElement('div');
  // Gắn tạm vào DOM (ẩn) để ảnh/WMF được giải mã như trong trình xem
  Object.assign(than.style, { position: 'fixed', left: '-10000px', top: '0', visibility: 'hidden' });
  document.body.appendChild(than);
  try {
    await renderAsync(noiDung, than, kieu, {
      className: LOP,
      inWrapper: true,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      renderHeaders: true,
      renderFooters: true,
      useBase64URL: true,
    });
    veDoiTuongVaoDom(than, dsDoiTuong);
    await thayAnhWmf(than);
    const trangDau = than.querySelector<HTMLElement>(`section.${LOP}`);
    const khoGiay = trangDau?.style.width && trangDau.style.minHeight ? `${trangDau.style.width} ${trangDau.style.minHeight}` : 'A4';
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${thoat(tuyChon.tieuDe)}</title>${kieu.innerHTML}${
      boCongThuc.css ? `<style>${boCongThuc.css}</style>` : ''
    }<style>${CSS_PDF(leTrang(trangDau), khoGiay)}</style></head><body>${
      tuyChon.nhanGiaLap ? `<div class="watermark-gia-lap">${thoat(tuyChon.nhanGiaLap)}</div>` : ''
    }${than.innerHTML}</body></html>`;
  } finally {
    than.remove();
  }
}

/** Mở hộp in cho HTML PDF đã dựng (iframe ẩn) — người dùng chọn "Lưu dưới dạng PDF" */
export function inHtmlPdf(html: string): void {
  const khung = document.createElement('iframe');
  khung.setAttribute('aria-hidden', 'true');
  Object.assign(khung.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' });
  document.body.appendChild(khung);
  const tl = khung.contentDocument!;
  tl.open();
  tl.write(html);
  tl.close();
  const cs = khung.contentWindow!;
  const don = () => setTimeout(() => khung.remove(), 500);
  cs.addEventListener('afterprint', don, { once: true });
  setTimeout(() => khung.isConnected && khung.remove(), 5 * 60 * 1000);
  // Chờ ảnh base64 giải mã xong
  setTimeout(() => {
    cs.focus();
    cs.print();
  }, 300);
}
