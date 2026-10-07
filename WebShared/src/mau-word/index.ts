/**
 * TỆP WORD MẪU của mẫu đề (YC-MD-01 mục 5, YC-MD-06): danh mục trường trộn {{MA}}, trộn dữ liệu đề vào tệp .docx/.dotx,
 * mẫu gợi ý, dữ liệu giả lập, bản PDF xem trước — và khung giao diện dùng ở màn Tạo/Sửa mẫu đề các hệ.
 * Hợp đồng trường trộn dùng chung với backend xuất đề: docs/apis/03 §2a.
 */
// Đăng ký bộ công thức KaTeX (Word → OMML, bản PDF → KaTeX) như mọi nơi xuất đề
import '../xuat-tep';

export {
  DANH_MUC_TRUONG_TRON,
  NHOM_TRUONG_TRON,
  NHAN_KIEU_TRUONG,
  MA_TRUONG_BAT_BUOC,
  timTruongTron,
  cuPhapTruong,
  type TruongTron,
  type KieuTruongTron,
} from './truongTron';
export { tronMauWord, phanTichMauWord, type DuLieuTron, type KetQuaTron, type KetQuaPhanTichMau } from './tronMauWord';
export { taoMauWordGoiY, TEN_TEP_MAU_GOI_Y } from './mauGoiY';
export {
  giaTriGiaLapMacDinh,
  taoDeGiaLap,
  taoDuLieuTronGiaLap,
  TUY_CHON_GIA_LAP_MAC_DINH,
  type CauHinhGiaLap,
  type PhanGiaLap,
  type TuyChonGiaLap,
} from './giaLap';
export { dungHtmlPdf, inHtmlPdf } from './banPdf';
export { default as KhungMauWord, BangTruongTron } from './KhungMauWord';
export type { KhungMauWordProps } from './KhungMauWord';
export { default as ModalGiaLapXuat } from './ModalGiaLapXuat';
export type { ModalGiaLapXuatProps } from './ModalGiaLapXuat';
