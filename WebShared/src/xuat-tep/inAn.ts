/**
 * In tài liệu (và "Xuất PDF" = in → chọn máy in "Lưu dưới dạng PDF"): dựng trang A4 trong iframe ẩn
 * (không bị trình duyệt chặn cửa sổ bật lên), chờ ảnh/phông tải xong rồi mở hộp thoại in.
 * Công thức <span data-cong-thuc> được vẽ bằng KaTeX; watermark lặp lại trên mọi trang.
 * Kèm các hàm dựng HTML chuẩn: bảng, quốc hiệu văn bản hành chính, khối chữ ký.
 */
import { boCongThuc } from './boCongThuc';

export interface TuyChonIn {
  /** Tiêu đề cửa sổ in = tên tệp gợi ý khi lưu PDF */
  tieuDe: string;
  huong?: 'doc' | 'ngang';
  /** Chữ mờ chéo giữa mỗi trang */
  watermark?: string;
  /** Chân trang (in ở cuối nội dung — trình duyệt tự thêm số trang nếu người dùng bật "Đầu trang và chân trang") */
  chanTrang?: string;
  /** CSS bổ sung riêng của tài liệu */
  css?: string;
}

export const thoatHtml = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const CSS_NEN = (huong: 'doc' | 'ngang') => `
@page { size: A4 ${huong === 'ngang' ? 'landscape' : 'portrait'}; margin: 15mm 15mm 16mm 20mm; }
html, body { background: #fff !important; color: #000; margin: 0; padding: 0; }
body { font-family: "Times New Roman", Times, serif; font-size: 13pt; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1 { font-size: 16pt; text-align: center; margin: 6pt 0 4pt; text-transform: uppercase; }
h2 { font-size: 14pt; margin: 10pt 0 4pt; }
h3 { font-size: 13pt; margin: 8pt 0 4pt; }
p { margin: 0 0 4pt; }
table { border-collapse: collapse; width: 100%; margin: 4pt 0 8pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
thead { display: table-header-group; }
th, td { border: 1px solid #555; padding: 3pt 5pt; vertical-align: top; font-size: 12pt; }
th { background: #d9e7f5; font-weight: bold; text-align: center; }
td.so, th.so { text-align: right; } td.giua { text-align: center; }
table.khong-vien, table.khong-vien td, table.khong-vien th { border: none !important; background: none; }
img { max-width: 100%; }
.ngat-trang { page-break-after: always; break-after: page; }
.giua { text-align: center; } .phai { text-align: right; } .nghieng { font-style: italic; } .dam { font-weight: bold; }
.mo { color: #555; font-size: 11pt; }
.chan-trang { margin-top: 12pt; font-size: 10pt; color: #555; border-top: 1px solid #aaa; padding-top: 3pt; }
.watermark { position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 28pt; color: rgba(0,0,0,.09);
  white-space: nowrap; pointer-events: none; z-index: 9999; font-weight: bold; }
.katex { font-size: 1.05em; }
`;

/** Vẽ công thức <span data-cong-thuc="LaTeX"> cho bản in (KaTeX khi đã đăng ký — xem boCongThuc.ts) */
export const veCongThuc = (html: string): string => boCongThuc.html(html);

/** Sao chép stylesheet của trang hiện tại (KaTeX, phông) vào tài liệu in */
function kieuTrangHienTai(): string {
  return Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .filter((el) => el.tagName === 'LINK' || (el.textContent ?? '').includes('katex'))
    .map((el) => el.outerHTML)
    .join('');
}

