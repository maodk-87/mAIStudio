/**
 * API chữ ký số (apis/02 §9 — module KySo, nhóm X5): chứng thư, xác minh CMS/PKCS#7, nhật ký chữ ký, CA + CRL công khai.
 * Gọi qua client mặc định của web (`taoApiClient`).
 */
import type { AxiosRequestConfig } from 'axios';
import { layApiMacDinh, taoQuery, type PhanTrang } from '../api';
import { taiTep } from '../xuat-tep/taiTep';

const GOC = '/v1/nen-tang/ky-so';

export type LoaiChungThu = 'can-bo' | 'don-vi';
export type NhaCungCapKySo = 'noi-bo' | 'ca-tu-xa';
export type TrangThaiChungThu = 'hieu-luc' | 'het-han' | 'thu-hoi' | 'chua-hieu-luc';
export type LyDoThuHoi = 'khong-xac-dinh' | 'lo-khoa' | 'thay-doi-thong-tin' | 'thay-the' | 'ngung-hoat-dong';
/** Trạng thái xác minh (backend `TrangThaiXacMinhHd`) + `da-huy` (biên bản sửa sau khi ký) + `khong-tim-thay`. */
export type TrangThaiXacMinh =
  | 'hop-le'
  | 'du-lieu-bi-sua'
  | 'chu-ky-khong-hop-le'
  | 'chung-thu-bi-thu-hoi'
  | 'chung-thu-het-han'
  | 'chuoi-khong-tin-cay'
  | 'da-huy'
  | 'khong-tim-thay';

export interface ChungThuSo {
  id: string;
  loai: LoaiChungThu;
  nguoiDungId?: string;
  donViId?: string;
  tenChuThe: string;
  chuThe: string;
  nhaPhatHanh: string;
  soSerial: string;
  dauVanTay: string;
  nhaCungCap: NhaCungCapKySo;
  hieuLucTu: string;
  hieuLucDen: string;
  trangThai: TrangThaiChungThu;
  thuHoiLuc?: string;
  lyDoThuHoi?: LyDoThuHoi;
  ghiChuThuHoi?: string;
  phienBan: number;
}

export interface ChungThuChiTiet {
  chungThu: ChungThuSo;
  pem: string;
  chuoiChungThu: string[];
  soChuKy: number;
}

export interface CaHeThong {
  id: string;
  loai: 'goc' | 'trung-gian';
  chuThe: string;
  soSerial: string;
  dauVanTay: string;
  hieuLucTu: string;
  hieuLucDen: string;
  dangDung: boolean;
  pem: string;
}

export interface KetQuaXacMinh {
  hopLe: boolean;
  trangThai: TrangThaiXacMinh;
  lyDo?: string;
  mucDich?: string;
  soSerial?: string;
  chuTheChungThu?: string;
  hoTenNguoiKy?: string;
  thoiDiemKy?: string;
  coDauThoiGian: boolean;
  chuoiChungThu: string[];
}

export interface ChuKySo {
  id: string;
  mucDich: string;
  doiTuongLoai?: string;
  doiTuongId?: string;
  moTa?: string;
  bamSha256: string;
  kyLuc: string;
  thoiGianTsa?: string;
  nguoiKyId?: string;
  hoTenNguoiKy?: string;
  chungThuId: string;
  soSerial: string;
  chuThe: string;
  nhaCungCap: NhaCungCapKySo;
  trangThaiChungThu: TrangThaiChungThu | 'khong-ro';
}

export interface BoLocChungThu {
  trang?: number;
  soBanGhi?: number;
  tuKhoa?: string;
  loai?: LoaiChungThu;
  trangThai?: 'hieu-luc' | 'het-han' | 'thu-hoi';
  nguoiDungId?: string;
}

export interface ThamSoCapChungThu {
  loai: LoaiChungThu;
  nguoiDungId?: string;
  donViId?: string;
  soNgayHieuLuc?: number;
  thayThe?: boolean;
}

const im = { khongThongBao: true } as AxiosRequestConfig;

export const layDanhSachChungThu = async (boLoc: BoLocChungThu = {}) =>
  (await layApiMacDinh().get<PhanTrang<ChungThuSo>>(`${GOC}/chung-thu`, { params: taoQuery({ ...boLoc }) })).data;

export const layChungThu = async (id: string) => (await layApiMacDinh().get<ChungThuChiTiet>(`${GOC}/chung-thu/${id}`)).data;

export const layChungThuCuaToi = async () => (await layApiMacDinh().get<ChungThuSo[]>(`${GOC}/chung-thu/cua-toi`)).data;

/** 400 theo trường → `ganLoiVaoForm`; 409 `DA_CO_CHUNG_THU` → hỏi thay thế. */
export const capChungThu = async (than: ThamSoCapChungThu) =>
  (await layApiMacDinh().post<ChungThuSo>(`${GOC}/chung-thu`, than, im)).data;

export const dangKyChungThuTuXa = async (nguoiDungId: string, maChungThuTuXa: string) =>
  (await layApiMacDinh().post<ChungThuSo>(`${GOC}/chung-thu/ca-tu-xa`, { nguoiDungId, maChungThuTuXa }, im)).data;

