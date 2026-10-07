/**
 * Bộ dựng tài liệu ĐỀ THI chuẩn dùng chung các web (Word .docx thật · bản in/PDF · bảng đáp án Excel/Word).
 * Nhận cấu trúc chuẩn hóa `DeChuan` — mỗi web tự ánh xạ đề/câu hỏi/mã đề của mình sang kiểu này.
 * Bố cục theo đề thi Việt Nam: đầu đề 2 cột (đơn vị + "ĐỀ CHÍNH THỨC" | kỳ thi, môn, thời gian làm bài),
 * dòng "Họ, tên thí sinh … Số báo danh …" + mã đề, các phần, "Câu N." đậm + nội dung HTML (ảnh, công thức),
 * phương án A–D tự xếp 4 cột / 2 cột / 1 cột theo độ dài, "--- HẾT ---", tùy chọn trang đáp án (ngắt trang).
 * Đề thi là dữ liệu NHẠY CẢM: nơi gọi phải ghi nhật ký (ghiNhatKyXuat) và truyền watermark người xuất + mã theo dõi.
 */
import { taoExcel, type TrangTinh } from './excel';
import { inTaiLieu, thoatHtml } from './inAn';
import { taiTep, tenTepXuat } from './taiTep';
import { taoWord, type DoanChu, type KhoiWord, type OWord } from './word';

// ————— Kiểu dữ liệu chuẩn —————

export interface PhuongAnDe {
  /** Nhãn hiển thị: "A", "B"… (trắc nghiệm) hoặc "a", "b"… (ý Đúng/Sai) — thư viện tự thêm dấu "." / ")" */
  nhan: string;
  /** Nội dung phương án (HTML: ảnh, công thức <span data-cong-thuc>; chữ thường cũng được) */
  html: string;
}

export interface CauDe {
  /** Số câu hiển thị ("Câu 1.") */
  so: number | string;
  /** Nội dung câu hỏi (HTML) */
  noiDungHtml: string;
  phuongAn?: PhuongAnDe[];
  /** Kiểu xếp phương án: tự động theo độ dài (mặc định) hoặc ép số cột */
  boCucPhuongAn?: 'tu-dong' | 1 | 2 | 4;
  /** Ý Đúng/Sai: nhãn "a)" thay vì "A." và luôn 1 cột */
  laYDungSai?: boolean;
  diem?: number;
  /** Nhãn loại câu (không in trong đề — dùng cho bảng đáp án) */
  loaiCau?: string;
  /** Số dòng chấm chừa chỗ làm bài (câu tự luận/trả lời ngắn trên đề giấy) — mặc định 0 */
  soDongTraLoi?: number;
  /** Id câu hỏi nguồn (không in) — giao diện xem đề tra ngược câu gốc */
  idCau?: string;
}

export interface PhanDe {
  /** "PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN" — để trống = đề không phân phần */
  ten?: string;
  /** Dòng hướng dẫn in nghiêng dưới tên phần */
  moTa?: string;
  /** In "(x điểm)" sau số câu (thường dùng cho phần tự luận) */
  hienDiem?: boolean;
  cau: CauDe[];
}

export interface DapAnCau {
  cau: number | string;
  /** Đáp án ngắn: "A", "A, C", "a) Đ  b) S…", đáp số… */
  dapAn: string;
  diem?: number;
  /** Hướng dẫn chấm (HTML) — câu tự luận */
  huongDanHtml?: string;
  loaiCau?: string;
}

export interface DeChuan {
  /** Dòng tiêu đề lớn bên phải: "ĐỀ KIỂM TRA GIỮA KỲ I", "KỲ THI TUYỂN SINH VÀO LỚP 10"… */
  tieuDe: string;
  donViCapTren?: string;
  donVi: string;
  /** Dòng phụ dưới tiêu đề: tên kỳ / đợt / năm học */
  kyThi?: string;
  mon: string;
  /** "Khối 8", "Lớp 10"… */
  khoi?: string;
  /** Thời gian làm bài (phút) */
  thoiGian: number;
  /** Mã đề (hoán vị) — không có = đề gốc */
  maDe?: string;
  /** Nhãn góc trái: mặc định "ĐỀ CHÍNH THỨC" (VD "ĐỀ THAM KHẢO", "BẢN DỰ THẢO") */
  loaiBan?: string;
  /** Ghi chú dưới nhãn góc trái: "(Đề có 04 trang)", "(Đề gồm 22 câu)"… */
  ghiChuDauDe?: string;
  phan: PhanDe[];
  /** Đáp án + hướng dẫn chấm — in trang riêng khi `kemDapAn` */
  dapAn?: DapAnCau[];
  /** Ghi chú cuối đề (mặc định: thí sinh không sử dụng tài liệu…) — "" để bỏ */
  ghiChuCuoiDe?: string;
}