/** Mở hộp thoại in cho một tài liệu HTML (nội dung phần <body>) */
export async function inTaiLieu(noiDungHtml: string, tuyChon: TuyChonIn): Promise<void> {
  const khung = document.createElement('iframe');
  khung.setAttribute('aria-hidden', 'true');
  Object.assign(khung.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0', visibility: 'hidden' });
  document.body.appendChild(khung);
  const tl = khung.contentDocument!;
  tl.open();
  tl.write(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${thoatHtml(tuyChon.tieuDe)}</title>${kieuTrangHienTai()}${boCongThuc.css ? `<style>${boCongThuc.css}</style>` : ""}<style>${CSS_NEN(tuyChon.huong ?? 'doc')}${tuyChon.css ?? ''}</style></head><body>${
      tuyChon.watermark ? `<div class="watermark">${thoatHtml(tuyChon.watermark)}</div>` : ''
    }${veCongThuc(noiDungHtml)}${tuyChon.chanTrang ? `<div class="chan-trang">${thoatHtml(tuyChon.chanTrang)}</div>` : ''}</body></html>`,
  );
  tl.close();
  // Chờ ảnh + phông (tối đa 4 giây) để bản in không thiếu hình
  const anh = Array.from(tl.images).filter((i) => !i.complete);
  await Promise.race([
    Promise.all([...anh.map((i) => new Promise((ok) => ((i.onload = ok), (i.onerror = ok)))), tl.fonts?.ready]),
    new Promise((ok) => setTimeout(ok, 4000)),
  ]);
  const cs = khung.contentWindow!;
  const don = () => setTimeout(() => khung.remove(), 500);
  cs.addEventListener('afterprint', don, { once: true });
  setTimeout(() => khung.isConnected && khung.remove(), 5 * 60 * 1000);
  cs.focus();
  cs.print();
}

// ————— Dựng HTML chuẩn cho tài liệu in —————

export interface CotIn {
  tieuDe: string;
  /** Độ rộng tương đối (%) */
  rong?: number;
  canh?: 'trai' | 'giua' | 'phai';
}

/** Bảng HTML có tiêu đề cột lặp lại mỗi trang; ô là chuỗi (tự thoát) hoặc { html } */
export function bangHtmlIn(cot: CotIn[], dong: (string | number | null | undefined | { html: string })[][], lop = ''): string {
  const tong = cot.reduce((t, c) => t + (c.rong ?? 0), 0);
  const o = (v: (typeof dong)[number][number], c?: CotIn) =>
    `<td class="${c?.canh === 'phai' ? 'so' : c?.canh === 'giua' ? 'giua' : ''}">${v && typeof v === 'object' ? v.html : thoatHtml(v ?? '')}</td>`;
  return `<table class="${lop}"><colgroup>${cot.map((c) => `<col${c.rong && tong ? ` style="width:${(c.rong / tong) * 100}%"` : ''}>`).join('')}</colgroup><thead><tr>${cot
    .map((c) => `<th>${thoatHtml(c.tieuDe)}</th>`)
    .join('')}</tr></thead><tbody>${dong.map((d) => `<tr>${cot.map((c, i) => o(d[i], c)).join('')}</tr>`).join('')}</tbody></table>`;
}

/** Quốc hiệu + tên đơn vị (văn bản hành chính) */
export function quocHieuHtml(o: { donViCapTren?: string; donVi: string; so?: string; diaDanhNgay?: string }): string {
  return `<table class="khong-vien" style="font-size:12pt"><tr><td class="giua" style="width:42%;font-size:12pt">${o.donViCapTren ? `${thoatHtml(o.donViCapTren.toUpperCase())}<br>` : ''}<b>${thoatHtml(
    o.donVi.toUpperCase(),
  )}</b>${o.so ? `<br>${thoatHtml(o.so)}` : ''}</td><td class="giua" style="font-size:12pt"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b><u>Độc lập - Tự do - Hạnh phúc</u></b></td></tr></table>${
    o.diaDanhNgay ? `<p class="phai nghieng">${thoatHtml(o.diaDanhNgay)}</p>` : ''
  }`;
}

/** Khối chữ ký nhiều cột */
export function chuKyHtml(cot: { chucDanh: string; hoTen?: string; ghiChu?: string }[]): string {
  return `<table class="khong-vien" style="margin-top:14pt"><tr>${cot
    .map(
      (c) =>
        `<td class="giua"><b>${thoatHtml(c.chucDanh.toUpperCase())}</b><br><i>${thoatHtml(c.ghiChu ?? '(Ký, ghi rõ họ tên)')}</i><br><br><br><br><b>${thoatHtml(c.hoTen ?? '')}</b></td>`,
    )
    .join('')}</tr></table>`;
}

/** "Hà Nội, ngày 28 tháng 9 năm 2026" */
export function diaDanhNgay(diaDanh = 'Hà Nội', d = new Date()): string {
  return `${diaDanh}, ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
}
