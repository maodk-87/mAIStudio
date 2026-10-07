/** Kiểu dữ liệu kênh giám sát realtime (hub `/hubs/giam-sat-ky-thi` QLTHI, `/hubs/giam-sat-thi` KTĐG) */

/** Trạng thái kênh cập nhật: đẩy qua hub, hoặc tự làm mới định kỳ khi hub lỗi / bị từ chối */
export type KenhCapNhat = 'realtime' | 'polling';

/** Payload chung mọi sự kiện giám sát server → client */
export interface SuKienGiamSat {
  loai: string;
  /** ISO có offset */
  luc: string;
  dotId?: string;
  diemThiId?: string;
  phongId?: string;
  maCa?: string;
  thiSinhId?: string;
  kyId?: string;
  caId?: string;
}

/** Lời gọi vào nhóm sau khi kết nối / nối lại (VD `ThamGia`, `ThamGiaCa`) */
export interface ThamGiaNhom {
  phuongThuc: string;
  thamSo: unknown;
}

export interface TuyChonKenhGiamSat {
  /** Đường dẫn hub, VD `/hubs/giam-sat-ky-thi` */
  duongDan: string;
  /** Tham số query ghép vào URL (WebSocket trình duyệt không gửi được header) — giá trị rỗng bị bỏ */
  query?: Record<string, string | null | undefined>;
  /** Vào nhóm sau khi kết nối; `null` = không cần vào nhóm */
  thamGia: ThamGiaNhom | null;
  /** Tên sự kiện server → client cần nghe */
  suKien: string[];
  /** Tải lại dữ liệu REST của màn (gọi sau sự kiện — đã gộp — và theo chu kỳ khi polling) */
  taiLai: () => void;
  /** Lọc sự kiện (VD bỏ sự kiện của ca khác); trả `false` để bỏ qua */
  boLoc?: (tenSuKien: string, suKien: SuKienGiamSat) => boolean;
  /** Nghe từng sự kiện (VD hiện toast vi phạm) — gọi trước khi gộp tải lại */
  khiCoSuKien?: (tenSuKien: string, suKien: SuKienGiamSat) => void;
  /** Chu kỳ tự làm mới khi rơi về polling (mặc định 5000 ms) */
  chuKyPollingMs?: number;
  /** Thời gian gộp các sự kiện liên tiếp thành một lần tải lại (mặc định 1000 ms) */
  choGopMs?: number;
  /** `false` = không tự làm mới định kỳ khi mất kênh trực tiếp (VD ca chưa thi) — vẫn giữ kết nối hub; mặc định `true` */
  tuLamMoiDuPhong?: boolean;
  /** `false` = tạm tắt cả kết nối lẫn polling (VD chưa chọn đợt / ca) — mặc định `true` */
  batDau?: boolean;
}
