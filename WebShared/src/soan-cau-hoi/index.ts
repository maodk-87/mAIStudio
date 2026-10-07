/**
 * SOẠN CÂU HỎI — dùng chung KTĐG / NHCH / DVCC (phương án docs/task/phuong-an-soan-cau-hoi-web-shared.md).
 * - Hằng dùng chung: `hang` (LoaiCauHoi, CapDoTuDuy, CheDoDaoCauHoi, TrangThaiNoiDung) — enum.ts của web re-export.
 * - Kiểu + hợp đồng web cung cấp: `types`, `nguon` (NguonSoanCauHoi, CauHinhSoanCauHoi, TruongMoRong).
 * - Component: SoanCauHoi (màn soạn), XemTruocCauHoi (xem như học sinh), TomTatCauHoi; nhãn: `nhan`.
 * Package không gọi API — web truyền `nguon`/`cauHinh` qua wrapper `components/nghiep-vu/nhch/SoanCauHoiChuan`.
 */
export * from './hang';
export * from './types';
export * from './nguon';
export * from './nhan';
export { default as SoanCauHoi } from './SoanCauHoi';
export type { SoanCauHoiProps } from './SoanCauHoi';
export { default as XemTruocCauHoi, themeTheoKhoi } from './XemTruocCauHoi';
export type { CauHoiXemTruoc, CauConXemTruoc, PhuongAnXemTruoc, ThemeXemTruoc } from './XemTruocCauHoi';
export { default as TomTatCauHoi } from './TomTatCauHoi';
export { default as SoSanhPhienBan } from './SoSanhPhienBan';
export { default as DuyetNoiDung } from './DuyetNoiDung';
export type { DuyetNoiDungProps } from './DuyetNoiDung';
export { default as ChiTietCauHoi, ModalChiTietCauHoi } from './ChiTietCauHoi';
export type { ChiTietCauHoiProps, HanhDongCauChiTiet, ModalChiTietCauHoiProps, NguCanhWebChiTiet } from './ChiTietCauHoi';
export { default as ImportWordCauHoi } from './ImportWordCauHoi';
export type { ImportWordCauHoiProps } from './ImportWordCauHoi';
export { default as HuongDanMauImport } from './HuongDanMauImport';
export type { BangTraCuuTnThpt, HuongDanMauImportProps } from './HuongDanMauImport';
export { luaChonMauImport, useMauImport } from './useMauImport';
