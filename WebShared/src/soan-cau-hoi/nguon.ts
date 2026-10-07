/**
 * Hợp đồng giữa màn soạn câu hỏi (package) và web chủ quản — theo mẫu `rubric/nguon.ts`:
 * package không gọi API, không đọc store; mỗi web cài `nguon` + `cauHinh` trong services/soan-cau-hoi.
 * Phương án: docs/task/phuong-an-soan-cau-hoi-web-shared.md mục 3.
 */
import type { ComponentType, ReactNode } from 'react';
import type { LuaChon } from '../giao-dien/FormSelect';
import type { NguonSoanRubric } from '../rubric/nguon';
import type { LoaiCauHoi } from './hang';
import type {
  CauHoiQuanLy,
  CauHoiSoan,
  DeDaDungCauHoi,
  DuLieuLuuCauHoi,
  KhoCauHoiChon,
  MucDanhMuc,
  NutChuDe,
} from './types';

/** Kết quả lưu một câu */
export interface KetQuaLuuCauHoi {
  id: string;
  ghiChu?: string;
}

/** Nguồn dữ liệu do web cung cấp */
export interface NguonSoanCauHoi {
  /** Môn được soạn (web tự lọc theo phạm vi phân công nếu có) */
  layDanhSachMonHoc: () => Promise<MucDanhMuc[]>;
  layDanhSachKhoi: () => Promise<MucDanhMuc[]>;
  layCayChuDe: (monHocId: string, khoiId: string) => Promise<NutChuDe[]>;
  layDanhSachTpnl: (monHocId: string) => Promise<MucDanhMuc[]>;
  /** Kho được ghi câu vào (tầng đang làm việc) */
  layDanhSachKho: () => Promise<KhoCauHoiChon[]>;
  layChiTiet: (id: string) => Promise<CauHoiSoan>;
  /** Trả id câu vừa tạo (+ ghi chú ngắn cho thông báo tổng hợp khi import, VD "được đề xuất vào nhóm câu neo") */
  tao: (duLieu: DuLieuLuuCauHoi) => Promise<KetQuaLuuCauHoi>;
  capNhat: (id: string, duLieu: DuLieuLuuCauHoi) => Promise<KetQuaLuuCauHoi>;
  /** Nhãn + mẫu rubric — chỉ dùng khi `cauHinh.coRubric` */
  nguonRubric?: NguonSoanRubric;
}

/** Phạm vi môn – khối được soạn (cấp Trường theo phân công — YC-NH-00b); không truyền = không giới hạn */
export interface PhamViSoan {
  monHopLe: (monHocId: string) => boolean;
  /** Môn chưa chọn → khối có trong phạm vi của bất kỳ môn nào */
  khoiHopLe: (monHocId: string | undefined, khoiId: string) => boolean;
}

/** Ngữ cảnh câu đang soạn — truyền cho trường riêng để lọc lựa chọn / kiểm tra */
export interface NguCanhTruongMoRong {
  /** id câu đang sửa (không có = tạo mới) */
  idDangSua?: string;
  loaiCau: LoaiCauHoi;
  monHocId?: string;
  khoiId?: string;
  /** Giá trị của trường khi nạp câu để sửa (VD nhóm câu neo đang gắn) */
  giaTriGoc?: string;
}

/**
 * Trường riêng của hệ, vẽ trong box "Thiết lập câu hỏi" sau ô Kho, theo thứ tự khai báo
 * (VD Mục đích sử dụng, Loại hình thi, Nhóm câu neo KTĐG).
 */
export interface TruongMoRong {
  /** Khóa trong `giaTriMoRong` (VD 'mucDichSuDungId', 'loaiHinhThiId', 'nhomCauNeoId') */
  khoa: string;
  nhan: string;
  /** Tooltip ⓘ cạnh nhãn */
  goiY?: string;
  batBuoc?: boolean;
  placeholder?: string;
  /** Lựa chọn — nạp lại khi đổi Môn/Khối */
  luaChon: (nguCanh: NguCanhTruongMoRong) => Promise<LuaChon[]> | LuaChon[];
  /** Cần chọn Môn trước (ô khóa khi chưa có Môn) */
  canMon?: boolean;
  /** Lý do CHẶN lưu theo giá trị đang chọn (hiện đỏ dưới ô; lưu bị chặn khi còn lý do) */
  kiemTra?: (giaTri: string | undefined, nguCanh: NguCanhTruongMoRong) => string[];
  /** Ghi chú/cảnh báo dưới ô theo giá trị đang chọn (VD nhóm Thi → mã hóa + ghi vết) */
  ghiChu?: (giaTri: string | undefined) => ReactNode;
  /** Giá trị mặc định cho câu mới bóc tách khi import Word (VD loại hình "Kiểm tra đánh giá định kỳ") */
  macDinh?: string;
  /** Thẻ hiện cạnh câu trong danh sách soát của màn import (VD "Neo · tên nhóm") */
  theDanhSach?: (giaTri: string) => ReactNode;
}

