/**
 * Trích dữ liệu công thức MathType (MTEF) nhúng trong ảnh WMF.
 *
 * MathType luôn nhúng MTEF gốc vào ảnh WMF kết quả của mỗi công thức OLE
 * (comment "AppsMFCC" + chữ ký "Design Science, Inc."). Ảnh WMF này có mặt ở
 * clipboard RTF khi copy từ Word, trong thư mục media của .docx/.pptx — nên
 * giải mã được nó là chuyển được công thức MathType thành LaTeX trên trình duyệt.
 * Dùng chung cho: pipeline dán Word của editor và trình xem tài liệu.
 */
import { mtefSangLatex } from './mtefSangLatex';

const CHU_KY_APPSMFCC = 'AppsMFCC';
const CHU_KY_DS = 'Design Science, Inc.';

const timBytes = (b: Uint8Array, chuoi: string, tu = 0): number => {
  const mau: number[] = [];
  for (let i = 0; i < chuoi.length; i++) mau.push(chuoi.charCodeAt(i));
  for (let i = tu; i <= b.length - mau.length; i++) {
    let khop = true;
    for (let j = 0; j < mau.length; j++) {
      if (b[i + j] !== mau[j]) { khop = false; break; }
    }
    if (khop) return i;
  }
  return -1;
};

const u32 = (b: Uint8Array, i: number): number =>
  (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

const u16le = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8);

/** Có phải WMF (có hoặc không có header placeable) */
export const laWmf = (b: Uint8Array): boolean =>
  b.length > 22 &&
  (u32(b, 0) === 0x9ac6cdd7 || ((b[0] === 1 || b[0] === 2) && b[1] === 0 && b[2] === 9 && b[3] === 0));

/**
 * Trích MTEF nhúng trong WMF: duyệt đúng cấu trúc record của metafile,
 * gom payload các record ESCAPE/MFCOMMENT mang chữ ký AppsMFCC (có thể
 * nhiều chunk), rồi lấy `tong` byte MTEF ngay sau chữ ký
 * "Design Science, Inc.\0" (trường tổng KHÔNG tính chữ ký này).
 * Trả về null nếu WMF không chứa MTEF (ảnh thường).
 */
export function trichMtefTuWmf(wmf: Uint8Array): Uint8Array | null {
  if (wmf.length < 40) return null;
  // header placeable (Aldus) 22 byte nếu có
  let off = u32(wmf, 0) === 0x9ac6cdd7 ? 22 : 0;
  off += 18; // WMF header chuẩn

  const cacPhan: Uint8Array[] = [];
  let tongMtef = -1;
  let dangGom = false;
  let daGom = 0;

  while (off + 6 <= wmf.length) {
    const kichThuocWord = u32(wmf, off);
    if (kichThuocWord < 3) break;
    const ham = u16le(wmf, off + 4);
    const cuoiRecord = Math.min(off + kichThuocWord * 2, wmf.length);
    if (ham === 0x0626 && off + 10 <= wmf.length) {
      // META_ESCAPE; escape 15 = MFCOMMENT
      const maEscape = u16le(wmf, off + 6);
      const soByte = u16le(wmf, off + 8);
      if (maEscape === 15) {
        const dau = off + 10;
        const cuoi = Math.min(dau + soByte, wmf.length);
        const coChuKy = timBytes(wmf.slice(dau, Math.min(dau + 8, cuoi)), CHU_KY_APPSMFCC) === 0;
        if (coChuKy && cuoi - dau >= 18) {
          // "AppsMFCC"(8) + version(2) + tổng(4) + kích thước chunk(4) + dữ liệu
          if (tongMtef < 0) tongMtef = u32(wmf, dau + 10);
          cacPhan.push(wmf.slice(dau + 18, cuoi));
          daGom += cuoi - (dau + 18);
          dangGom = true;
        } else if (dangGom && daGom < tongMtef + CHU_KY_DS.length + 1) {
          // chunk tiếp theo không lặp lại chữ ký — nối tiếp dữ liệu thô
          cacPhan.push(wmf.slice(dau, cuoi));
          daGom += cuoi - dau;
        }
      }
    }
    off = cuoiRecord;
  }
  return ghepMtef(cacPhan, daGom, tongMtef);
}

/** Ghép các chunk AppsMFCC → MTEF = `tongMtef` byte ngay sau "Design Science, Inc.\0" */
function ghepMtef(cacPhan: Uint8Array[], daGom: number, tongMtef: number): Uint8Array | null {
  if (!cacPhan.length || tongMtef <= 0) return null;
  const gop = new Uint8Array(daGom);
  let vi = 0;
  for (const p of cacPhan) { gop.set(p, vi); vi += p.length; }
  const iDs = timBytes(gop, CHU_KY_DS);
  if (iDs < 0) return null;
  const batDau = iDs + CHU_KY_DS.length + 1;
  return gop.slice(batDau, Math.min(batDau + tongMtef, gop.length));
}

/** Có phải EMF (record đầu EMR_HEADER + chữ ký " EMF" tại byte 40) */
export const laEmf = (b: Uint8Array): boolean =>
  b.length > 88 && u32(b, 0) === 1 && u32(b, 40) === 0x464d4520;

/**
 * Trích MTEF nhúng trong EMF — MathType 7 / Office 365 có thể xuất ảnh kết quả dạng EMF;
 * MTEF nằm trong các record EMR_GDICOMMENT (70) mang chữ ký AppsMFCC, cùng bố cục như WMF.
 */
export function trichMtefTuEmf(emf: Uint8Array): Uint8Array | null {
  if (!laEmf(emf)) return null;
  const cacPhan: Uint8Array[] = [];
  let tongMtef = -1;
  let daGom = 0;
  let off = 0;
  while (off + 8 <= emf.length) {
    const loai = u32(emf, off);
    const kichThuoc = u32(emf, off + 4);
    if (kichThuoc < 8 || off + kichThuoc > emf.length) break;
    if (loai === 70 && kichThuoc >= 12) {
      const dau = off + 12;
      const cuoi = Math.min(dau + u32(emf, off + 8), off + kichThuoc);
      if (cuoi - dau >= 18 && timBytes(emf.slice(dau, dau + 8), CHU_KY_APPSMFCC) === 0) {
        if (tongMtef < 0) tongMtef = u32(emf, dau + 10);
        cacPhan.push(emf.slice(dau + 18, cuoi));
        daGom += cuoi - (dau + 18);
      }
    }
    if (loai === 14) break; // EMR_EOF
    off += kichThuoc;
  }
  return ghepMtef(cacPhan, daGom, tongMtef);
}

/** WMF của công thức MathType → LaTeX (null nếu không phải/không giải mã được) */
export function wmfSangLatex(wmf: Uint8Array): string | null {
  const mtef = trichMtefTuWmf(wmf);
  return mtef ? mtefSangLatex(mtef) : null;
}

/** Ảnh kết quả (WMF hoặc EMF) của công thức MathType → LaTeX */
export function anhKetQuaSangLatex(b: Uint8Array): string | null {
  const mtef = laEmf(b) ? trichMtefTuEmf(b) : trichMtefTuWmf(b);
  return mtef ? mtefSangLatex(mtef) : null;
}
