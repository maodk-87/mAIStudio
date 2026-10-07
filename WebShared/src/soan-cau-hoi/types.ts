/**
 * Kiểu dữ liệu tối thiểu mà màn soạn câu hỏi cần. DTO đầy đủ của từng hệ (KTĐG/NHCH/DVCC) chỉ cần
 * ánh xạ sang/từ các kiểu này trong `nguon` của web (services/soan-cau-hoi) — hợp đồng API docs/apis/03.
 */
import type { BanDocDeBai } from '../ban-doc-de-bai';
import type { CayRubric } from '../rubric/types';
import type { CapDoTuDuy, CheDoDaoCauHoi, LoaiCauHoi, TrangThaiNoiDung } from './hang';

export type KieuHienThiCauHoi = 'tren-duoi' | 'trai-40' | 'trai-50' | 'trai-60';

export interface PhuongAnCauHoi {
  id: string;
  noiDung: string;
  dung: boolean;
}

/** Câu hỏi con của câu chùm — kèm phân loại riêng (tiểu mục · TPNL · CĐTD) */
export interface CauHoiConSoan {
  id: string;
  loaiCau: LoaiCauHoi;
  noiDung: string;
  phuongAn: PhuongAnCauHoi[];
  /** Đáp án dạng văn bản của câu con (trả lời ngắn, điền khuyết, "Đúng"/"Sai") — có khi import từ Word */
  dapAnGoiY?: string;
  tieuMucId?: string;
  tpnlId?: string;
  cdtd?: CapDoTuDuy;
}

/** Câu hỏi khi nạp để sửa */
export interface CauHoiSoan {
  id: string;
  loaiCau: LoaiCauHoi;
  noiDung: string;
  monHocId: string;
  khoiId: string;
  tieuMucId: string;
  cdtd: CapDoTuDuy;
  tpnlIds: string[];
  khoId?: string;
  diemGoiY: number;
  phuongAn: PhuongAnCauHoi[];
  dapAnGoiY?: string;
  rubric?: CayRubric;
  kieuHienThi?: KieuHienThiCauHoi;
  cheDoDao?: CheDoDaoCauHoi;
  banDocDeBai?: BanDocDeBai;
  nguLieu?: string;
  cauCon?: CauHoiConSoan[];
  /** Giá trị các trường riêng của hệ (khóa = `TruongMoRong.khoa`) */
  giaTriMoRong?: Record<string, string | undefined>;
}

/** Dữ liệu màn soạn gửi đi khi lưu (tạo mới / cập nhật) */
export interface DuLieuLuuCauHoi extends Omit<CauHoiSoan, 'id'> {
  tenChuDe: string;
  tenTieuMuc: string;
  trangThai: TrangThaiNoiDung;
  giaTriMoRong: Record<string, string | undefined>;
  /** Màn tạo câu: soạn hay import Word (web dùng để ghi nguồn tạo, gộp thông báo) */
  nguonTao?: 'soan' | 'import';
}

export interface MucDanhMuc {
  id: string;
  /** Mã danh mục (VD mã TPNL) — dùng đối chiếu mã phân loại khi import/dán từ Word */
  ma?: string;
  ten: string;
}

/** Nút cây Chủ đề → Tiểu mục (2 tầng) */
export interface NutChuDe {
  id: string;
  /** Mã chủ đề / mã tiểu mục — dùng đối chiếu mã phân loại khi import/dán từ Word */
  ma?: string;
  ten: string;
  /** TPNL gợi ý của tiểu mục */
  tpnlIds: string[];
  soCauHoi: number;
  con?: NutChuDe[];
}

export interface KhoCauHoiChon {
  id: string;
  ten: string;
  moTa?: string;
  /** Kho gắn một môn (không có = kho dùng chung) */
  monHocId?: string;
  /** Kho hệ thống "Chưa phân kho" của tầng — kho mặc định khi nhập câu hỏi từ Word */
  laChuaPhanKho?: boolean;
}

/** Câu hỏi ở các màn quản lý (chi tiết, duyệt) — thêm thông tin vòng đời + thống kê */
export interface CauHoiQuanLy extends CauHoiSoan {
  ma: string;
  tenChuDe: string;
  tenTieuMuc: string;
  /** Trạng thái nội dung (giá trị TrangThaiNoiDung; web có thể mở rộng) */
  trangThai: string;
  nguon: string;
  nguoiSoan: string;
  /** yyyy-mm-dd */
  ngayTao: string;
  phienBan: number;
  soLanDung: number;
  /** Độ khó thực nghiệm (p-value) — có khi đủ dữ liệu bài làm */
  doKho?: number;
  /** Độ phân biệt thực nghiệm (point-biserial) — có khi đủ dữ liệu bài làm */
  doPhanBiet?: number;
  /** Số lượt làm dùng để tính chỉ số CTT */
  soLuotLam?: number;
  daHieuChuan?: boolean;
  nhanXetDuyet?: string;
  /** Câu nhóm Thi (hệ NHCH/DVCC) — khi duyệt ẩn nội dung, mở xem có ghi vết */
  laCauThi?: boolean;
  /** Vòng duyệt hiện tại do máy chủ trả (0 = Phản biện 1, 1 = Phản biện 2, 2 = Phê duyệt) — thiếu thì suy từ id */
  vongDuyet?: number;
}

/** Đề đã dùng câu hỏi (tab "Đề đã sử dụng") */
export interface DeDaDungCauHoi {
  id: string;
  ma: string;
  ten: string;
  trangThai: string;
  nguoiTao: string;
  ngayTao: string;
  noiDaSuDung: string[];
}
