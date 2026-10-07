/**
 * Tra cứu ngân hàng KTĐG QUA LMS (LMS làm BFF, tự kiểm tra quyền rồi gọi API nội bộ KTĐG) — docs/lms/05 §KTĐG,
 * docs/lms/02. Không bao giờ trả đề ĐGĐK / đề chưa duyệt.
 */
import { goiApi } from '../api';
import type { CauHoiKtdgTomTat, ChuanDauRa, DeKtdg, DeXemTruoc, PhanLoaiKtdg, QuyTacBoc, RubricLms } from '../types';

export interface LocDe {
  monHocId?: string;
  khoi?: number;
  chuDeId?: string;
  nguon?: string;
  mucDich?: string;
  tuKhoa?: string;
}

/** `getTaxonomy` */
export const layPhanLoai = () => goiApi<PhanLoaiKtdg>({ phuongThuc: 'GET', duongDan: '/ktdg/phan-loai' });

/** `searchTests` — đề đã duyệt, nhãn ĐGTX / luyện tập */
export const timDe = (loc: LocDe) => goiApi<DeKtdg[]>({ phuongThuc: 'GET', duongDan: '/ktdg/de', thamSo: loc });

/** `previewTest` — GV xem trước đề kèm đáp án */
export const xemTruocDe = (deId: string) => goiApi<DeXemTruoc>({ phuongThuc: 'GET', duongDan: `/ktdg/de/${deId}/xem-truoc` });

/** Thư viện rubric KTĐG + rubric cá nhân (LMS-701, GĐ2) */
export const layThuVienRubric = (monHocId?: string) =>
  goiApi<RubricLms[]>({ phuongThuc: 'GET', duongDan: '/ktdg/rubric', thamSo: { monHocId } });

/** Lưu rubric cá nhân (lưu tại KTĐG) */
export const luuRubricCaNhan = (rubric: Omit<RubricLms, 'id' | 'nguon' | 'nguoiTao'> & { id?: string }) =>
  goiApi<RubricLms>({ phuongThuc: rubric.id ? 'PUT' : 'POST', duongDan: rubric.id ? `/ktdg/rubric/${rubric.id}` : '/ktdg/rubric', duLieu: rubric });

/** Cây yêu cầu cần đạt GDPT 2018 (LMS-801, GĐ2) */
export const layChuanDauRa = (monHocId?: string, khoi?: number) =>
  goiApi<ChuanDauRa[]>({ phuongThuc: 'GET', duongDan: '/ktdg/chuan-dau-ra', thamSo: { monHocId, khoi } });

// GĐ2 — lắp đề nhanh
export const timCauHoi = (loc: { monHocId?: string; khoi?: number; chuDeId?: string; mucDo?: string; tuKhoa?: string }) =>
  goiApi<CauHoiKtdgTomTat[]>({ phuongThuc: 'GET', duongDan: '/ktdg/cau-hoi', thamSo: loc });

export const taoDeCaNhan = (duLieu: { ten: string; monHocId: string; khoi: number; cauHoiIds: string[] }) =>
  goiApi<DeKtdg>({ phuongThuc: 'POST', duongDan: '/ktdg/de-ca-nhan', duLieu });

export const taoDeTheoQuyTac = (duLieu: { ten: string; monHocId: string; khoi: number; quyTac: QuyTacBoc[] }) =>
  goiApi<{ de: DeKtdg; thieu: { quyTac: QuyTacBoc; soCo: number }[] }>({ phuongThuc: 'POST', duongDan: '/ktdg/de-theo-quy-tac', duLieu });
