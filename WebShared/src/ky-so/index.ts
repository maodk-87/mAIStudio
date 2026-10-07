/**
 * @web-shared/ky-so — chữ ký số CMS/PKCS#7 (nhóm X5, apis/02 §9): API chứng thư/xác minh/nhật ký/CA-CRL,
 * `NhanChuKySo`, `KetQuaXacMinhChuKy`, `ModalXacMinhTep`. Dùng ở ADMIN.Web (quản lý chứng thư), KTDG.Web (kỳ ĐGĐK),
 * QLTHI.Web (gói học bạ).
 */
export * from './api';
export { KetQuaXacMinhChuKy, ModalXacMinhTep, NhanChuKySo, type ModalXacMinhTepProps } from './ThanhPhanKySo';
