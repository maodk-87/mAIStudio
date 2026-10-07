/**
 * Tầng gọi API LMS (dùng chung LMS.Web và KTDG.Web phân hệ Học sinh/Phụ huynh): mọi hàm service gọi đúng endpoint REST
 * `/api/v1/lms/**` qua axios client mặc định của web (`@web-shared/api` — `taoApiClient` ở `configs/api/configApi`):
 * dùng chung access token, làm mới token bằng cookie refresh HttpOnly và xử lý 401/hết phiên của cổng đăng nhập chung;
 * tenant do gateway bơm. Không còn chế độ giả lập.
 *
 * Hợp đồng endpoint: docs/lms/05-hop-dong-api-lms.md.
 */
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { layApiMacDinh, voiIdempotency } from '../api';
import { layPhienHienTai } from './phien';

/** Client axios gọi LMS — mặc định: client mặc định của web (`taoApiClient` đầu tiên) */
let layApi: () => AxiosInstance = layApiMacDinh;
export function datApiClientLms(fn: () => AxiosInstance) {
  layApi = fn;
}

/** Client axios đang dùng cho LMS — tải nội dung tệp có kiểm quyền (`noiDungTep`) */
export function layApiLms(): AxiosInstance {
  return layApi();
}

/** Header vai trò LMS đang chọn (tài khoản nhiều vai trò) — backend kiểm quyền theo vai trò này (docs/lms/05 §1) */
export const HEADER_VAI_TRO_LMS = 'X-Vai-Tro-Lms';

/** Header vai trò đang chọn (rỗng khi chưa có phiên) */
export function layHeaderVaiTroLms(): Record<string, string> {
  const vaiTro = layPhienHienTai()?.vaiTro;
  return vaiTro ? { [HEADER_VAI_TRO_LMS]: vaiTro } : {};
}

/** Tiền tố mọi endpoint LMS (qua gateway `/api`) */
export const TIEN_TO_LMS = '/v1/lms';

export type PhuongThuc = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface YeuCau {
  phuongThuc: PhuongThuc;
  /** Đường dẫn sau `/api/v1/lms`, VD `/lop-mon-hoc/123/module` */
  duongDan: string;
  /** Query string */
  thamSo?: object;
  /** Thân request (JSON hoặc FormData) */
  duLieu?: unknown;
  /** Khóa idempotency cho lệnh ghi quan trọng (nộp bài, đẩy KTĐG…) */
  khoaIdempotency?: string;
  /** Không hiện toast lỗi chung — màn tự xử lý */
  khongThongBao?: boolean;
}

/**
 * Gọi một endpoint LMS.
 * Lỗi nghiệp vụ: `LoiApi` (problem+json, `maLoi`) do interceptor của `@web-shared/api` dựng.
 */
export async function goiApi<T>(yeuCau: YeuCau): Promise<T> {
  const cauHinh: AxiosRequestConfig & { khongThongBao?: boolean } = {
    method: yeuCau.phuongThuc,
    url: `${TIEN_TO_LMS}${yeuCau.duongDan}`,
    params: yeuCau.thamSo,
    data: yeuCau.duLieu,
    ...(yeuCau.khoaIdempotency ? voiIdempotency(yeuCau.khoaIdempotency) : {}),
    khongThongBao: yeuCau.khongThongBao,
  };
  // Vai trò đang làm việc (tài khoản nhiều vai trò) — backend kiểm quyền theo vai trò này (docs/lms/05)
  cauHinh.headers = { ...(cauHinh.headers as Record<string, string> | undefined), ...layHeaderVaiTroLms() };
  try {
    const phanHoi = await layApi().request<T>(cauHinh);
    return phanHoi.data;
  } catch (e) {
    // Interceptor axios đã hiện lỗi chung khi không có `khongThongBao`
    if (!yeuCau.khongThongBao && e instanceof Error) danhDauDaThongBao(e);
    throw e;
  }
}

function danhDauDaThongBao(e: Error) {
  (e as Error & { daThongBao?: boolean }).daThongBao = true;
}

/** Lỗi đã được hiện qua bộ hiện lỗi chung — màn hình không cần toast lại */
export function loiDaThongBao(e: unknown): boolean {
  return !!(e as { daThongBao?: boolean } | null)?.daThongBao;
}

/** Sinh id ngẫu nhiên (dự phòng khi trình duyệt không có `crypto.randomUUID`) */
function taoId(tienTo = ''): string {
  return `${tienTo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Khóa idempotency cho một thao tác (ổn định trong một lần bấm) */
export function taoKhoaIdempotency(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : taoId('k-');
}
