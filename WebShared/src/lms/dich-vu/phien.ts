/**
 * Phiên & cấu hình LMS cấp trường — docs/lms/05 §Phiên, §Cấu hình.
 */
import { goiApi } from '../api';
import type { CauHinhLms, DungLuongKho, HocKy, PhienLms } from '../types';

/**
 * Ngữ cảnh phiên LMS (P1): vai trò, quyền theo vai trò, năm học, học kỳ, cờ bật LMS — danh tính lấy từ token cổng chung.
 * Tự xử lý lỗi (khởi động phiên LMS.Web/KTDG.Web hiển thị trang riêng, không toast).
 */
export const layNguCanhPhien = () =>
  goiApi<PhienLms>({ phuongThuc: 'GET', duongDan: '/phien/ngu-canh', khongThongBao: true });

export const layCauHinh = () => goiApi<CauHinhLms>({ phuongThuc: 'GET', duongDan: '/cau-hinh' });

export const capNhatCauHinh = (duLieu: Partial<CauHinhLms>) =>
  goiApi<CauHinhLms>({ phuongThuc: 'PUT', duongDan: '/cau-hinh', duLieu });

/** Bật/tắt LMS — tắt bị chặn (409 `LMS_CON_PHIEN_MO`, `chiTiet` = danh sách phiên) khi còn phiên giao đề đang mở */
export const batTatLms = (bat: boolean) =>
  goiApi<CauHinhLms>({ phuongThuc: 'POST', duongDan: '/cau-hinh/kich-hoat', duLieu: { bat }, khongThongBao: true });

export const layPhienDangMo = () =>
  goiApi<{ hoatDongId: string; tieuDe: string; lop: string }[]>({ phuongThuc: 'GET', duongDan: '/cau-hinh/phien-dang-mo' });

export const layDungLuongKho = () => goiApi<DungLuongKho>({ phuongThuc: 'GET', duongDan: '/cau-hinh/dung-luong' });

/** Khóa / mở khóa sổ điểm LMS của học kỳ (LMS-602) */
export const khoaHocKy = (hocKyId: string, khoa: boolean, lyDo?: string) =>
  goiApi<HocKy>({ phuongThuc: 'POST', duongDan: `/hoc-ky/${hocKyId}/khoa`, duLieu: { khoa, lyDo } });

