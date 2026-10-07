/**
 * Nguồn phiên của lõi LMS — mỗi web đăng ký một lần ở `index.tsx`:
 * - LMS.Web: phiên (`GET /lms/phien/ngu-canh`) + vai trò đang chọn từ store của web;
 * - KTDG.Web (phân hệ Học sinh/Phụ huynh): ngữ cảnh LMS của người dùng đăng nhập ở cổng chung.
 * Lõi dùng nguồn này để gắn header `X-Vai-Tro-Lms` (danh tính do backend lấy từ token).
 */
import type { PhienLms, VaiTroLms } from './types';

export interface PhienHienTai {
  phien: PhienLms;
  vaiTro: VaiTroLms;
}

let nguon: (() => PhienHienTai | null) | null = null;

export function datNguonPhienLms(fn: () => PhienHienTai | null) {
  nguon = fn;
}

export function layPhienHienTai(): PhienHienTai | null {
  return nguon?.() ?? null;
}

/** Quyền của vai trò đang chọn */
export function layQuyenHienTai(): string[] {
  const ht = layPhienHienTai();
  return ht ? (ht.phien.quyenTheoVaiTro[ht.vaiTro] ?? []) : [];
}
