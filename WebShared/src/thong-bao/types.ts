/** Kiểu dữ liệu thông báo cá nhân — khớp `/api/v1/nen-tang/thong-bao` (apis/02 §3) */

export type LoaiThongBao =
  | 'duyet'
  | 'chia-se'
  | 'lich-thi'
  | 'ket-qua'
  | 'bao-mat'
  | 'license'
  | 'he-thong'
  | 'nhac-viec'
  | 'canh-bao'
  | 'phan-cong';

export interface ThongBao {
  id: string;
  tieuDe: string;
  noiDung: string;
  loai: LoaiThongBao;
  daDoc: boolean;
  /** ISO có offset */
  thoiGian: string;
  lienKet?: string;
}

export interface BoLocThongBao {
  daDoc?: boolean;
  loai?: LoaiThongBao;
  trang?: number;
  soBanGhi?: number;
}

/** Trạng thái kênh cập nhật của chuông: realtime qua hub, hoặc hỏi định kỳ khi hub lỗi */
export type KenhThongBao = 'realtime' | 'polling';
