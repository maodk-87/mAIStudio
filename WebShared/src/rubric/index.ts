/**
 * RUBRIC CHẤM TỰ LUẬN — dùng chung KTĐG / NHCH / QLTHI (SRS "Quy tắc rubric chấm tự luận",
 * hợp đồng API docs/apis/19-rubric-cham-tu-luan.md).
 * - Kiểu + bộ máy tính điểm/kiểm tra hợp lệ (thuần, dùng được ở service/mock): `types`, `tinhToan`, `thaoTac`.
 * - Component: TrinhSoanRubric (soạn), XemRubric (xem), BangChamRubric (vùng chấm), ManChamRubric (màn chấm 2 vùng).
 * Dữ liệu (nhãn, mẫu, phiếu chấm) do web tiêm qua prop `nguon` — xem `nguon.ts`.
 */
export * from './types';
export * from './tinhToan';
export * from './thaoTac';
export * from './nguon';
export { default as TrinhSoanRubric } from './TrinhSoanRubric';
export type { TrinhSoanRubricProps } from './TrinhSoanRubric';
export { default as XemRubric } from './XemRubric';
export { default as NoiDungRubric } from './NoiDungRubric';
export { default as ChiTietNutRubric } from './ChiTietNutRubric';
export { default as BangChamRubric } from './BangChamRubric';
export type { BangChamRubricRef, GhiLaRubric } from './BangChamRubric';
export { default as ManChamRubric } from './ManChamRubric';
export type { ManChamRubricProps } from './ManChamRubric';
export { inHuongDanCham, taiWordHuongDanCham } from './xuatHuongDanCham';
