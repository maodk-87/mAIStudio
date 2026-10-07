/**
 * Xuất hướng dẫn chấm (FR-RB-027): PDF qua hộp thoại in của trình duyệt (khung in ẩn, công thức KaTeX),
 * Word qua tệp .docx THẬT (bảng + công thức → phương trình Word) — dùng thư viện @web-shared/xuat-tep.
 */
import type { CayRubric } from './types';
import { xuatHuongDanChamHtml } from './tinhToan';

/** Mở hộp thoại in (chọn "Lưu dưới dạng PDF" để lưu tệp) — trả true để giữ tương thích nơi gọi */
export function inHuongDanCham(cay: CayRubric, tieuDe: string): boolean {
  void import('../xuat-tep').then(({ inTaiLieu }) =>
    inTaiLieu(xuatHuongDanChamHtml(cay, tieuDe), { tieuDe: `Hướng dẫn chấm - ${tieuDe}` }),
  );
  return true;
}

/** Tải hướng dẫn chấm dạng Word (.docx) */
export async function taiWordHuongDanCham(cay: CayRubric, tieuDe: string): Promise<void> {
  const { xuatWord } = await import('../xuat-tep');
  await xuatWord(`Hướng dẫn chấm - ${tieuDe}`, [{ loai: 'html', html: xuatHuongDanChamHtml(cay, tieuDe) }], {
    tieuDe: `Hướng dẫn chấm - ${tieuDe}`,
  });
}
