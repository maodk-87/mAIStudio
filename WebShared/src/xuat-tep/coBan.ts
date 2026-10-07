/**
 * Lõi XUẤT – IN – TẢI TỆP KHÔNG phụ thuộc KaTeX — dùng trực tiếp cho web không cài katex (CoreAdmin.Web):
 *   import { xuatExcel, xuatBang } from '@web-shared/xuat-tep/coBan';
 * Công thức trong Word/bản in hiện dạng chữ LaTeX. Web có katex dùng '@web-shared/xuat-tep' (index).
 */
export { taiTep, taiVanBan, tenTepXuat, chuanHoaTenTep, dauThoiGianTep, thoiDiemHienThi } from './taiTep';
export { xuatCsv, taoNoiDungCsv, docCsv } from './csv';
export type { OCsv } from './csv';
export { taoExcel, xuatExcel, xuatMauNhap, xuatFileLoiNhap, tenCotExcel } from './excel';
export type { CotExcel, OExcel, TrangTinh, CotMauNhap } from './excel';
export { docExcel, docExcelTheoTieuDe } from './docExcel';
export type { BangDoc } from './docExcel';
export { taoWord, xuatWord, taoThanWord } from './word';
export type { KhoiWord, TuyChonWord, DoanChu, OWord, Canh } from './word';
export { inTaiLieu, veCongThuc, bangHtmlIn, quocHieuHtml, chuKyHtml, diaDanhNgay, thoatHtml } from './inAn';
export type { TuyChonIn, CotIn } from './inAn';
export { xuatBang, nhanDinhDang } from './xuatBang';
export type { BangXuat, CotBangXuat, DinhDangBang } from './xuatBang';
export { default as NutXuatTep } from './NutXuatTep';
export type { NutXuatTepProps } from './NutXuatTep';
export { ghiNhatKyXuat, layNhatKyXuat, chuoiWatermark, taoMaTheoDoi } from './nhatKyXuat';
export type { BanGhiXuat, DinhDangXuat, LoaiThaoTacTep } from './nhatKyXuat';
export { boCongThuc } from './boCongThuc';
export * from './deThi';