export interface TuyChonXuatDe {
  /** Tên tệp (không cần đuôi) — thư viện tự thêm dấu thời gian */
  tenTep: string;
  /** Chữ mờ chéo mọi trang: người xuất · thời điểm · mã theo dõi (BẮT BUỘC với đề thật) */
  watermark?: string;
  /** Thêm trang "ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM" sau mỗi đề (ngắt trang) */
  kemDapAn?: boolean;
  /** Chân trang (mặc định "Môn … – Mã đề …") */
  chanTrang?: string;
  nguoiXuat?: string;
}

export interface BangDapAnMaDe {
  /** "BẢNG ĐÁP ÁN CÁC MÃ ĐỀ" */
  tieuDe: string;
  /** Dòng mô tả: đề, môn, người xuất… */
  moTa?: string[];
  cacMaDe: { ma: string; dapAn: DapAnCau[] }[];
}

// ————— Tiện ích dựng nội dung —————

const GHI_CHU_CUOI_MAC_DINH = 'Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm.';
const laHtml = (s: string) => /<[a-z][\s\S]*>/i.test(s);
/** Chuỗi chữ thường → HTML an toàn; HTML giữ nguyên */
const sangHtml = (s: string) => (laHtml(s) ? s : thoatHtml(s));
const soVn = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const nhanPa = (p: PhuongAnDe, laY?: boolean) => `${p.nhan}${laY ? ')' : '.'}`;

const KHOI_HTML = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'table', 'ul', 'ol', 'figure', 'section']);

/**
 * Chèn tiền tố ("<b>Câu 1.</b> ", "<b>A.</b> ") vào ĐẦU dòng nội dung: nếu nội dung mở đầu bằng đoạn <p>/<div>
 * thì chèn vào trong đoạn đó (không tách dòng), nếu chỉ là chữ/nội tuyến thì bọc chung một đoạn.
 */
export function chenTienToHtml(html: string, tienTo: string): string {
  const goc = new DOMParser().parseFromString(`<body>${html || ''}</body>`, 'text/html').body;
  // Bỏ khoảng trắng đầu
  while (goc.firstChild && goc.firstChild.nodeType === Node.TEXT_NODE && !(goc.firstChild.textContent ?? '').trim()) goc.firstChild.remove();
  const dau = goc.firstChild as Element | null;
  if (!dau) return `<p>${tienTo}</p>`;
  const coKhoi = Array.from(goc.children).some((c) => KHOI_HTML.has(c.localName));
  if (dau.nodeType === Node.ELEMENT_NODE && (dau.localName === 'p' || dau.localName === 'div')) {
    dau.innerHTML = `${tienTo}${dau.innerHTML}`;
    return goc.innerHTML;
  }
  if (!coKhoi) return `<p>${tienTo}${goc.innerHTML}</p>`;
  // Nội tuyến đầu + khối phía sau: gom phần nội tuyến đầu vào đoạn chứa tiền tố
  const doanDau: string[] = [];
  while (goc.firstChild && !(goc.firstChild.nodeType === Node.ELEMENT_NODE && KHOI_HTML.has((goc.firstChild as Element).localName))) {
    const n = goc.firstChild;
    doanDau.push(n.nodeType === Node.ELEMENT_NODE ? (n as Element).outerHTML : thoatHtml(n.textContent ?? ''));
    n.remove();
  }
  return `<p>${tienTo}${doanDau.join('')}</p>${goc.innerHTML}`;
}

