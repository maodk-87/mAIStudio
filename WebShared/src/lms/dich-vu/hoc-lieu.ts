/**
 * Học liệu: Module, mục, trang nội dung, kho tệp, tiến độ — docs/lms/05 §Học liệu.
 * `loai` không gian: `lop` (lớp môn học) | `master` (Lớp Master) — cùng một bộ API.
 */
import { goiApi } from '../api';
import type { LoaiKhongGian, ModuleChiTiet, ModuleHoc, MucModule, TepLms, TienDoLop, TrangNoiDung } from '../types';

const kg = (loai: LoaiKhongGian, id: string) => `/khong-gian/${loai}/${id}`;

/** Module + mục; học sinh nhận thêm trạng thái khóa/hoàn thành. Phụ huynh truyền `hocSinhId` của con. */
export const layModule = (loai: LoaiKhongGian, khongGianId: string, hocSinhId?: string) =>
  goiApi<ModuleChiTiet[]>({ phuongThuc: 'GET', duongDan: `${kg(loai, khongGianId)}/module`, thamSo: { hocSinhId } });

export const taoModule = (loai: LoaiKhongGian, khongGianId: string, duLieu: Partial<ModuleHoc>) =>
  goiApi<ModuleHoc>({ phuongThuc: 'POST', duongDan: `${kg(loai, khongGianId)}/module`, duLieu });

export const suaModule = (id: string, duLieu: Partial<ModuleHoc>) =>
  goiApi<ModuleHoc>({ phuongThuc: 'PUT', duongDan: `/module/${id}`, duLieu });

export const xoaModule = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/module/${id}` });

export const sapXepModule = (loai: LoaiKhongGian, khongGianId: string, ids: string[]) =>
  goiApi<void>({ phuongThuc: 'PUT', duongDan: `${kg(loai, khongGianId)}/module/thu-tu`, duLieu: { ids } });

export const themMuc = (moduleId: string, duLieu: Omit<MucModule, 'id' | 'moduleId' | 'thuTu'>) =>
  goiApi<MucModule>({ phuongThuc: 'POST', duongDan: `/module/${moduleId}/muc`, duLieu });

/** Sửa mục; ở Lớp Master được đặt `khoa` (GĐ2); đổi `moduleId` = chuyển mục sang module khác */
export const suaMuc = (id: string, duLieu: Partial<MucModule>) =>
  goiApi<MucModule>({ phuongThuc: 'PUT', duongDan: `/muc/${id}`, duLieu });

export const xoaMuc = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/muc/${id}` });

export const sapXepMuc = (moduleId: string, ids: string[]) =>
  goiApi<void>({ phuongThuc: 'PUT', duongDan: `/module/${moduleId}/muc/thu-tu`, duLieu: { ids } });

// Trang nội dung (LMS-301)
export const layDanhSachTrang = (loai: LoaiKhongGian, khongGianId: string) =>
  goiApi<TrangNoiDung[]>({ phuongThuc: 'GET', duongDan: `${kg(loai, khongGianId)}/trang` });

export const layTrang = (id: string) => goiApi<TrangNoiDung>({ phuongThuc: 'GET', duongDan: `/trang/${id}` });

export const taoTrang = (loai: LoaiKhongGian, khongGianId: string, duLieu: { tieuDe: string; noiDungHtml: string; moduleId?: string | null }) =>
  goiApi<TrangNoiDung>({ phuongThuc: 'POST', duongDan: `${kg(loai, khongGianId)}/trang`, duLieu });

export const suaTrang = (id: string, duLieu: { tieuDe?: string; noiDungHtml?: string }) =>
  goiApi<TrangNoiDung>({ phuongThuc: 'PUT', duongDan: `/trang/${id}`, duLieu });

export const xoaTrang = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/trang/${id}` });

// Kho tệp (LMS-302)
export const layTep = (loai: LoaiKhongGian, khongGianId: string) =>
  goiApi<TepLms[]>({ phuongThuc: 'GET', duongDan: `${kg(loai, khongGianId)}/tep` });

/** Tải tệp lên kho (multipart). Lỗi: `LMS_VUOT_DUNG_LUONG`, `LMS_TEP_QUA_LON`, `LMS_DINH_DANG_TEP` */
export const taiLenTep = (loai: LoaiKhongGian, khongGianId: string, tep: File, tuyChon: { thuMuc?: string | null; moduleId?: string | null } = {}) => {
  const form = new FormData();
  form.append('tep', tep);
  if (tuyChon.thuMuc) form.append('thuMuc', tuyChon.thuMuc);
  if (tuyChon.moduleId) form.append('moduleId', tuyChon.moduleId);
  return goiApi<TepLms>({ phuongThuc: 'POST', duongDan: `${kg(loai, khongGianId)}/tep`, duLieu: form, khongThongBao: true });
};

export const xoaTep = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/tep/${id}` });

/** Học sinh đánh dấu đã xem mục (trang/tệp/liên kết) */
export const danhDauDaXem = (mucId: string) =>
  goiApi<void>({ phuongThuc: 'POST', duongDan: `/muc/${mucId}/da-xem` });

/** Tiến độ học sinh × module (LMS-204, GĐ2) */
export const layTienDoLop = (lopMonHocId: string) =>
  goiApi<TienDoLop>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/tien-do` });
