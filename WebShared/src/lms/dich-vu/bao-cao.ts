/**
 * Báo cáo, giám sát phiên đang chạy, phụ huynh, tích hợp (sự kiện, đối soát) — docs/lms/05 §Báo cáo.
 */
import { goiApi } from '../api';
import type { BaoCaoCapTren, BaoCaoTruong, DoiSoatKtdg, HocSinhLms, PhienDangChay, SuKienTichHop, TongQuanCon } from '../types';

/** Bảng giám sát phiên bài kiểm tra đang chạy (số đang làm, lỗi lưu, chờ chấm) */
export const layGiamSat = () => goiApi<PhienDangChay[]>({ phuongThuc: 'GET', duongDan: '/giam-sat/phien-dang-chay' });

/** `truong` (BGH) | `to` (TTCM) */
export const layBaoCao = (phamVi: 'truong' | 'to') =>
  goiApi<BaoCaoTruong>({ phuongThuc: 'GET', duongDan: `/bao-cao/${phamVi}` });

export const layBaoCaoCapTren = () => goiApi<BaoCaoCapTren>({ phuongThuc: 'GET', duongDan: '/bao-cao/tong-hop' });

export const layDanhSachCon = () => goiApi<HocSinhLms[]>({ phuongThuc: 'GET', duongDan: '/phu-huynh/con' });

export const layTongQuanCon = (hocSinhId: string) =>
  goiApi<TongQuanCon>({ phuongThuc: 'GET', duongDan: `/phu-huynh/con/${hocSinhId}/tong-quan` });

export const laySuKienTichHop = () => goiApi<SuKienTichHop[]>({ phuongThuc: 'GET', duongDan: '/tich-hop/su-kien' });

/** Đối soát LMS ↔ KTĐG theo học sinh – hoạt động */
export const doiSoatKtdg = () => goiApi<DoiSoatKtdg>({ phuongThuc: 'GET', duongDan: '/tich-hop/doi-soat' });

export const dayLaiLech = () => goiApi<number>({ phuongThuc: 'POST', duongDan: '/tich-hop/doi-soat/day-lai' });