/** Độ dài "hiển thị" ước lượng của phương án (ký tự) — ảnh/công thức quy đổi theo kích thước */
function doDaiHienThi(html: string): number {
  if (!laHtml(html)) return html.length;
  const d = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  let dai = 0;
  d.querySelectorAll('img').forEach((i) => {
    const rong = Number(i.getAttribute('width')) || parseInt((i as HTMLElement).style.width) || 240;
    dai += Math.ceil(rong / 7);
    i.remove();
  });
  d.querySelectorAll('[data-cong-thuc],[data-latex]').forEach((el) => {
    const latex = el.getAttribute('data-cong-thuc') ?? el.getAttribute('data-latex') ?? '';
    dai += Math.ceil(latex.replace(/\\[a-zA-Z]+/g, 'x').length * 0.7) + 2;
    el.remove();
  });
  if (d.querySelector('table, ul, ol')) dai += 80;
  return dai + (d.textContent ?? '').replace(/\s+/g, ' ').trim().length;
}

/** Số cột xếp phương án như đề thi Việt Nam: ngắn → 4 cột, vừa → 2 cột, dài → 1 cột */
export function soCotPhuongAn(cau: Pick<CauDe, 'phuongAn' | 'boCucPhuongAn' | 'laYDungSai'>): 1 | 2 | 4 {
  const ds = cau.phuongAn ?? [];
  if (cau.laYDungSai || ds.length === 0) return 1;
  if (cau.boCucPhuongAn && cau.boCucPhuongAn !== 'tu-dong') return cau.boCucPhuongAn;
  const dai = Math.max(...ds.map((p) => doDaiHienThi(p.html)));
  if (ds.length <= 4 && dai <= 18) return 4;
  if (dai <= 40) return 2;
  return 1;
}

/** Chia phương án thành các hàng theo số cột (thứ tự A B / C D như đề in) */
function hangPhuongAn<T>(ds: T[], soCot: number): (T | undefined)[][] {
  const hang: (T | undefined)[][] = [];
  for (let i = 0; i < ds.length; i += soCot) hang.push(Array.from({ length: soCot }, (_, j) => ds[i + j]));
  return hang;
}

const dauCau = (c: CauDe, hienDiem?: boolean) =>
  `<b>Câu ${thoatHtml(c.so)}${hienDiem && c.diem != null ? ` (${soVn(c.diem)} điểm)` : ''}.</b> `;

// ————— WORD —————

function khoiDauDe(de: DeChuan): KhoiWord[] {
  const trai: OWord = {
    doan: [
      ...(de.donViCapTren ? [{ chu: `${de.donViCapTren.toUpperCase()}\n`, co: 12 }] : []),
      { chu: de.donVi.toUpperCase(), dam: true, co: 12 },
      { chu: `\n\n${(de.loaiBan ?? 'ĐỀ CHÍNH THỨC').toUpperCase()}`, dam: true, co: 13 },
      ...(de.ghiChuDauDe ? [{ chu: `\n${de.ghiChuDauDe}`, nghieng: true, co: 12 }] : []),
    ],
    canh: 'giua',
  };
  const phai: OWord = {
    doan: [
      { chu: de.tieuDe.toUpperCase(), dam: true, co: 13 },
      ...(de.kyThi ? [{ chu: `\n${de.kyThi}`, dam: true, co: 13 }] : []),
      { chu: `\nMôn: ${de.mon}${de.khoi ? ` – ${de.khoi}` : ''}`, dam: true, co: 13 },
      { chu: `\nThời gian làm bài: ${de.thoiGian} phút, không kể thời gian phát đề`, nghieng: true, co: 12 },
    ],
    canh: 'giua',
  };
  const thiSinh: OWord = {
    doan: [
      { chu: 'Họ, tên thí sinh: ', dam: true },
      { chu: `${'.'.repeat(52)}\n` },
      { chu: 'Số báo danh: ', dam: true },
      { chu: '.'.repeat(58) },
    ],
  };
  const maDe: OWord = de.maDe ? { doan: [{ chu: `Mã đề thi: ${de.maDe}`, dam: true, co: 14 }], canh: 'phai' } : '';
  return [
    { loai: 'bang', cot: [{ tieuDe: '', rong: 40 }, { tieuDe: '', rong: 60 }], dong: [[trai, phai]], khongVien: true, khongDauBang: true },
    { loai: 'bang', cot: [{ tieuDe: '', rong: 68 }, { tieuDe: '', rong: 32 }], dong: [[thiSinh, maDe]], khongVien: true, khongDauBang: true },
    { loai: 'html', html: '<hr>' },
  ];
}