export interface CauHinhSoanCauHoi {
  /** Khóa localStorage nhớ Môn–Khối–Kho lần soạn trước — tách theo hệ */
  khoaNguCanh: string;
  phamVi?: PhamViSoan | null;
  /** false (ĐGTX không gian Giảng dạy): footer "Lưu" → trạng thái dùng được ngay, không có "Gửi duyệt" */
  coPheDuyet?: boolean;
  /** true: ẩn "Lưu & soạn tiếp" (VD sửa câu trong đề — soạn tiếp sẽ tạo câu mới trong ngân hàng) */
  anLuuSoanTiep?: boolean;
  /** Có trình soạn rubric dạng cây cho câu tự luận (bắt buộc rubric khi gửi duyệt/lưu dùng ngay) */
  coRubric?: boolean;
  /** Chọn sẵn kho (mở từ trang Chi tiết kho) */
  khoMacDinh?: string;
  truongMoRong?: TruongMoRong[];
}

/** Nguồn dữ liệu các màn quản lý câu hỏi (chi tiết, duyệt) — web cài trong services/soan-cau-hoi */
export interface NguonQuanLyCauHoi {
  layDanhSachMonHoc: () => Promise<MucDanhMuc[]>;
  layDanhSachKhoi: () => Promise<MucDanhMuc[]>;
  /** Mọi TPNL (để hiện tên) */
  layDanhSachTpnl: () => Promise<MucDanhMuc[]>;
  layDanhSachKho: () => Promise<KhoCauHoiChon[]>;
  layChiTiet: (id: string) => Promise<CauHoiQuanLy>;
  layDeDaSuDung: (id: string) => Promise<DeDaDungCauHoi[]>;
  /** Hàng chờ duyệt (lọc theo môn khi người duyệt được phân công theo môn) */
  layHangChoDuyet: (monHocId?: string) => Promise<CauHoiQuanLy[]>;
  duyet: (id: string) => Promise<unknown>;
  tuChoi: (id: string, nhanXet: string) => Promise<unknown>;
  yeuCauSua: (id: string, nhanXet: string) => Promise<unknown>;
  nhanBan: (id: string) => Promise<unknown>;
  ngungSuDung: (id: string) => Promise<CauHoiQuanLy>;
  xoa: (id: string) => Promise<unknown>;
  /** Ghi vết mở xem nội dung câu nhóm Thi (NHCH/DVCC) */
  ghiVetMoXem?: (id: string) => void;
  /**
   * Mở xem nội dung câu nhóm Thi qua máy chủ (VD NHCH: Passcode → quyền xem 30'): trả câu ĐẦY ĐỦ nội dung để thay vào
   * hàng chờ; `null` = người dùng hủy. Có hàm này thì dùng thay cho `ghiVetMoXem`.
   */
  moXemNoiDung?: (id: string) => Promise<CauHoiQuanLy | null>;
  /** Lịch sử thao tác trên câu (tạo, gửi duyệt, yêu cầu sửa, duyệt…) — panel "Lịch sử" khi duyệt. Không có → chỉ hiện dữ kiện của câu */
  layLichSuThaoTac?: (id: string) => Promise<LichSuThaoTacCau[]>;
}

/** Một dòng lịch sử thao tác trên câu hỏi */
export interface LichSuThaoTacCau {
  thoiGian: string;
  nguoi: string;
  hanhDong: string;
  lyDo?: string;
  soPhienBan?: number;
}

/** Thành phần giao diện riêng của web (nhãn trạng thái/nguồn có bộ giá trị theo hệ) */
export interface ThanhPhanWebCauHoi {
  BadgeTrangThai: ComponentType<{ trangThai: string }>;
  /** Nhãn trạng thái của một câu (web có thể đổi nhãn theo câu — VD câu kho riêng GV: "Hoàn thành") */
  BadgeTrangThaiCau: ComponentType<{ cau: CauHoiQuanLy }>;
  BadgeNguon: ComponentType<{ nguon: string }>;
}

/** Trường riêng của hệ hiện ở phần phân loại của chi tiết câu (VD Mục đích sử dụng, Loại hình thi) */
export interface TruongHienThi {
  khoa: string;
  nhan: string;
  /** Danh sách id → tên */
  layTen: () => Promise<LuaChon[]>;
}
