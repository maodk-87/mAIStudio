/**
 * @web-shared/hoan-vi — engine HOÁN VỊ ĐỀ dùng chung cho mọi web (docs/nghiep-vu-hoan-vi-de.md).
 * Soi gương `KTDG.CauHoi.HoanVi` + `KTDG.CauHoi.DanhSoViTri` của BE: cùng thuật toán, cùng bộ sinh ngẫu nhiên xác định
 * → cùng đề + cùng hạt giống cho cùng mã đề. Thuần TypeScript, không phụ thuộc React/DOM.
 *
 *   sinhBoMaDe(de, soMaDe, hatGiong)   sinh bộ mã đề có kiểm tra (đáp án liên tiếp, không trùng, số hoán vị khả dĩ)
 *   sinhMaDe(de, hatGiong)             một hoán vị thô theo hạt giống
 *   bangDapAn / doiChieu               bảng đáp án mã đề, đối chiếu mã đề → đề gốc
 *   danhSoDe / danhSoCau / danhSoViTri thay ký hiệu N**, N***, N**+k, (N**) bằng số câu thật khi HIỂN THỊ/XUẤT
 *   phanBo / xepXenKe                  nhóm đề: chia số mã đề cho các đề gốc, xếp xen kẽ
 */
export { BoSinhNgauNhien, daoGiuCoDinh } from './boSinhNgauNhien';
export {
  coKyHieuGanCauCon,
  coKyHieuViTri,
  danhSoCau,
  danhSoDe,
  danhSoViTri,
  soCauTinh,
  taoBoDanhSo,
  viTriCau,
  type ViTriNhom,
} from './danhSoViTri';
export {
  bangDapAn,
  chuKy,
  dapAnCua,
  datDapAnLienTiep,
  doiChieu,
  laPhuongAnGhim,
  nguyenTacHoanVi,
  phanBo,
  sinhBoMaDe,
  sinhMaDe,
  sinhMaDeDatChuan,
  soHoanViKhaDi,
  TRAN_HOAN_VI_KHA_DI,
  xepXenKe,
} from './hoanVi';
export * from './kieu';
