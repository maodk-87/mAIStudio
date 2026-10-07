/**
 * Nhật ký xuất / in / tải tệp (MOCK phía trình duyệt, cùng origin nên 6 web dùng chung một nhật ký).
 * Backend thật: POST /api/xuat-tep/nhat-ky (docs/apis/23-xuat-in-tai-tep.md) — mọi lượt xuất dữ liệu nhạy cảm
 * (đề thi, bảng điểm, danh sách tài khoản, nhật ký hệ thống) phải ghi vết; đề thi kèm watermark mã theo dõi.
 */
import { thoiDiemHienThi } from './taiTep';

export type DinhDangXuat = 'xlsx' | 'docx' | 'pdf' | 'csv' | 'in' | 'zip' | 'json' | 'txt';
export type LoaiThaoTacTep = 'xuat' | 'in' | 'tai-mau' | 'tai-loi' | 'tai-ve';

export interface BanGhiXuat {
  id: string;
  /** Mã theo dõi in trên watermark / chân trang — tra ngược ai xuất, lúc nào */
  maTheoDoi: string;
  thoiDiem: string;
  nguoi: string;
  /** Hệ thống: ktdg | nhch | qlthi | csdl | admin | coreadmin */
  heThong?: string;
  loai: LoaiThaoTacTep;
  /** Đối tượng xuất: "Đề DT-001 · Toán 8", "Sổ điểm 8A1 · Toán · HK I"… */
  doiTuong: string;
  dinhDang: DinhDangXuat;
  soBanGhi?: number;
  /** Có dữ liệu nhạy cảm (đề thi, điểm, tài khoản…) */
  nhayCam?: boolean;
}

const KHOA = 'kts-nhat-ky-xuat';
const TOI_DA = 500;

export function layNhatKyXuat(): BanGhiXuat[] {
  try {
    return JSON.parse(localStorage.getItem(KHOA) ?? '[]') as BanGhiXuat[];
  } catch {
    return [];
  }
}

export function taoMaTheoDoi(): string {
  return `X${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

/** Ghi một lượt xuất; trả về bản ghi (có mã theo dõi để in lên watermark) */
export function ghiNhatKyXuat(b: Omit<BanGhiXuat, 'id' | 'maTheoDoi' | 'thoiDiem'> & { maTheoDoi?: string }): BanGhiXuat {
  const banGhi: BanGhiXuat = { ...b, id: taoMaTheoDoi(), maTheoDoi: b.maTheoDoi ?? taoMaTheoDoi(), thoiDiem: thoiDiemHienThi() };
  try {
    localStorage.setItem(KHOA, JSON.stringify([banGhi, ...layNhatKyXuat()].slice(0, TOI_DA)));
  } catch {
    /* bộ nhớ trình duyệt đầy — bỏ qua, không chặn việc xuất */
  }
  return banGhi;
}

/** Chuỗi watermark chuẩn: "Nguyễn Văn A · 28/09/2026 08:15 · Mã X1AB2C3D" */
export const chuoiWatermark = (nguoi: string, maTheoDoi: string) => `${nguoi} · ${thoiDiemHienThi()} · Mã ${maTheoDoi}`;