export const thuHoiChungThu = async (id: string, lyDo: LyDoThuHoi, ghiChu?: string, phienBan?: number) =>
  (await layApiMacDinh().post<ChungThuSo>(`${GOC}/chung-thu/${id}/thu-hoi`, { lyDo, ghiChu, phienBan }, im)).data;

export const layDanhSachCa = async () => (await layApiMacDinh().get<CaHeThong[]>(`${GOC}/ca`)).data;

export const layNhatKyChuKy = async (boLoc: { trang?: number; soBanGhi?: number; tuKhoa?: string; mucDich?: string; chungThuId?: string } = {}) =>
  (await layApiMacDinh().get<PhanTrang<ChuKySo>>(`${GOC}/chu-ky`, { params: taoQuery({ ...boLoc }) })).data;

export const layChuKy = async (id: string) => (await layApiMacDinh().get<ChuKySo>(`${GOC}/chu-ky/${id}`)).data;

/** Xác minh dữ liệu gốc (Base64) + chữ ký CMS (Base64 hoặc PEM). */
export const xacMinhChuKy = async (duLieu: string, chuKy: string) =>
  (await layApiMacDinh().post<KetQuaXacMinh>(`${GOC}/xac-minh`, { duLieu, chuKy }, im)).data;

/** Xác minh chữ ký đã lưu theo id trên tệp dữ liệu gốc người dùng chọn. */
export const xacMinhChuKyTheoId = async (id: string, duLieu: string) =>
  (await layApiMacDinh().post<KetQuaXacMinh>(`${GOC}/chu-ky/${id}/xac-minh`, { duLieu }, im)).data;

async function taiVe(duongDan: string, tenMacDinh: string) {
  const r = await layApiMacDinh().get<Blob>(duongDan, { responseType: 'blob' });
  taiTep(r.data, tenMacDinh);
}

export const taiChungThu = (c: ChungThuSo) => taiVe(`${GOC}/chung-thu/${c.id}/tai`, `chung-thu-${c.soSerial.slice(0, 16).toLowerCase()}.cer`);
export const taiChuKy = (id: string, mucDich = 'ky-so') => taiVe(`${GOC}/chu-ky/${id}/tai`, `chu-ky-${mucDich}-${id.slice(0, 8)}.p7s`);
export const taiCa = (ca: CaHeThong) => taiVe(`${GOC}/ca/${ca.id}/tai`, ca.loai === 'goc' ? 'ktdg-ca-goc.cer' : 'ktdg-ca-trung-gian.cer');
export const taiCrl = () => taiVe(`${GOC}/crl`, 'ktdg-ca-trung-gian.crl');

/** Đọc tệp → Base64 (không tiền tố data URL). */
export async function docTepBase64(tep: Blob): Promise<string> {
  const buf = new Uint8Array(await tep.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export const nhanTrangThaiXacMinh: Record<TrangThaiXacMinh, { nhan: string; mau: string }> = {
  'hop-le': { nhan: 'Chữ ký hợp lệ', mau: 'success' },
  'du-lieu-bi-sua': { nhan: 'Dữ liệu bị sửa sau khi ký', mau: 'error' },
  'chu-ky-khong-hop-le': { nhan: 'Chữ ký không hợp lệ', mau: 'error' },
  'chung-thu-bi-thu-hoi': { nhan: 'Chứng thư bị thu hồi', mau: 'error' },
  'chung-thu-het-han': { nhan: 'Chứng thư hết hạn khi ký', mau: 'warning' },
  'chuoi-khong-tin-cay': { nhan: 'CA không tin cậy', mau: 'error' },
  'da-huy': { nhan: 'Chữ ký đã hủy', mau: 'default' },
  'khong-tim-thay': { nhan: 'Không tìm thấy chữ ký', mau: 'default' },
};

export const nhanTrangThaiChungThu: Record<TrangThaiChungThu | 'khong-ro', { nhan: string; mau: string }> = {
  'hieu-luc': { nhan: 'Còn hiệu lực', mau: 'success' },
  'het-han': { nhan: 'Hết hạn', mau: 'warning' },
  'thu-hoi': { nhan: 'Đã thu hồi', mau: 'error' },
  'chua-hieu-luc': { nhan: 'Chưa hiệu lực', mau: 'default' },
  'khong-ro': { nhan: 'Không rõ', mau: 'default' },
};

export const nhanLyDoThuHoi: Record<LyDoThuHoi, string> = {
  'khong-xac-dinh': 'Không xác định',
  'lo-khoa': 'Lộ / mất khóa',
  'thay-doi-thong-tin': 'Thay đổi thông tin',
  'thay-the': 'Thay thế bằng chứng thư mới',
  'ngung-hoat-dong': 'Ngừng hoạt động / nghỉ việc',
};

export const nhanMucDichKy: Record<string, string> = {
  'ky-de-ky-dinh-ky': 'Ký đề kỳ ĐGĐK',
  'mo-lenh-in': 'Mở lệnh in sao',
  'khoa-so': 'Khóa sổ',
  'goi-hoc-ba': 'Gói điểm học bạ',
  'bien-ban': 'Biên bản',
  'goi-luu-tru': 'Gói lưu trữ',
  'goi-edge': 'Gói kỳ thi (edge)',
};