function khoiCau(c: CauDe, hienDiem?: boolean): KhoiWord[] {
  const khoi: KhoiWord[] = [{ loai: 'html', html: chenTienToHtml(c.noiDungHtml, dauCau(c, hienDiem)) }];
  const ds = c.phuongAn ?? [];
  if (ds.length) {
    const soCot = soCotPhuongAn(c);
    khoi.push({
      loai: 'bang',
      cot: Array.from({ length: soCot }, () => ({ tieuDe: '' })),
      dong: hangPhuongAn(ds, soCot).map((h) => h.map((p) => (p ? { html: chenTienToHtml(sangHtml(p.html), `<b>${thoatHtml(nhanPa(p, c.laYDungSai))}</b> `) } : ''))),
      khongVien: true,
      khongDauBang: true,
    });
  }
  if (c.soDongTraLoi) khoi.push({ loai: 'doan', noiDung: Array.from({ length: c.soDongTraLoi }, () => '.'.repeat(130)).join('\n') });
  return khoi;
}

/** Bảng đáp án + tổng điểm (không ngắt trang, không tiêu đề) — dùng riêng khi trộn trường {{DAP_AN}} vào tệp Word mẫu */
export function khoiBangDapAn(de: DeChuan): KhoiWord[] {
  const ds = de.dapAn ?? [];
  const coHuongDan = ds.some((d) => d.huongDanHtml);
  return [
    ds.length
      ? {
          loai: 'bang',
          cot: [
            { tieuDe: 'Câu', rong: 1, canh: 'giua' },
            { tieuDe: coHuongDan ? 'Đáp án / Hướng dẫn chấm' : 'Đáp án', rong: coHuongDan ? 7 : 3 },
            { tieuDe: 'Điểm', rong: 1.2, canh: 'giua' },
          ],
          dong: ds.map((d) => [
            String(d.cau),
            d.huongDanHtml ? { html: `<p><b>${thoatHtml(d.dapAn)}</b></p>${d.huongDanHtml}` } : { doan: [{ chu: d.dapAn, dam: true }] },
            d.diem != null ? soVn(d.diem) : '',
          ]),
        }
      : { loai: 'doan', noiDung: 'Đề chưa có đáp án.', nghieng: true },
    ...(ds.some((d) => d.diem != null)
      ? [{ loai: 'doan' as const, noiDung: `Tổng điểm: ${soVn(ds.reduce((t, d) => t + (d.diem ?? 0), 0))}`, canh: 'phai' as const, dam: true }]
      : []),
  ];
}

function khoiDapAn(de: DeChuan): KhoiWord[] {
  return [
    { loai: 'ngat-trang' },
    { loai: 'tieu-de', noiDung: 'ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM', cap: 1 },
    { loai: 'doan', noiDung: `Môn: ${de.mon}${de.khoi ? ` – ${de.khoi}` : ''}${de.maDe ? ` · Mã đề: ${de.maDe}` : ''}`, canh: 'giua', nghieng: true },
    ...khoiBangDapAn(de),
  ];
}

/** Nội dung đề KHÔNG có đầu đề: các phần + câu + "HẾT" + ghi chú cuối — dùng riêng khi trộn trường {{NOI_DUNG_DE}} vào tệp Word mẫu */
export function khoiNoiDungDe(de: DeChuan): KhoiWord[] {
  const khoi: KhoiWord[] = [];
  for (const p of de.phan) {
    if (p.ten) khoi.push({ loai: 'doan', noiDung: [{ chu: p.ten, dam: true }] as DoanChu[] });
    if (p.moTa) khoi.push({ loai: 'doan', noiDung: p.moTa, nghieng: true });
    for (const c of p.cau) khoi.push(...khoiCau(c, p.hienDiem));
  }
  khoi.push({ loai: 'doan', noiDung: '------------------ HẾT ------------------', canh: 'giua', dam: true });
  const ghiChu = de.ghiChuCuoiDe ?? GHI_CHU_CUOI_MAC_DINH;
  if (ghiChu) khoi.push({ loai: 'doan', noiDung: `- ${ghiChu}`, nghieng: true, co: 11 });
  return khoi;
}

