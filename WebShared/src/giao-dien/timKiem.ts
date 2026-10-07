/** Tìm kiếm tiếng Việt không dấu — dùng chung cho Select/TreeSelect (DS-C6) */

/** Chuẩn hóa tiếng Việt về không dấu, chữ thường — dùng cho tìm kiếm/so trùng */
export function chuanHoaKhongDau(chuoi: string): string {
  return (chuoi || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** So khớp tìm kiếm không dấu, không phân biệt hoa thường (filterOption cho Select) */
export function khopTimKiem(tuKhoa: string, noiDung: string): boolean {
  return chuanHoaKhongDau(noiDung).includes(chuanHoaKhongDau(tuKhoa));
}
