/** Tải một Blob về máy người dùng + chuẩn hóa tên tệp (dùng chung cho mọi định dạng xuất) */

/** Bỏ ký tự không hợp lệ trên Windows/macOS, gộp khoảng trắng */
export function chuanHoaTenTep(ten: string): string {
  return ten.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'tep';
}

const hai = (n: number) => String(n).padStart(2, '0');

/** Dấu thời gian cho tên tệp: 20260928-0815 */
export function dauThoiGianTep(d = new Date()): string {
  return `${d.getFullYear()}${hai(d.getMonth() + 1)}${hai(d.getDate())}-${hai(d.getHours())}${hai(d.getMinutes())}`;
}

/** Thời điểm hiển thị: 28/09/2026 08:15 */
export function thoiDiemHienThi(d = new Date()): string {
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
}

/** Tên tệp có đuôi đúng + (tùy chọn) dấu thời gian: "So diem 8A1_20260928-0815.xlsx" */
export function tenTepXuat(ten: string, duoi: string, coThoiGian = true): string {
  const goc = chuanHoaTenTep(ten.replace(new RegExp(`\\.${duoi}$`, 'i'), ''));
  return `${goc}${coThoiGian ? `_${dauThoiGianTep()}` : ''}.${duoi}`;
}

/** Tải Blob về máy (thẻ <a download> tạm) */
export function taiTep(duLieu: Blob, tenTep: string): void {
  const url = URL.createObjectURL(duLieu);
  const a = document.createElement('a');
  a.href = url;
  a.download = chuanHoaTenTep(tenTep);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Tải một chuỗi văn bản (JSON, TXT…) */
export function taiVanBan(noiDung: string, tenTep: string, kieu = 'text/plain;charset=utf-8'): void {
  taiTep(new Blob([noiDung], { type: kieu }), tenTep);
}