function khoiMotDe(de: DeChuan, kemDapAn?: boolean): KhoiWord[] {
  return [...khoiDauDe(de), ...khoiNoiDungDe(de), ...(kemDapAn ? khoiDapAn(de) : [])];
}

const dsDe = (de: DeChuan | DeChuan[]) => (Array.isArray(de) ? de : [de]);
const chanTrangMacDinh = (ds: DeChuan[]) => (ds.length === 1 ? `Môn ${ds[0].mon}${ds[0].maDe ? ` – Mã đề ${ds[0].maDe}` : ''}` : undefined);

/** Tạo Blob .docx của một hoặc nhiều đề (mỗi đề bắt đầu trang mới; đáp án sau từng đề nếu `kemDapAn`) */
export async function taoDeThiWord(de: DeChuan | DeChuan[], tuyChon: Omit<TuyChonXuatDe, 'tenTep'> & { tenTep?: string } = {}): Promise<Blob> {
  const ds = dsDe(de);
  const khoi = ds.flatMap((d, i) => [...(i ? [{ loai: 'ngat-trang' as const }] : []), ...khoiMotDe(d, tuyChon.kemDapAn)]);
  return taoWord(khoi, {
    tieuDe: tuyChon.tenTep ?? ds[0]?.tieuDe,
    nguoiTao: tuyChon.nguoiXuat,
    watermark: tuyChon.watermark,
    chanTrang: tuyChon.chanTrang ?? chanTrangMacDinh(ds),
  });
}

/** Xuất đề ra Word (.docx thật) và tải về */
export async function xuatDeThiWord(de: DeChuan | DeChuan[], tuyChon: TuyChonXuatDe): Promise<void> {
  taiTep(await taoDeThiWord(de, tuyChon), tenTepXuat(tuyChon.tenTep, 'docx'));
}

// ————— IN / PDF —————

const CSS_DE = `
.dau-de td { text-align: center; vertical-align: top; font-size: 12.5pt; padding: 0 4pt; }
.thi-sinh td { font-size: 13pt; padding: 2pt 4pt; vertical-align: bottom; }
.dau-de-hr { border: 0; border-top: 1px solid #555; margin: 4pt 0 8pt; }
.phan-de { font-weight: bold; margin: 8pt 0 2pt; }
.cau { margin: 3pt 0 2pt; }
.cau p { margin: 0 0 2pt; }
table.pa { margin: 0 0 4pt; table-layout: fixed; }
table.pa td { font-size: 13pt; padding: 1pt 8pt 1pt 0; }
table.pa td p { margin: 0; }
.het { text-align: center; font-weight: bold; margin: 12pt 0 4pt; }
.dong-cham { color: #444; letter-spacing: 1px; overflow: hidden; white-space: nowrap; }
`;

