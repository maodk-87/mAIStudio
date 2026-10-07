/**
 * Lớp môn học (không gian học), học sinh, thông báo, nhóm, trợ giảng, lịch, tổng quan — docs/lms/05 §Lớp môn học.
 */
import { goiApi } from '../api';
import type {
  GanLopMaster,
  GiaoVienTomTat,
  HocSinhLms,
  KhongGianTomTat,
  LoaiKhongGian,
  LopMonHoc,
  LopMonHocTomTat,
  NhomHocSinh,
  SuKienLich,
  ThongBaoLop,
  TongQuanGiaoVien,
  TrangChuHocSinh,
  TroGiang,
} from '../types';

export type PhamViLop = 'cua-toi' | 'to' | 'truong';

/** Danh sách lớp môn học theo phạm vi của vai trò đang chọn */
export const layDanhSachLop = (phamVi: PhamViLop = 'cua-toi') =>
  goiApi<LopMonHocTomTat[]>({ phuongThuc: 'GET', duongDan: '/lop-mon-hoc', thamSo: { phamVi } });

/** Tóm tắt không gian học (lớp môn học hoặc Lớp Master) + quyền của người xem */
export const layKhongGian = (loai: LoaiKhongGian, id: string) =>
  goiApi<KhongGianTomTat>({ phuongThuc: 'GET', duongDan: `/khong-gian/${loai}/${id}`, khongThongBao: true });

export const layHocSinhCuaLop = (lopMonHocId: string) =>
  goiApi<HocSinhLms[]>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/hoc-sinh` });

// Thông báo lớp (LMS-108)
export const layThongBao = (lopMonHocId: string) =>
  goiApi<ThongBaoLop[]>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/thong-bao` });

export const taoThongBao = (lopMonHocId: string, duLieu: Pick<ThongBaoLop, 'tieuDe' | 'noiDungHtml' | 'ghimDau'>) =>
  goiApi<ThongBaoLop>({ phuongThuc: 'POST', duongDan: `/lop-mon-hoc/${lopMonHocId}/thong-bao`, duLieu });

export const suaThongBao = (lopMonHocId: string, id: string, duLieu: Pick<ThongBaoLop, 'tieuDe' | 'noiDungHtml' | 'ghimDau'>) =>
  goiApi<ThongBaoLop>({ phuongThuc: 'PUT', duongDan: `/thong-bao/${id}`, duLieu });

export const xoaThongBao = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/thong-bao/${id}` });

// Nhóm học sinh (LMS-111, GĐ2)
export const layNhom = (lopMonHocId: string) =>
  goiApi<NhomHocSinh[]>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/nhom` });

export const taoNhom = (lopMonHocId: string, duLieu: Pick<NhomHocSinh, 'ten' | 'hocSinhIds'>) =>
  goiApi<NhomHocSinh>({ phuongThuc: 'POST', duongDan: `/lop-mon-hoc/${lopMonHocId}/nhom`, duLieu });

export const suaNhom = (lopMonHocId: string, id: string, duLieu: Pick<NhomHocSinh, 'ten' | 'hocSinhIds'>) =>
  goiApi<NhomHocSinh>({ phuongThuc: 'PUT', duongDan: `/nhom/${id}`, duLieu });

export const xoaNhom = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/nhom/${id}` });

export const chiaNhomNgauNhien = (lopMonHocId: string, soNhom: number) =>
  goiApi<NhomHocSinh[]>({ phuongThuc: 'POST', duongDan: `/lop-mon-hoc/${lopMonHocId}/nhom/ngau-nhien`, duLieu: { soNhom } });

// Trợ giảng
export const layTroGiang = (lopMonHocId: string) =>
  goiApi<TroGiang[]>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/tro-giang` });

export const luuTroGiang = (lopMonHocId: string, giaoVienId: string, quyen: TroGiang['quyen']) =>
  goiApi<TroGiang>({ phuongThuc: 'PUT', duongDan: `/lop-mon-hoc/${lopMonHocId}/tro-giang/${giaoVienId}`, duLieu: { quyen } });

export const xoaTroGiang = (id: string) => goiApi<void>({ phuongThuc: 'DELETE', duongDan: `/tro-giang/${id}` });

/** Giáo viên của trường (chọn trợ giảng, phân công soạn Master) — đọc từ CSDL */
export const layGiaoVien = (toChuyenMonId?: string) =>
  goiApi<GiaoVienTomTat[]>({ phuongThuc: 'GET', duongDan: '/giao-vien', thamSo: { toChuyenMonId } });

export const layLichSuMasterCuaLop = (lopMonHocId: string) =>
  goiApi<GanLopMaster[]>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/lich-su-master` });

/** Lưu trữ cuối năm — chỉ đọc (LMS-112, GĐ2) */
export const luuTruLop = (lopMonHocId: string, luuTru: boolean) =>
  goiApi<LopMonHoc>({ phuongThuc: 'POST', duongDan: `/lop-mon-hoc/${lopMonHocId}/luu-tru`, duLieu: { luuTru } });

/** Lịch hạn nộp (LMS-112, GĐ2) — `tu`/`den` ISO */
export const layLich = (tu: string, den: string, lopMonHocId?: string) =>
  goiApi<SuKienLich[]>({ phuongThuc: 'GET', duongDan: '/lich', thamSo: { tu, den, lopMonHocId } });

export const layTongQuanGiaoVien = () => goiApi<TongQuanGiaoVien>({ phuongThuc: 'GET', duongDan: '/tong-quan/giao-vien' });

export const layTrangChuHocSinh = () => goiApi<TrangChuHocSinh>({ phuongThuc: 'GET', duongDan: '/tong-quan/hoc-sinh' });
