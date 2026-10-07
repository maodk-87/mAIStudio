/**
 * Sổ đăng ký định dạng câu hỏi — điểm mở rộng của oImportWord.
 * Các định dạng mặc định được đăng ký khi nạp plugin (index.ts); web có thể đăng ký
 * thêm định dạng riêng, hoặc ghi đè một định dạng mặc định bằng cùng `ma`.
 */
import type { DinhDangCauHoi, MaLoaiCau } from './kieu';

const soDangKy = new Map<string, DinhDangCauHoi>();

/**
 * Đăng ký một định dạng. Trùng `ma` → ghi đè (cho phép web tinh chỉnh định dạng mặc định).
 * @returns hàm hủy đăng ký
 */
export function dangKyDinhDang(dinhDang: DinhDangCauHoi): () => void {
  soDangKy.set(dinhDang.ma, dinhDang);
  return () => {
    if (soDangKy.get(dinhDang.ma) === dinhDang) soDangKy.delete(dinhDang.ma);
  };
}

export function huyDangKyDinhDang(ma: string): void {
  soDangKy.delete(ma);
}

export function layDinhDang(ma: string): DinhDangCauHoi | undefined {
  return soDangKy.get(ma);
}

/** Các định dạng đã đăng ký (tùy chọn lọc theo loại câu), sắp theo ưu tiên giảm dần */
export function danhSachDinhDang(loaiCau?: MaLoaiCau): DinhDangCauHoi[] {
  return Array.from(soDangKy.values())
    .filter((d) => !loaiCau || d.loaiCau.includes(loaiCau))
    .sort((a, b) => (b.uuTien ?? 0) - (a.uuTien ?? 0));
}
