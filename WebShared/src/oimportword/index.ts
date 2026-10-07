/**
 * PLUGIN oImportWord — bóc tách câu hỏi từ Word, dùng chung cho:
 *   - IMPORT tệp .docx  → docTepWord(tep) / bocTachTaiLieu(html)
 *   - DÁN vào OEditor   → bocTachCauHoi(html, { loaiCau })
 * Hai đường vào dùng CÙNG sổ đăng ký định dạng (dangKyDinhDang) nên một câu hỏi được
 * hiểu như nhau dù dán hay import. Các định dạng mặc định đăng ký sẵn khi nạp mô-đun.
 */
import { docxSangHtml } from '../word-html/docxSangHtml';
import { bocTachCauHoi, bocTachTaiLieu, docTienToTnThpt, maLoaiTheoPhan, tachKhoi } from './bocTach';
import { dangKyDinhDang, danhSachDinhDang, huyDangKyDinhDang, layDinhDang } from './dangKy';
import { DINH_DANG_MAC_DINH } from './dinh-dang';
import type { KetQuaTaiLieu, MaMauImport } from './kieu';
import { dangKyMaLoaiCau, danhSachMaLoaiCau, loaiCauTuMa, taoMaCauHoi } from './maLoaiCau';
import { danhSoViTri } from './viTriCau';

DINH_DANG_MAC_DINH.forEach((dd) => dangKyDinhDang(dd));

export interface KetQuaDocTepWord extends KetQuaTaiLieu {
  /** Số công thức MathType/OMML đã chuyển thành công thức sống */
  soCongThuc: number;
}

/** IMPORT: đọc tệp .docx và bóc tách toàn bộ câu hỏi (chạy hoàn toàn trên trình duyệt) */
export async function docTepWord(
  tep: Blob,
  tuyChon: {
    onTienTrinh?: (phanTram: number) => void;
    /** Mẫu tệp người dùng chọn — chia khối + soát câu theo mẫu (mauImport.ts) */
    mau?: MaMauImport;
  } = {},
): Promise<KetQuaDocTepWord> {
  const { html, soCongThuc, soKhongDocDuoc } = await docxSangHtml(tep, tuyChon.onTienTrinh);
  const ketQua = bocTachTaiLieu(html, tuyChon.mau);
  tuyChon.onTienTrinh?.(100);
  if (soKhongDocDuoc) {
    ketQua.ghiChu.push(`${soKhongDocDuoc} đối tượng nhúng không đọc được — đã đánh dấu trong nội dung câu`);
  }
  return { ...ketQua, soCongThuc };
}

/** Quy ước trình bày của các định dạng đã đăng ký — dùng cho hướng dẫn/tooltip "file mẫu" */
export const moTaQuyUoc = (): { ten: string; quyUoc: string; viDu?: string }[] =>
  danhSachDinhDang().map(({ ten, quyUoc, viDu }) => ({ ten, quyUoc, viDu }));

/** Gom toàn bộ API dưới một tên cho dễ nhận diện ở nơi dùng */
export const oImportWord = {
  docTepWord,
  bocTachTaiLieu,
  bocTachCauHoi,
  tachKhoi,
  dangKyDinhDang,
  huyDangKyDinhDang,
  layDinhDang,
  danhSachDinhDang,
  moTaQuyUoc,
  dangKyMaLoaiCau,
  danhSachMaLoaiCau,
  loaiCauTuMa,
  taoMaCauHoi,
  danhSoViTri,
};

export { bocTachCauHoi, bocTachTaiLieu, docTienToTnThpt, maLoaiTheoPhan, tachKhoi };
/** 3 mẫu import Word cố định (Khảo thí số · TN THPT · Mặc định) — mô tả dùng cho hướng dẫn + soát */
export { MAU_IMPORT, MAU_IMPORT_MAC_DINH, layMauImport } from './mauImport';
export type { LoaiCauMauImport, MoTaMauImport, VanDeMauImport } from './mauImport';
export { dangKyDinhDang, danhSachDinhDang, huyDangKyDinhDang, layDinhDang };
export { dangKyMaLoaiCau, danhSachMaLoaiCau, loaiCauTuMa, taoMaCauHoi };
export { coKyHieuViTri, danhSoViTri } from './viTriCau';
/** Tệp mẫu .docx đúng quy ước docs/13 (nút "Tải file mẫu" ở màn nhập câu hỏi từ Word) */
export { taoKhoiTepMau, taoTepMauImportWord, xuatTepMauImportWord } from './tepMau';
export * from './kieu';
export * as tienIchBocTach from './tienIch';
export {
  DINH_DANG_MAC_DINH,
  dinhDangCauChum,
  dinhDangDienKhuyet,
  dinhDangDungSaiDon,
  dinhDangDungSai4Y,
  dinhDangTraLoiNgan,
  dinhDangTracNghiemAbcd,
  dinhDangTuLuan,
} from './dinh-dang';
