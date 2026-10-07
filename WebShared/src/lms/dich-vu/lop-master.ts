/**
 * Lớp Master (LMS-102…110, 113) — docs/lms/05 §Lớp Master.
 */
import { goiApi, layApiLms } from '../api';
import type {
  GanLopMaster,
  KetQuaApDung,
  KetQuaDayXuong,
  KhacBietDongBo,
  LoaiNhanSuSoan,
  LopMaster,
  LopMonHoc,
  PhanCongSoanMaster,
  PhienBanMaster,
  SoSanhLopMaster,
  TrangThaiMaster,
  TrienKhaiMaster,
  UngVienPhanCong,
} from '../types';

export interface LocMaster {
  monHocId?: string;
  khoi?: number;
  trangThai?: TrangThaiMaster;
  /** Gồm cả Master năm học trước (dùng khi sao chép năm) */
  tatCaNam?: boolean;
}

export const layDanhSachMaster = (loc: LocMaster = {}) =>
  goiApi<LopMaster[]>({ phuongThuc: 'GET', duongDan: '/lop-master', thamSo: loc });

export const layMaster = (id: string) => goiApi<LopMaster>({ phuongThuc: 'GET', duongDan: `/lop-master/${id}` });

export const taoMaster = (duLieu: { ten: string; monHocId: string; khoi: number; moTa?: string }) =>
  goiApi<LopMaster>({ phuongThuc: 'POST', duongDan: '/lop-master', duLieu });

/**
 * Cặp môn – khối từ danh mục dùng chung (`/api/v1/nen-tang/danh-muc`) — form tạo chương trình học cấp Bộ/Sở/Phường-Xã
 * (không có lớp môn học để suy); backend kiểm khối có ở trường trực thuộc (`LMS_KHOI_KHONG_THUOC_PHAM_VI`).
 */
export async function layMonKhoiDanhMuc(): Promise<{ monHocId: string; monHocTen: string; khoi: number }[]> {
  const api = layApiLms();
  const [mon, khoi] = await Promise.all([
    api.get<{ id: string; ten: string; khoiIds: string[] }[]>('/v1/nen-tang/danh-muc/mon-hoc'),
    api.get<{ id: string; so: number }[]>('/v1/nen-tang/danh-muc/khoi'),
  ]);
  const soKhoi = new Map(khoi.data.map((k) => [k.id, k.so]));
  return mon.data.flatMap((m) =>
    m.khoiIds.flatMap((kId) => (soKhoi.has(kId) ? [{ monHocId: m.id, monHocTen: m.ten, khoi: soKhoi.get(kId)! }] : [])),
  );
}

export const suaMaster = (id: string, duLieu: { ten?: string; moTa?: string }) =>
  goiApi<LopMaster>({ phuongThuc: 'PUT', duongDan: `/lop-master/${id}`, duLieu });

/** Xóa — 409 `LMS_MASTER_DANG_GAN_LOP` khi còn lớp gán (chỉ ngừng sử dụng) */
export const xoaMaster = (id: string) =>
  goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/lop-master/${id}`, khongThongBao: true });

export const datNgungSuDung = (id: string, ngung: boolean) =>
  goiApi<LopMaster>({ phuongThuc: 'POST', duongDan: `/lop-master/${id}/ngung-su-dung`, duLieu: { ngung } });

// Phân công soạn (LMS-103)
export const layPhanCongSoan = (masterId: string) =>
  goiApi<PhanCongSoanMaster[]>({ phuongThuc: 'GET', duongDan: `/lop-master/${masterId}/phan-cong-soan` });

/** Chương trình cấp trên: `loaiNhanSu = 'chuyen-vien'` thì `giaoVienId` là id tài khoản; chỉ chuyên viên được 'phat-hanh' (LMS-114b) */
export const luuPhanCongSoan = (
  masterId: string,
  danhSach: { giaoVienId: string; quyen: PhanCongSoanMaster['quyen']; loaiNhanSu?: LoaiNhanSuSoan }[],
) => goiApi<PhanCongSoanMaster[]>({ phuongThuc: 'PUT', duongDan: `/lop-master/${masterId}/phan-cong-soan`, duLieu: { danhSach } });

/** Ứng viên phân công soạn chương trình cấp trên — `giaoVien` chỉ có khi truyền `truongId` (LMS-114b) */
export const layUngVienPhanCong = (masterId: string, truongId?: string) =>
  goiApi<UngVienPhanCong>({ phuongThuc: 'GET', duongDan: `/lop-master/${masterId}/ung-vien-phan-cong`, thamSo: { truongId } });

// Gán lớp (LMS-104, 106)
export const layGanLop = (masterId: string) =>
  goiApi<GanLopMaster[]>({ phuongThuc: 'GET', duongDan: `/lop-master/${masterId}/gan-lop` });

export const layLopCoTheGan = (masterId: string) =>
  goiApi<LopMonHoc[]>({ phuongThuc: 'GET', duongDan: `/lop-master/${masterId}/lop-co-the-gan` });

export const ganLop = (masterId: string, lopMonHocIds: string[], apDungNgay: boolean) =>
  goiApi<{ soLop: number; apDung?: KetQuaApDung }>({ phuongThuc: 'POST', duongDan: `/lop-master/${masterId}/gan-lop`, duLieu: { lopMonHocIds, apDungNgay } });

export const boGanLop = (masterId: string, lopMonHocId: string) =>
  goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/lop-master/${masterId}/gan-lop/${lopMonHocId}` });

