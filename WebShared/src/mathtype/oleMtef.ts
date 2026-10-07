/**
 * Trích MTEF từ ĐỐI TƯỢNG OLE của công thức (nguồn gốc, đáng tin nhất):
 * - RTF clipboard: nhóm {\*\objdata <hex>} = OLE1 ObjectHeader + tệp Compound File (CFB);
 * - .docx: word/embeddings/oleObject*.bin = tệp CFB.
 * Trong CFB, luồng "Equation Native" = header EQNOLEFILEHDR (cbHdr byte, thường 28) + MTEF.
 * Dùng khi ảnh kết quả (WMF/EMF) không mang MTEF — VD Microsoft Equation 3.0, ảnh EMF,
 * WMF bị cắt. Mọi lỗi cấu trúc → null (nơi gọi rơi về ô công thức trống).
 */
import { mtefSangLatex } from './mtefSangLatex';

const CHU_KY_CFB = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const HET_CHUOI = 0xfffffffa; // mọi giá trị >= đây là ENDOFCHAIN/FREESECT/…
const TEN_LUONG = 'equation native';

const u16 = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8);
const u32 = (b: Uint8Array, i: number): number =>
  (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

/** Vị trí chữ ký CFB (0 với tệp .bin; sau OLE1 ObjectHeader với \objdata) */
const timCfb = (b: Uint8Array): number => {
  for (let i = 0; i + 8 <= b.length; i++) {
    let khop = true;
    for (let j = 0; j < 8; j++) {
      if (b[i + j] !== CHU_KY_CFB[j]) { khop = false; break; }
    }
    if (khop) return i;
  }
  return -1;
};

/** Đọc luồng "Equation Native" từ tệp CFB; null nếu không có/hỏng */
function docLuongEquationNative(cfb: Uint8Array): Uint8Array | null {
  if (cfb.length < 512) return null;
  const dichSector = u16(cfb, 0x1e);
  const dichMini = u16(cfb, 0x20);
  if (dichSector !== 9 && dichSector !== 12) return null;
  const coSector = 1 << dichSector;
  const coMini = 1 << dichMini;
  const soSectorFat = u32(cfb, 0x2c);
  const sectorThuMuc = u32(cfb, 0x30);
  const nguongMini = u32(cfb, 0x38) || 4096;
  const sectorMiniFat = u32(cfb, 0x3c);
  let sectorDifat = u32(cfb, 0x44);
  let soSectorDifat = u32(cfb, 0x48);
  const tongSector = Math.floor((cfb.length - coSector) / coSector) + 1;
  const viTriSector = (n: number) => (n + 1) * coSector;

  // ---- FAT: danh sách sector FAT lấy từ DIFAT (109 mục ở header + chuỗi sector DIFAT) ----
  const dsSectorFat: number[] = [];
  for (let i = 0; i < 109 && dsSectorFat.length < soSectorFat; i++) {
    const s = u32(cfb, 0x4c + i * 4);
    if (s < HET_CHUOI) dsSectorFat.push(s);
  }
  while (soSectorDifat-- > 0 && sectorDifat < HET_CHUOI && dsSectorFat.length < soSectorFat) {
    const goc = viTriSector(sectorDifat);
    if (goc + coSector > cfb.length) break;
    for (let i = 0; i < coSector / 4 - 1 && dsSectorFat.length < soSectorFat; i++) {
      const s = u32(cfb, goc + i * 4);
      if (s < HET_CHUOI) dsSectorFat.push(s);
    }
    sectorDifat = u32(cfb, goc + coSector - 4);
  }
  const fat: number[] = [];
  for (const s of dsSectorFat) {
    const goc = viTriSector(s);
    if (goc + coSector > cfb.length) return null;
    for (let i = 0; i < coSector / 4; i++) fat.push(u32(cfb, goc + i * 4));
  }

  /** Nối chuỗi sector theo bảng cấp phát (có chặn vòng lặp) */
  const docChuoi = (dau: number, bang: number[], gioiHan: number): number[] => {
    const ds: number[] = [];
    const daQua = new Set<number>();
    for (let s = dau; s < HET_CHUOI && s < bang.length && !daQua.has(s); s = bang[s]) {
      daQua.add(s);
      ds.push(s);
      if (ds.length > gioiHan) break;
    }
    return ds;
  };
  const docLuongLon = (dau: number, kichThuoc: number): Uint8Array | null => {
    const ra = new Uint8Array(kichThuoc);
    let vi = 0;
    for (const s of docChuoi(dau, fat, tongSector)) {
      const goc = viTriSector(s);
      const lay = Math.min(coSector, kichThuoc - vi, cfb.length - goc);
      if (lay <= 0) break;
      ra.set(cfb.subarray(goc, goc + lay), vi);
      vi += lay;
      if (vi >= kichThuoc) break;
    }
    return vi >= kichThuoc ? ra : null;
  };

  // ---- thư mục: tìm root (mini stream) và luồng "Equation Native" ----
  let root: { dau: number; kichThuoc: number } | null = null;
  let luong: { dau: number; kichThuoc: number } | null = null;
  for (const s of docChuoi(sectorThuMuc, fat, tongSector)) {
    const goc = viTriSector(s);
    for (let e = 0; e + 128 <= coSector && goc + e + 128 <= cfb.length; e += 128) {
      const muc = goc + e;
      const loai = cfb[muc + 0x42];
      let ten = '';
      // tên UTF-16LE tối đa 32 ký tự (64 byte), kết thúc bằng 0
      for (let i = 0; i < 64; i += 2) {
        const c = u16(cfb, muc + i);
        if (!c) break;
        ten += String.fromCharCode(c);
      }
      const dau = u32(cfb, muc + 0x74);
      const kichThuoc = u32(cfb, muc + 0x78);
      if (loai === 5) root = { dau, kichThuoc };
      else if (loai === 2 && ten.toLowerCase() === TEN_LUONG) luong = { dau, kichThuoc };
    }
  }
  if (!luong || luong.kichThuoc < 28 || luong.kichThuoc > cfb.length) return null;

  let du: Uint8Array | null;
  if (luong.kichThuoc >= nguongMini) {
    du = docLuongLon(luong.dau, luong.kichThuoc);
  } else {
    // luồng nhỏ nằm trong mini stream (chuỗi của root), cấp phát theo mini FAT
    if (!root) return null;
    const miniStream = docLuongLon(root.dau, root.kichThuoc);
    if (!miniStream) return null;
    const miniFat: number[] = [];
    for (const s of docChuoi(sectorMiniFat, fat, tongSector)) {
      const goc = viTriSector(s);
      for (let i = 0; i < coSector / 4 && goc + i * 4 + 4 <= cfb.length; i++) {
        miniFat.push(u32(cfb, goc + i * 4));
      }
    }
    du = new Uint8Array(luong.kichThuoc);
    let vi = 0;
    for (const s of docChuoi(luong.dau, miniFat, miniStream.length / coMini + 1)) {
      const goc = s * coMini;
      const lay = Math.min(coMini, luong.kichThuoc - vi, miniStream.length - goc);
      if (lay <= 0) break;
      du.set(miniStream.subarray(goc, goc + lay), vi);
      vi += lay;
      if (vi >= luong.kichThuoc) break;
    }
    if (vi < luong.kichThuoc) return null;
  }
  return du;
}

/**
 * Bytes đối tượng OLE (\objdata đã giải hex, hoặc oleObject*.bin) → MTEF; null nếu không có.
 */
export function trichMtefTuOle(bytes: Uint8Array): Uint8Array | null {
  try {
    const iCfb = timCfb(bytes);
    if (iCfb < 0) return null;
    const luong = docLuongEquationNative(bytes.subarray(iCfb));
    if (!luong) return null;
    const cbHdr = u16(luong, 0);
    const cbObject = u32(luong, 8);
    if (cbHdr < 2 || cbHdr >= luong.length) return null;
    const cuoi = cbObject > 0 ? Math.min(cbHdr + cbObject, luong.length) : luong.length;
    return luong.slice(cbHdr, cuoi);
  } catch {
    return null;
  }
}

/** Đối tượng OLE của công thức → LaTeX (null nếu không đọc được) */
export function oleSangLatex(bytes: Uint8Array): string | null {
  const mtef = trichMtefTuOle(bytes);
  return mtef ? mtefSangLatex(mtef) : null;
}