function htmlMotDe(de: DeChuan, kemDapAn?: boolean): string {
  const t = thoatHtml;
  const dau = `<table class="khong-vien dau-de"><tr><td style="width:40%">${de.donViCapTren ? `${t(de.donViCapTren.toUpperCase())}<br>` : ''}<b>${t(de.donVi.toUpperCase())}</b><br><br><b>${t(
    (de.loaiBan ?? 'ĐỀ CHÍNH THỨC').toUpperCase(),
  )}</b>${de.ghiChuDauDe ? `<br><i>${t(de.ghiChuDauDe)}</i>` : ''}</td><td><b>${t(de.tieuDe.toUpperCase())}</b>${de.kyThi ? `<br><b>${t(de.kyThi)}</b>` : ''}<br><b>Môn: ${t(de.mon)}${
    de.khoi ? ` – ${t(de.khoi)}` : ''
  }</b><br><i>Thời gian làm bài: ${de.thoiGian} phút, không kể thời gian phát đề</i></td></tr></table>
<table class="khong-vien thi-sinh"><tr><td style="width:68%"><b>Họ, tên thí sinh:</b> ${'.'.repeat(52)}<br><b>Số báo danh:</b> ${'.'.repeat(58)}</td><td class="phai">${
    de.maDe ? `<b style="font-size:14pt;border:1px solid #333;padding:2pt 8pt">Mã đề thi: ${t(de.maDe)}</b>` : ''
  }</td></tr></table><hr class="dau-de-hr">`;
  const phan = de.phan
    .map(
      (p) =>
        `${p.ten ? `<p class="phan-de">${t(p.ten)}</p>` : ''}${p.moTa ? `<p class="nghieng">${t(p.moTa)}</p>` : ''}${p.cau
          .map((c) => {
            const ds = c.phuongAn ?? [];
            const soCot = soCotPhuongAn(c);
            const pa = ds.length
              ? `<table class="khong-vien pa">${hangPhuongAn(ds, soCot)
                  .map(
                    (h) =>
                      `<tr>${h.map((x) => `<td style="width:${100 / soCot}%">${x ? chenTienToHtml(sangHtml(x.html), `<b>${t(nhanPa(x, c.laYDungSai))}</b> `) : ''}</td>`).join('')}</tr>`,
                  )
                  .join('')}</table>`
              : '';
            const dong = c.soDongTraLoi ? Array.from({ length: c.soDongTraLoi }, () => `<div class="dong-cham">${'.'.repeat(160)}</div>`).join('') : '';
            return `<div class="cau">${chenTienToHtml(c.noiDungHtml, dauCau(c, p.hienDiem))}${pa}${dong}</div>`;
          })
          .join('')}`,
    )
    .join('');
  const ghiChu = de.ghiChuCuoiDe ?? GHI_CHU_CUOI_MAC_DINH;
  const cuoi = `<p class="het">------------------ HẾT ------------------</p>${ghiChu ? `<p class="nghieng mo">- ${t(ghiChu)}</p>` : ''}`;
  let dapAn = '';
  if (kemDapAn) {
    const ds = de.dapAn ?? [];
    const coHuongDan = ds.some((d) => d.huongDanHtml);
    dapAn = `<div class="ngat-trang"></div><h1>ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM</h1><p class="giua nghieng">Môn: ${t(de.mon)}${de.khoi ? ` – ${t(de.khoi)}` : ''}${de.maDe ? ` · Mã đề: ${t(de.maDe)}` : ''}</p>${
      ds.length
        ? `<table><colgroup><col style="width:10%"><col><col style="width:12%"></colgroup><thead><tr><th>Câu</th><th>${coHuongDan ? 'Đáp án / Hướng dẫn chấm' : 'Đáp án'}</th><th>Điểm</th></tr></thead><tbody>${ds
            .map((d) => `<tr><td class="giua">${t(d.cau)}</td><td><b>${t(d.dapAn)}</b>${d.huongDanHtml ?? ''}</td><td class="giua">${d.diem != null ? soVn(d.diem) : ''}</td></tr>`)
            .join('')}</tbody></table>${ds.some((d) => d.diem != null) ? `<p class="phai dam">Tổng điểm: ${soVn(ds.reduce((s, d) => s + (d.diem ?? 0), 0))}</p>` : ''}`
        : '<p class="nghieng">Đề chưa có đáp án.</p>'
    }`;
  }
  return dau + phan + cuoi + dapAn;
}

/** In / "Xuất PDF" đề (hộp in → Lưu dưới dạng PDF) — cùng bố cục bản Word */
export async function inDeThi(de: DeChuan | DeChuan[], tuyChon: TuyChonXuatDe): Promise<void> {
  const ds = dsDe(de);
  const html = ds.map((d, i) => `${i ? '<div class="ngat-trang"></div>' : ''}${htmlMotDe(d, tuyChon.kemDapAn)}`).join('');
  await inTaiLieu(html, { tieuDe: tuyChon.tenTep, watermark: tuyChon.watermark, chanTrang: tuyChon.chanTrang ?? chanTrangMacDinh(ds), css: CSS_DE });
}

// ————— BẢNG ĐÁP ÁN CÁC MÃ ĐỀ —————

