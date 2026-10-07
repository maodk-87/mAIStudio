/**
 * Hoạt động, phiên giao đề, lượt làm bài, bài nộp, thảo luận, ngoại lệ — docs/lms/05 §Hoạt động, §Làm bài.
 */
import { goiApi, taoKhoaIdempotency } from '../api';
import type {
  BaiNop,
  BaiThaoLuan,
  BatDauLuotLamKetQua,
  HoatDong,
  HoatDongCuaHocSinh,
  HoatDongTomTat,
  KetQuaLuotLamHs,
  LoaiKhongGian,
  LuotLam,
  NgoaiLeHocSinh,
  ThaoLuanHienThi,
  TraLoiCau,
} from '../types';

const kg = (loai: LoaiKhongGian, id: string) => `/khong-gian/${loai}/${id}`;

// ───────── Giáo viên ─────────

export const layDanhSachHoatDong = (loai: LoaiKhongGian, khongGianId: string) =>
  goiApi<HoatDongTomTat[]>({ phuongThuc: 'GET', duongDan: `${kg(loai, khongGianId)}/hoat-dong` });

export const layHoatDong = (id: string) => goiApi<HoatDong>({ phuongThuc: 'GET', duongDan: `/hoat-dong/${id}` });

export type DuLieuHoatDong = Partial<HoatDong> & Pick<HoatDong, 'loai' | 'tieuDe'>;

/** Tạo hoạt động (trạng thái nháp); `moduleId` → thêm luôn vào module */
export const taoHoatDong = (loai: LoaiKhongGian, khongGianId: string, duLieu: DuLieuHoatDong, moduleId?: string | null) =>
  goiApi<HoatDong>({ phuongThuc: 'POST', duongDan: `${kg(loai, khongGianId)}/hoat-dong`, duLieu: { ...duLieu, moduleId } });

export const suaHoatDong = (id: string, duLieu: Partial<HoatDong>) =>
  goiApi<HoatDong>({ phuongThuc: 'PUT', duongDan: `/hoat-dong/${id}`, duLieu });

/** Xóa — 409 `LMS_HOAT_DONG_CO_BAI_LAM` khi đã có bài làm/điểm */
export const xoaHoatDong = (id: string) =>
  goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/hoat-dong/${id}`, khongThongBao: true });

/** Giao cho học sinh — bài kiểm tra: backend gọi KTĐG `taoPhienGiao` chốt snapshot đề */
export const giaoHoatDong = (id: string) =>
  goiApi<HoatDong>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${id}/giao`, khoaIdempotency: taoKhoaIdempotency() });

export const dongHoatDong = (id: string, dong: boolean) =>
  goiApi<HoatDong>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${id}/dong`, duLieu: { dong } });

// Ngoại lệ riêng từng học sinh (LMS-503)
export const layNgoaiLe = (hoatDongId: string) =>
  goiApi<NgoaiLeHocSinh[]>({ phuongThuc: 'GET', duongDan: `/hoat-dong/${hoatDongId}/ngoai-le` });

export const luuNgoaiLe = (hoatDongId: string, duLieu: { hocSinhIds: string[]; hanNopMoi?: string | null; themPhut?: number | null; themLuot?: number | null; lyDo: string }) =>
  goiApi<NgoaiLeHocSinh[]>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${hoatDongId}/ngoai-le`, duLieu });

