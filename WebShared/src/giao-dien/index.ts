/**
 * Giao diện dùng chung KHẢO THÍ SỐ: thương hiệu, bảng màu, theme antd, khung box/breadcrumb.
 * CSS nền (`giao-dien.scss`) nạp riêng ở index.tsx của từng web:
 *   import '@web-shared/giao-dien/giao-dien.scss';
 */
export { thuongHieu, bangMau } from './thuongHieu';
export { themeKhaoThiSo, moRongTheme } from './theme';
export { default as BoxNoiDung, GhiChuTrang } from './BoxNoiDung';
export type { BoxNoiDungProps } from './BoxNoiDung';
export { default as PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { default as LogoThuongHieu } from './LogoThuongHieu';
export { default as FormSelect } from './FormSelect';
export type { FormSelectProps, LuaChon } from './FormSelect';
export { default as NutDongTatCaThongBao } from './NutDongTatCaThongBao';
export { useDirtyGuard } from './useDirtyGuard';
export { chuanHoaKhongDau, khopTimKiem } from './timKiem';
export { default as CopyText } from './CopyText';
export type { CopyTextProps } from './CopyText';
export { useXacNhan } from './useXacNhan';
export type { ThamSoXacNhan } from './useXacNhan';
export { default as BangChuan } from './BangChuan';
export type { BangChuanProps, BoLocBang, CotBang, HanhDongHang } from './BangChuan';
export { default as DanhSachDon } from './DanhSachDon';
export type { DanhSachDonProps, MucDanhSachProps, MucMetaProps } from './DanhSachDon';
