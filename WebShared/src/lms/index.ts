/**
 * LÕI HỆ LMS dùng chung LMS.Web (giáo viên, tổ trưởng, BGH, giáo vụ, phụ huynh…) và KTDG.Web (phân hệ Học sinh —
 * màn học tập LMS ghép vào layout Học sinh của KTĐG). Tài liệu: docs/lms/, hợp đồng API docs/lms/05.
 *
 * - `types`, `hang`: mô hình dữ liệu + hằng/nhãn/permission.
 * - `api`: `goiApi` (gọi REST `/api/v1/lms/**` qua axios client của web), `datApiClientLms`.
 * - `phien`: `datNguonPhienLms` — web đăng ký nguồn phiên (người dùng + vai trò) cho lõi.
 * - `dich-vu/*`: service theo miền (import `@web-shared/lms/dich-vu/<mien>`).
 */
export * from './types';
export * from './hang';
export { goiApi, datApiClientLms, layApiLms, HEADER_VAI_TRO_LMS, taoKhoaIdempotency, loiDaThongBao } from './api';
export { datNguonPhienLms, layPhienHienTai, layQuyenHienTai } from './phien';
export type { PhienHienTai } from './phien';
export { coQuyen } from './quyen';
export { moUrlTep, taiNoiDungTepThat, cachHienThiTep, mimeTheoDuoi } from './noiDungTep';
export type { UrlTep } from './noiDungTep';
