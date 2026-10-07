/**
 * Chấm bài, công bố, sổ điểm, nhật ký điểm, đẩy KTĐG — docs/lms/05 §Chấm bài, §Sổ điểm.
 */
import { goiApi, layApiLms, layHeaderVaiTroLms, TIEN_TO_LMS, taoKhoaIdempotency } from '../api';
import type {
  BaiCham,
  DongCham,
  HangChoCham,
  HoatDongCuaHocSinh,
  KetQuaHoatDong,
  LanDayKtdg,
  LuuChamDuLieu,
  NhatKyDiem,
  NhomDiem,
  SoDiemLop,
} from '../types';

export const layDanhSachCham = (hoatDongId: string) =>
  goiApi<DongCham[]>({ phuongThuc: 'GET', duongDan: `/hoat-dong/${hoatDongId}/cham` });

export const layBaiCham = (hoatDongId: string, hocSinhId: string, luotLamId?: string) =>
  goiApi<BaiCham>({ phuongThuc: 'GET', duongDan: `/hoat-dong/${hoatDongId}/cham/${hocSinhId}`, thamSo: { luotLamId } });

/** Lưu điểm/nhận xét — 422 `LMS_CAN_LY_DO` khi sửa điểm đã công bố mà thiếu lý do; 409 `LMS_HOC_KY_DA_KHOA` */
export const luuCham = (hoatDongId: string, hocSinhId: string, duLieu: LuuChamDuLieu) =>
  goiApi<KetQuaHoatDong>({ phuongThuc: 'PUT', duongDan: `/hoat-dong/${hoatDongId}/cham/${hocSinhId}`, duLieu, khongThongBao: true });

/** Kết quả công bố / thu hồi công bố điểm */
export interface KetQuaCongBo {
  soCongBo: number;
  soChuaCham: number;
  /** Số ô đã thu hồi (chỉ lệnh thu hồi) */
  soThuHoi?: number;
}

/** Công bố điểm thủ công (bỏ trống `hocSinhIds` = mọi em đã chấm) */
export const congBoDiem = (hoatDongId: string, hocSinhIds?: string[]) =>
  goiApi<KetQuaCongBo>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${hoatDongId}/cong-bo`, duLieu: { hocSinhIds } });

/**
 * Thu hồi công bố (GV công bố nhầm — bổ sung ngoài hợp đồng 05): ô đã công bố về "đã chấm", học sinh/phụ huynh không
 * còn thấy điểm, backend ghi nhật ký điểm. Bỏ trống `hocSinhIds` = mọi em đã công bố.
 */
export const thuHoiCongBo = (hoatDongId: string, hocSinhIds?: string[]) =>
  goiApi<KetQuaCongBo>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${hoatDongId}/thu-hoi-cong-bo`, duLieu: { hocSinhIds } });

export const datMien = (hoatDongId: string, hocSinhId: string, mien: boolean, lyDo: string) =>
  goiApi<KetQuaHoatDong>({ phuongThuc: 'POST', duongDan: `/hoat-dong/${hoatDongId}/mien/${hocSinhId}`, duLieu: { mien, lyDo } });

export const layHangChoCham = () => goiApi<HangChoCham[]>({ phuongThuc: 'GET', duongDan: '/cham/hang-cho' });

// ───────── Sổ điểm ─────────

export const laySoDiem = (lopMonHocId: string, hocKyId: string) =>
  goiApi<SoDiemLop>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/so-diem`, thamSo: { hocKyId } });

/**
 * Xuất sổ điểm lớp môn học (C7a) — tệp do backend dựng (xlsx; CSV dự phòng), tải blob kèm token + header vai trò.
 * Trả nội dung + tên tệp lấy từ `Content-Disposition` (không có → tên mặc định theo loại nội dung).
 */
export async function xuatSoDiem(lopMonHocId: string, hocKyId?: string): Promise<{ noiDung: Blob; tenTep: string }> {
  const phanHoi = await layApiLms().get<Blob>(`${TIEN_TO_LMS}/lop-mon-hoc/${lopMonHocId}/so-diem/xuat`, {
    params: { hocKyId },
    responseType: 'blob',
    headers: layHeaderVaiTroLms(),
    khongThongBao: true,
  });
  const loai = String(phanHoi.headers['content-type'] ?? phanHoi.data.type ?? '');
  return { noiDung: phanHoi.data, tenTep: tenTepTuPhanHoi(phanHoi.headers['content-disposition']) ?? `so-diem.${loai.includes('csv') ? 'csv' : 'xlsx'}` };
}

/** Tên tệp trong `Content-Disposition` (ưu tiên `filename*=UTF-8''…`) */
function tenTepTuPhanHoi(tieuDe: unknown): string | null {
  if (typeof tieuDe !== 'string') return null;
  const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(tieuDe);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* tên mã hóa hỏng — thử filename thường */
    }
  }
  const thuong = /filename\s*=\s*"?([^";]+)"?/i.exec(tieuDe);
  return thuong ? thuong[1].trim() : null;
}

export const layNhatKyDiem = (lopMonHocId: string, loc: { hoatDongId?: string; hocSinhId?: string } = {}) =>
  goiApi<NhatKyDiem[]>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/so-diem/nhat-ky`, thamSo: loc });

/** Đẩy điểm đã công bố sang KTĐG làm minh chứng ĐGTX (idempotent theo học sinh – hoạt động) */
export const dayKetQuaKtdg = (lopMonHocId: string, duLieu: { hoatDongIds: string[]; hocSinhIds?: string[] }) =>
  goiApi<LanDayKtdg>({ phuongThuc: 'POST', duongDan: `/lop-mon-hoc/${lopMonHocId}/so-diem/day-ktdg`, duLieu, khoaIdempotency: taoKhoaIdempotency(), khongThongBao: true });

export const layLichSuDayKtdg = (lopMonHocId: string) =>
  goiApi<LanDayKtdg[]>({ phuongThuc: 'GET', duongDan: `/lop-mon-hoc/${lopMonHocId}/so-diem/day-ktdg` });

/** Nhóm hoạt động có trọng số (LMS-605, GĐ2) — tổng trọng số = 100 */
export const luuNhomDiem = (lopMonHocId: string, danhSach: { id?: string; ten: string; trongSo: number }[]) =>
  goiApi<NhomDiem[]>({ phuongThuc: 'PUT', duongDan: `/lop-mon-hoc/${lopMonHocId}/nhom-diem`, duLieu: { danhSach }, khongThongBao: true });

export const ganNhomDiem = (hoatDongId: string, nhomDiemId: string | null) =>
  goiApi<void>({ phuongThuc: 'PUT', duongDan: `/hoat-dong/${hoatDongId}/nhom-diem`, duLieu: { nhomDiemId } });

/** Học sinh / phụ huynh: điểm đã công bố */
export const layDiemCuaToi = (lopMonHocId?: string, hocSinhId?: string) =>
  goiApi<HoatDongCuaHocSinh[]>({ phuongThuc: 'GET', duongDan: '/hoc-sinh/diem', thamSo: { lopMonHocId, hocSinhId } });