export const xoaNgoaiLe = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/ngoai-le/${id}` });

// ───────── Học sinh ─────────

/** Hoạt động của em (một lớp hoặc tất cả); phụ huynh truyền `hocSinhId` của con */
export const layHoatDongCuaToi = (lopMonHocId?: string, hocSinhId?: string) =>
  goiApi<HoatDongCuaHocSinh[]>({ phuongThuc: 'GET', duongDan: '/hoc-sinh/hoat-dong', thamSo: { lopMonHocId, hocSinhId } });

export const layHoatDongHs = (id: string) =>
  goiApi<HoatDongCuaHocSinh>({ phuongThuc: 'GET', duongDan: `/hoc-sinh/hoat-dong/${id}` });

export const layBaiNopCuaToi = (hoatDongId: string) =>
  goiApi<BaiNop[]>({ phuongThuc: 'GET', duongDan: `/hoat-dong/${hoatDongId}/bai-nop-cua-toi` });

/** Nộp bài tập (văn bản / tệp / ghi âm) — multipart; idempotent theo khóa */
export const nopBaiTap = (hoatDongId: string, duLieu: { noiDungHtml?: string | null; tep: File[] }) => {
  const form = new FormData();
  if (duLieu.noiDungHtml) form.append('noiDungHtml', duLieu.noiDungHtml);
  duLieu.tep.forEach((t) => form.append('tep', t));
  return goiApi<BaiNop>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${hoatDongId}/bai-nop`, duLieu: form, khoaIdempotency: taoKhoaIdempotency(), khongThongBao: true });
};

/** Bắt đầu hoặc tiếp tục lượt làm — nhận đề KHÔNG đáp án */
export const batDauLuotLam = (hoatDongId: string, maTruyCap?: string) =>
  goiApi<BatDauLuotLamKetQua>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${hoatDongId}/luot-lam`, duLieu: { maTruyCap }, khoaIdempotency: taoKhoaIdempotency(), khongThongBao: true });

export const layLuotLam = (luotLamId: string) =>
  goiApi<BatDauLuotLamKetQua>({ phuongThuc: 'GET', duongDan: `/luot-lam/${luotLamId}` });

/** Tự lưu câu trả lời — idempotent theo `phienBanLuu` (bản cũ bị bỏ qua) */
export const luuTraLoi = (luotLamId: string, traLoi: Record<string, TraLoiCau>, phienBanLuu: number) =>
  goiApi<{ phienBanLuu: number; daNop: boolean; hanKetThuc: string | null }>({ phuongThuc: 'PUT', duongDan: `/luot-lam/${luotLamId}/tra-loi`, duLieu: { traLoi, phienBanLuu }, khongThongBao: true });

/** Ghi nhật ký lượt làm: mất kết nối / kết nối lại (docs/lms/99 5.5) */
export const ghiSuKienLuot = (luotLamId: string, loai: 'mat-ket-noi' | 'ket-noi-lai', chiTiet?: string) =>
  goiApi<void>({ phuongThuc: 'POST', duongDan: `/luot-lam/${luotLamId}/nhat-ky`, duLieu: { loai, chiTiet }, khongThongBao: true });

/** Nộp bài (tay hoặc tự nộp khi hết giờ) — idempotent; chấm tự động chạy bất đồng bộ */
export const nopLuotLam = (luotLamId: string, duLieu: { tuNop: boolean; traLoi?: Record<string, TraLoiCau>; phienBanLuu?: number }) =>
  goiApi<LuotLam>({ phuongThuc: 'POST', duongDan: `/luot-lam/${luotLamId}/nop`, duLieu, khoaIdempotency: `nop-${luotLamId}` });

export const layLuotCuaToi = (hoatDongId: string) =>
  goiApi<LuotLam[]>({ phuongThuc: 'GET', duongDan: `/hoat-dong/${hoatDongId}/luot-lam-cua-toi` });

/** Kết quả lượt làm theo chính sách công bố điểm/đáp án */
export const layKetQuaLuotLam = (luotLamId: string) =>
  goiApi<KetQuaLuotLamHs>({ phuongThuc: 'GET', duongDan: `/luot-lam/${luotLamId}/ket-qua` });

// ───────── Thảo luận (LMS-403) ─────────

export const layThaoLuan = (hoatDongId: string) =>
  goiApi<ThaoLuanHienThi>({ phuongThuc: 'GET', duongDan: `/hoat-dong/${hoatDongId}/thao-luan` });

export const dangBaiThaoLuan = (hoatDongId: string, duLieu: { noiDungHtml: string; chaId?: string | null }) =>
  goiApi<BaiThaoLuan>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${hoatDongId}/thao-luan`, duLieu });

export const xoaBaiThaoLuan = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/thao-luan/${id}` });