// Áp dụng / phát hành / đồng bộ
export const apDungMaster = (masterId: string, lopMonHocIds?: string[]) =>
  goiApi<KetQuaApDung>({ phuongThuc: 'POST', duongDan: `/lop-master/${masterId}/ap-dung`, duLieu: { lopMonHocIds } });

/** Cấp trên: phát hành = tạo phiên bản + đẩy xuống đơn vị trực thuộc trực tiếp (`donViDichIds` rỗng = mọi đơn vị hợp lệ — LMS-114c) */
export const phatHanhMaster = (masterId: string, ghiChu?: string, donViDichIds?: string[]) =>
  goiApi<LopMaster>({ phuongThuc: 'POST', duongDan: `/lop-master/${masterId}/phat-hanh`, duLieu: { ghiChu, donViDichIds } });

/** Tình trạng triển khai chương trình cấp trên tại các đơn vị trực thuộc trực tiếp (MH-37, LMS-114e) */
export const layTrienKhai = (masterId: string) =>
  goiApi<TrienKhaiMaster[]>({ phuongThuc: 'GET', duongDan: `/lop-master/${masterId}/trien-khai` });

/** Đẩy bổ sung phiên bản hiện hành xuống đơn vị trực thuộc (LMS-114c) */
export const dayXuong = (masterId: string, donViDichIds?: string[]) =>
  goiApi<KetQuaDayXuong[]>({ phuongThuc: 'POST', duongDan: `/lop-master/${masterId}/day-xuong`, duLieu: { donViDichIds } });

export const layPhienBanMaster = (masterId: string) =>
  goiApi<PhienBanMaster[]>({ phuongThuc: 'GET', duongDan: `/lop-master/${masterId}/phien-ban` });

/** GĐ2 — khác biệt giữa Master và lớp trước khi đồng bộ */
export const layKhacBietDongBo = (lopMonHocId: string) =>
  goiApi<KhacBietDongBo[]>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/dong-bo-master` });

export const dongBoLop = (lopMonHocId: string) =>
  goiApi<{ soThem: number; soCapNhat: number; soGiuBanGv: number }>({ phuongThuc: 'POST', duongDan: `/lop-mon-hoc/${lopMonHocId}/dong-bo-master` });

/** Sao chép Master năm trước sang năm hiện tại (LMS-107) */
export const saoChepMaster = (id: string, ten: string) =>
  goiApi<LopMaster>({ phuongThuc: 'POST', duongDan: `/lop-master/${id}/sao-chep`, duLieu: { ten } });

/** Bài kiểm tra chung theo Master (LMS-110, GĐ2) */
export const taoBaiKiemTraChung = (masterId: string, duLieu: { hoatDongMasterId: string; ngayMo: string; hanNop: string }) =>
  goiApi<{ soLop: number; snapshotId: string }>({ phuongThuc: 'POST', duongDan: `/lop-master/${masterId}/bai-kiem-tra-chung`, duLieu });

/** So sánh kết quả giữa các lớp cùng Master (LMS-113, GĐ2) */
export const soSanhKetQua = (masterId: string) =>
  goiApi<SoSanhLopMaster>({ phuongThuc: 'GET', duongDan: `/lop-master/${masterId}/so-sanh-ket-qua` });