function luoiDapAn(bang: BangDapAnMaDe): { soCau: (number | string)[]; o: string[][] } {
  const soCau: (number | string)[] = [];
  const daCo = new Set<string>();
  for (const m of bang.cacMaDe)
    for (const d of m.dapAn)
      if (!daCo.has(String(d.cau))) {
        daCo.add(String(d.cau));
        soCau.push(d.cau);
      }
  const o = soCau.map((c) => bang.cacMaDe.map((m) => m.dapAn.find((d) => String(d.cau) === String(c))?.dapAn ?? ''));
  return { soCau, o };
}

/** Tạo Blob .xlsx bảng đáp án: trang 1 lưới (hàng = câu, cột = mã đề), trang 2 chi tiết từng mã đề (câu, đáp án, điểm) */
export async function taoDapAnExcel(bang: BangDapAnMaDe, tuyChon: { nguoiTao?: string } = {}): Promise<Blob> {
  const { soCau, o } = luoiDapAn(bang);
  const luoi: TrangTinh = {
    ten: 'Đáp án các mã đề',
    tieuDe: bang.tieuDe.toUpperCase(),
    moTa: bang.moTa,
    cot: [{ tieuDe: 'Câu', rong: 8, kieu: 'chu' }, ...bang.cacMaDe.map((m) => ({ tieuDe: `Mã đề ${m.ma}`, rong: Math.max(12, Math.min(40, ...m.dapAn.map((d) => d.dapAn.length + 2))), kieu: 'chu' as const }))],
    dong: soCau.map((c, i) => [String(c), ...o[i]]),
  };
  const chiTiet: TrangTinh = {
    ten: 'Chi tiết',
    tieuDe: 'ĐÁP ÁN CHI TIẾT THEO MÃ ĐỀ',
    moTa: bang.moTa,
    cot: [
      { tieuDe: 'Mã đề', rong: 10, kieu: 'chu' },
      { tieuDe: 'Câu', rong: 8, kieu: 'chu' },
      { tieuDe: 'Loại câu', rong: 24 },
      { tieuDe: 'Đáp án', rong: 40 },
      { tieuDe: 'Điểm', rong: 8, kieu: 'so' },
    ],
    dong: bang.cacMaDe.flatMap((m) => m.dapAn.map((d) => [m.ma, String(d.cau), d.loaiCau ?? '', d.dapAn, d.diem ?? null])),
  };
  return taoExcel([luoi, chiTiet], tuyChon);
}

/** Xuất bảng đáp án các mã đề ra Excel (.xlsx) */
export async function xuatDapAnExcel(tenTep: string, bang: BangDapAnMaDe, tuyChon: { nguoiTao?: string } = {}): Promise<void> {
  taiTep(await taoDapAnExcel(bang, tuyChon), tenTepXuat(tenTep, 'xlsx'));
}

/** Xuất bảng đáp án các mã đề ra Word (lưới câu × mã đề) — kèm watermark người xuất */
export async function xuatDapAnWord(tenTep: string, bang: BangDapAnMaDe, tuyChon: { watermark?: string; nguoiXuat?: string } = {}): Promise<void> {
  const { soCau, o } = luoiDapAn(bang);
  const khoi: KhoiWord[] = [
    { loai: 'tieu-de', noiDung: bang.tieuDe.toUpperCase(), cap: 1 },
    ...(bang.moTa ?? []).map((m) => ({ loai: 'doan' as const, noiDung: m, canh: 'giua' as const, nghieng: true })),
    {
      loai: 'bang',
      cot: [{ tieuDe: 'Câu', rong: 1, canh: 'giua' }, ...bang.cacMaDe.map((m) => ({ tieuDe: `Mã ${m.ma}`, rong: 1.4, canh: 'giua' as const }))],
      dong: soCau.map((c, i) => [String(c), ...o[i]]),
    },
  ];
  const blob = await taoWord(khoi, { tieuDe: bang.tieuDe, huong: bang.cacMaDe.length > 7 ? 'ngang' : 'doc', watermark: tuyChon.watermark, nguoiTao: tuyChon.nguoiXuat });
  taiTep(blob, tenTepXuat(tenTep, 'docx'));
}
