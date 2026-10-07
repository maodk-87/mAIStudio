/**
 * Nguồn dữ liệu của component rubric — mỗi web tự cài (services/rubric của web đó) rồi truyền qua prop `nguon`.
 * Kiểu ở đây là tối thiểu mà component cần; DTO đầy đủ của từng hệ chỉ cần tương thích cấu trúc.
 * Hợp đồng API: docs/apis/19-rubric-cham-tu-luan.md.
 */
import type { CayRubric, DuLieuChamRubric } from './types';

// ————— Soạn rubric —————

export interface NhanRubricLuaChon {
  donViKienThuc: { id: string; ten: string; chuDe: string }[];
  yeuCauCanDat: { id: string; donViId: string; ten: string }[];
  mucDoNhanThuc: { id: string; ten: string }[];
}

export interface MauRubricLuaChon {
  id: string;
  ten: string;
  moTa?: string;
  diemMucTieu: number;
  cay: CayRubric;
  nguoiTao?: string;
}

export interface NguonSoanRubric {
  /** Nhãn gắn tiêu chí (đơn vị kiến thức = tiểu mục, YCCĐ, mức độ nhận thức) */
  layNhanRubric?: (monHocId?: string, khoiId?: string) => Promise<NhanRubricLuaChon>;
  /** Mẫu rubric đã phát hành dùng cho "Áp mẫu" — không có thì ẩn nút */
  layDanhSachMauRubric?: (loc: { monHocId?: string; chiDaPhatHanh?: boolean }) => Promise<MauRubricLuaChon[]>;
}

// ————— Chấm theo rubric —————

export const nhanLuotCham: Record<string, string> = {
  chinh: 'Chấm chính (vòng 1)',
  'vong-2': 'Chấm vòng 2',
  'kiem-tra-xac-suat': 'Chấm kiểm tra xác suất',
  'phuc-khao': 'Phúc khảo',
};

export interface PhieuChamRubricToiThieu {
  id: string;
  maPhach: string;
  luot: string;
  trangThai: 'dang-cham' | 'da-nop' | 'can-cham-lai' | 'huy';
  lyDoTrang?: 'BLANK';
  duLieu: DuLieuChamRubric;
  /** Khóa lạc quan (lock_version) — gửi kèm mỗi lần ghi */
  phienBanKhoa: number;
  laPhaiNhapLai?: string[];
}

export interface PhieuChamChiTietRubric {
  phieu: PhieuChamRubricToiThieu;
  cau: { id: string; maCau: string; noiDung: string };
  phienBan: { soPhienBan: number; cay: CayRubric };
  tong: number | null;
  conLai: number;
}

export interface BaiLamTheoPhach {
  kieu: 'anh-quet' | 'tren-may';
  anhQuet?: string;
  dong?: string[];
  soChu: number;
}

export interface ThayDoiLaRubric {
  khoaNut: string;
  giaTri?: number | null;
  khoaMuc?: string;
  ghiChu?: string;
}

export interface NguonChamRubric {
  layChiTietPhieu: (phieuId: string) => Promise<PhieuChamChiTietRubric>;
  ghiGiaTriPhieu: (phieuId: string, thayDoi: ThayDoiLaRubric[], phienBanKhoa: number) => Promise<PhieuChamChiTietRubric>;
  chonNhanhPhieu: (phieuId: string, khoaPhuongAn: string, khoaNhanh: string, phienBanKhoa: number) => Promise<PhieuChamChiTietRubric>;
  khongLamBaiPhieu: (phieuId: string, phienBanKhoa: number) => Promise<PhieuChamChiTietRubric>;
  nopPhieu: (phieuId: string) => Promise<unknown>;
  layBaiLamTheoPhach: (maPhach: string, cauId: string) => Promise<BaiLamTheoPhach>;
  /** Nhãn lượt chấm riêng của hệ (mặc định `nhanLuotCham`) */
  nhanLuot?: Record<string, string>;
}
