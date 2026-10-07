/**
 * Kiểu dữ liệu RUBRIC CHẤM TỰ LUẬN (SRS "Quy tắc rubric chấm tự luận" — docs/apis/19-rubric-cham-tu-luan.md).
 * Rubric là cây nhiều cấp; chỉ nút lá mang điểm, điểm nút cha luôn được tính (không nhập).
 * Điểm trên đường truyền là số thập phân (dấu chấm); mọi phép tính dùng số nguyên đơn vị 0,01 (utils/rubric).
 */

/** Loại nút — ánh xạ SRS: nhom=group · phuong-an=alternative · tieu-chi=criterion · tieu-chi-muc=level_criterion · diem-tru=deduction */
export type LoaiNutRubric = 'nhom' | 'phuong-an' | 'tieu-chi' | 'tieu-chi-muc' | 'diem-tru';

/** Mức của Tiêu chí theo mức (VD Tốt / Khá / Đạt / Chưa đạt) */
export interface MucTieuChi {
  khoaMuc: string;
  nhan: string;
  moTa: string;
  diem: number;
}

export interface NutRubric {
  /** Khóa bất biến qua các phiên bản (node_key) — dùng so khác biệt & chuyển phiếu giữa phiên bản */
  khoaNut: string;
  /** null = gốc (chính là câu hỏi) */
  khoaCha: string | null;
  thuTu: number;
  loai: LoaiNutRubric;
  /** Mã hiển thị tự sinh theo vị trí (3, 3.a, 3.a.1), cho sửa */
  maHienThi: string;
  /** Mô tả tiêu chí — bắt buộc, ≤ 1.000 ký tự */
  moTa: string;
  /** Đáp án mẫu / hướng dẫn chấm (HTML, có công thức) */
  dapAnMau?: string;
  /** Tiêu chí: điểm tối đa · Điểm trừ: mức trừ tối đa. Nút khác: không dùng (hệ thống tính) */
  diemToiDa?: number;
  /** Bước điểm của lá (mặc định theo cấu hình tổ, 0,25) */
  buocDiem?: number;
  /** Nhánh "Cách khác" của Phương án thay thế (tối đa 1 nhánh) */
  laNhanhMo?: boolean;
  /** Các mức của Tiêu chí theo mức */
  muc?: MucTieuChi[];
  /** Nhãn — bỏ trống = kế thừa từ cha */
  donViKienThucId?: string;
  yeuCauCanDatId?: string;
  mucDoNhanThuc?: string;
}

export interface CayRubric {
  nut: NutRubric[];
}

/** Giá trị một lá trong phiếu chấm: null = chưa chấm (khác 0) */
export interface GiaTriLaRubric {
  giaTri: number | null;
  /** Mức đã chọn (Tiêu chí theo mức) */
  khoaMuc?: string;
  ghiChu?: string;
}

/** Phần nhập liệu của phiếu chấm — dùng chung cho tính điểm */
export interface DuLieuChamRubric {
  giaTri: Record<string, GiaTriLaRubric>;
  /** khoaNut của Phương án thay thế → khoaNut nhánh được chọn */
  nhanhChon: Record<string, string>;
}

export type CheDoRubric = 'dgdk' | 'dgtx';

export type MucDoVanDe = 'loi' | 'canh-bao';

/** Kết quả kiểm tra hợp lệ (VR-01 … VR-13) gắn theo nút */
export interface VanDeRubric {
  ma: string;
  mucDo: MucDoVanDe;
  khoaNut?: string;
  thongBao: string;
}

/** Cấu hình làm tròn tổng bài theo cấp học (FR-RB-011, 012) */
export interface CauHinhLamTron {
  soChuSoThapPhan: 0 | 1 | 2;
  cachLamTron: 'nua-len' | 'nua-chan' | 'lam-tron-xuong';
  diemToiThieu: number;
}

/** Mã lỗi server khi ghi điểm lá (FR-RB-002, 006, 037) */
export type MaLoiRubric =
  | 'SCORE_OFF_STEP'
  | 'SCORE_OUT_OF_RANGE'
  | 'SCORE_ON_INACTIVE_BRANCH'
  | 'RUBRIC_FROZEN'
  | 'SHEET_INCOMPLETE';
