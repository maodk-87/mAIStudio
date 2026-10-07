/**
 * Xuất MỘT bảng dữ liệu ra nhiều định dạng bằng một lời gọi — dùng cho mọi nút "Xuất danh sách / Xuất báo cáo":
 * xlsx (Excel thật) · csv · docx (Word, kèm quốc hiệu/chữ ký nếu cần) · pdf/in (hộp in của trình duyệt).
 */
import { xuatCsv } from './csv';
import { xuatExcel, type CotExcel, type OExcel } from './excel';
import { bangHtmlIn, chuKyHtml, inTaiLieu, quocHieuHtml, thoatHtml } from './inAn';
import { xuatWord, type Canh, type KhoiWord } from './word';

export type DinhDangBang = 'xlsx' | 'csv' | 'docx' | 'pdf' | 'in';

export interface CotBangXuat extends CotExcel {
  canh?: Canh;
}

export interface BangXuat {
  /** Tên tệp (không cần đuôi) */
  tenTep: string;
  /** Tiêu đề bảng (in hoa ở Word/PDF) */
  tieuDe: string;
  /** Dòng mô tả: đơn vị, năm học, bộ lọc đang áp dụng… */
  moTa?: string[];
  cot: CotBangXuat[];
  dong: OExcel[][];
  tong?: OExcel[];
  /** Tên trang tính Excel (mặc định = tiêu đề) */
  tenTrang?: string;
  huong?: 'doc' | 'ngang';
  /** Watermark (Word/PDF) — dữ liệu nhạy cảm */
  watermark?: string;
  /** Quốc hiệu đầu văn bản (Word/PDF) */
  quocHieu?: { donViCapTren?: string; donVi: string; so?: string; diaDanhNgay?: string };
  /** Chữ ký cuối văn bản (Word/PDF) */
  chuKy?: { chucDanh: string; hoTen?: string; ghiChu?: string }[];
  /** Ghi chú cuối bảng (Word/PDF) */
  ghiChu?: string;
  nguoiTao?: string;
}

const hienThi = (v: OExcel): string =>
  v == null ? '' : v instanceof Date ? v.toLocaleDateString('vi-VN') : typeof v === 'boolean' ? (v ? 'Có' : 'Không') : typeof v === 'number' ? v.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : String(v);

const hienThiO = (v: OExcel, c?: CotBangXuat) => (c?.kieu === 'phan-tram' && typeof v === 'number' ? `${(v * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%` : hienThi(v));

export async function xuatBang(b: BangXuat, dinhDang: DinhDangBang): Promise<void> {
  const canhCot = (c: CotBangXuat): Canh | undefined => c.canh ?? (c.kieu && c.kieu !== 'chu' ? 'phai' : undefined);
  if (dinhDang === 'xlsx') {
    await xuatExcel(b.tenTep, { ten: b.tenTrang ?? b.tieuDe, tieuDe: b.tieuDe.toUpperCase(), moTa: b.moTa, cot: b.cot, dong: b.dong, tong: b.tong, huong: b.huong }, { nguoiTao: b.nguoiTao });
    return;
  }
  if (dinhDang === 'csv') {
    xuatCsv(b.tenTep, b.cot.map((c) => c.tieuDe), [...b.dong, ...(b.tong ? [b.tong] : [])].map((d) => d.map((v, i) => hienThiO(v, b.cot[i]))));
    return;
  }
  const dongChu = [...b.dong, ...(b.tong ? [b.tong] : [])].map((d) => b.cot.map((c, i) => hienThiO(d[i], c)));
  if (dinhDang === 'docx') {
    const khoi: KhoiWord[] = [
      ...(b.quocHieu ? [{ loai: 'quoc-hieu' as const, ...b.quocHieu }] : []),
      { loai: 'tieu-de', noiDung: b.tieuDe.toUpperCase(), cap: 1 },
      ...(b.moTa ?? []).map((m) => ({ loai: 'doan' as const, noiDung: m, canh: 'giua' as Canh, nghieng: true })),
      { loai: 'bang', cot: b.cot.map((c) => ({ tieuDe: c.tieuDe, rong: c.rong ?? Math.max(4, c.tieuDe.length), canh: canhCot(c) })), dong: dongChu },
      ...(b.ghiChu ? [{ loai: 'doan' as const, noiDung: b.ghiChu, nghieng: true }] : []),
      ...(b.chuKy ? [{ loai: 'chu-ky' as const, cot: b.chuKy }] : []),
    ];
    await xuatWord(b.tenTep, khoi, { tieuDe: b.tieuDe, huong: b.huong ?? (b.cot.length > 7 ? 'ngang' : 'doc'), watermark: b.watermark, nguoiTao: b.nguoiTao });
    return;
  }
  const html = `${b.quocHieu ? quocHieuHtml(b.quocHieu) : ''}<h1>${thoatHtml(b.tieuDe)}</h1>${(b.moTa ?? []).map((m) => `<p class="giua nghieng">${thoatHtml(m)}</p>`).join('')}${bangHtmlIn(
    b.cot.map((c) => {
      const canh = canhCot(c);
      return { tieuDe: c.tieuDe, rong: c.rong, canh: canh === 'deu' ? undefined : canh };
    }),
    dongChu,
  )}${b.ghiChu ? `<p class="nghieng">${thoatHtml(b.ghiChu)}</p>` : ''}${b.chuKy ? chuKyHtml(b.chuKy) : ''}`;
  await inTaiLieu(html, { tieuDe: b.tenTep, huong: b.huong ?? (b.cot.length > 7 ? 'ngang' : 'doc'), watermark: b.watermark });
}

export const nhanDinhDang: Record<DinhDangBang, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV (.csv)',
  docx: 'Word (.docx)',
  pdf: 'PDF (in → Lưu dưới dạng PDF)',
  in: 'In',
};
