/**
 * DANH MỤC TRƯỜNG TRỘN của tệp Word mẫu (mẫu đề kiểm tra / mẫu đề thi — YC-MD-01 mục 5, YC-MD-06).
 * Người quản lý gõ `{{MA_TRUONG}}` vào tệp Word mẫu; khi xuất đề, hệ thống thay bằng dữ liệu thật của đề.
 * - Trường `noi-tuyen`: thay bằng chữ ngay tại chỗ, giữ định dạng (phông, cỡ, đậm…) của chữ `{{…}}` trong Word.
 * - Trường `khoi`: phải đứng RIÊNG một đoạn (Enter trước và sau) — cả đoạn được thay bằng nhiều đoạn/bảng.
 * - Trường `dieu-kien`: cặp đoạn riêng `{{#MA}}` … `{{/MA}}` — giữ phần giữa khi điều kiện đúng, bỏ cả vùng khi sai
 *   (VD trang "Đáp án" chỉ in khi xuất kèm đáp án). Hai đoạn mở/đóng phải cùng cấp (không cắt ngang bảng).
 * Hợp đồng này dùng chung frontend (xem trước, giả lập) và backend (xuất đề thật) — docs/apis/03 §2a.
 */

export type KieuTruongTron = 'noi-tuyen' | 'khoi' | 'dieu-kien';

export interface TruongTron {
  /** Mã trường — viết HOA, không dấu, nối "_" (gõ trong Word: {{MA}}) */
  ma: string;
  nhan: string;
  moTa: string;
  /** Giá trị ví dụ (dữ liệu giả lập) */
  viDu: string;
  nhom: string;
  kieu: KieuTruongTron;
}

export const NHOM_TRUONG_TRON = ['Đơn vị & kỳ kiểm tra', 'Môn học & đề', 'Thí sinh', 'Xuất tệp', 'Khối nội dung', 'Vùng điều kiện'] as const;

export const NHAN_KIEU_TRUONG: Record<KieuTruongTron, string> = {
  'noi-tuyen': 'Chữ tại chỗ',
  khoi: 'Khối — đứng riêng 1 đoạn',
  'dieu-kien': 'Vùng — cặp đoạn mở/đóng',
};

export const DANH_MUC_TRUONG_TRON: TruongTron[] = [
  // ——— Đơn vị & kỳ kiểm tra ———
  { ma: 'DON_VI_CAP_TREN', nhan: 'Đơn vị cấp trên', moTa: 'Tên đơn vị chủ quản của đơn vị ra đề', viDu: 'SỞ GD&ĐT HÀ NỘI', nhom: 'Đơn vị & kỳ kiểm tra', kieu: 'noi-tuyen' },
  { ma: 'TEN_DON_VI', nhan: 'Đơn vị ra đề', moTa: 'Tên đơn vị (trường/phòng/sở) sở hữu đề', viDu: 'TRƯỜNG THCS NGUYỄN KHUYẾN', nhom: 'Đơn vị & kỳ kiểm tra', kieu: 'noi-tuyen' },
  { ma: 'TIEU_DE_DE', nhan: 'Tiêu đề đề', moTa: 'Dòng tiêu đề lớn của đề', viDu: 'ĐỀ KIỂM TRA GIỮA HỌC KỲ I', nhom: 'Đơn vị & kỳ kiểm tra', kieu: 'noi-tuyen' },
  { ma: 'TEN_KY', nhan: 'Kỳ / đợt kiểm tra', moTa: 'Tên kỳ, đợt hoặc bài kiểm tra dùng đề', viDu: 'Kiểm tra giữa học kỳ I', nhom: 'Đơn vị & kỳ kiểm tra', kieu: 'noi-tuyen' },
  { ma: 'NAM_HOC', nhan: 'Năm học', moTa: 'Năm học của kỳ kiểm tra', viDu: '2026 – 2027', nhom: 'Đơn vị & kỳ kiểm tra', kieu: 'noi-tuyen' },
  { ma: 'LOAI_BAN', nhan: 'Loại bản đề', moTa: 'ĐỀ CHÍNH THỨC / ĐỀ DỰ PHÒNG / ĐỀ THAM KHẢO', viDu: 'ĐỀ CHÍNH THỨC', nhom: 'Đơn vị & kỳ kiểm tra', kieu: 'noi-tuyen' },
  // ——— Môn học & đề ———
  { ma: 'MON_HOC', nhan: 'Môn học', moTa: 'Tên môn của đề', viDu: 'Toán', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'KHOI', nhan: 'Khối', moTa: 'Khối lớp của đề', viDu: 'Khối 8', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'THOI_GIAN', nhan: 'Thời gian làm bài', moTa: 'Số phút làm bài (chỉ con số)', viDu: '45', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'MA_DE', nhan: 'Mã đề', moTa: 'Mã đề hoán vị; đề gốc để trống', viDu: '101', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'TEN_DE', nhan: 'Tên đề', moTa: 'Tên đề trong kho đề', viDu: 'Đề KT giữa kỳ I Toán 8 — số 1', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'SO_CAU', nhan: 'Tổng số câu', moTa: 'Số câu hỏi của đề', viDu: '22', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'TONG_DIEM', nhan: 'Tổng điểm', moTa: 'Thang điểm của đề', viDu: '10', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'SO_TRANG', nhan: 'Số trang', moTa: 'Ghi chú số trang (Word tự đếm khi mở tệp)', viDu: '(Đề có 03 trang)', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'TEN_MAU_DE', nhan: 'Tên mẫu đề', moTa: 'Tên mẫu đề đang dùng', viDu: 'Mẫu 2 phần — Trắc nghiệm + Tự luận (7/3)', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  { ma: 'MUC_DICH', nhan: 'Mục đích', moTa: 'Mục đích sử dụng của mẫu đề', viDu: 'Kiểm tra định kỳ', nhom: 'Môn học & đề', kieu: 'noi-tuyen' },
  // ——— Thí sinh (đề giấy phát theo danh sách; xuất đề chung → dòng chấm để thí sinh tự ghi) ———
  { ma: 'HO_TEN_THI_SINH', nhan: 'Họ tên thí sinh', moTa: 'Xuất đề chung: dòng chấm để ghi tay', viDu: '……………………………………', nhom: 'Thí sinh', kieu: 'noi-tuyen' },
  { ma: 'SO_BAO_DANH', nhan: 'Số báo danh', moTa: 'Xuất đề chung: dòng chấm để ghi tay', viDu: '………………', nhom: 'Thí sinh', kieu: 'noi-tuyen' },
  { ma: 'LOP', nhan: 'Lớp', moTa: 'Xuất đề chung: dòng chấm để ghi tay', viDu: '…………', nhom: 'Thí sinh', kieu: 'noi-tuyen' },
  { ma: 'PHONG_THI', nhan: 'Phòng thi', moTa: 'Xuất đề chung: dòng chấm để ghi tay', viDu: '…………', nhom: 'Thí sinh', kieu: 'noi-tuyen' },
  // ——— Xuất tệp ———
  { ma: 'NGAY_XUAT', nhan: 'Ngày xuất', moTa: 'Ngày xuất tệp (dd/MM/yyyy)', viDu: '30/09/2026', nhom: 'Xuất tệp', kieu: 'noi-tuyen' },
  { ma: 'NGUOI_XUAT', nhan: 'Người xuất', moTa: 'Họ tên người xuất tệp', viDu: 'Nguyễn Văn An', nhom: 'Xuất tệp', kieu: 'noi-tuyen' },
  { ma: 'MA_THEO_DOI', nhan: 'Mã theo dõi', moTa: 'Mã theo dõi lượt xuất (tra ngược khi tệp bị lộ)', viDu: 'KTS-7F3A-21C9', nhom: 'Xuất tệp', kieu: 'noi-tuyen' },
  // ——— Khối nội dung (đứng riêng một đoạn) ———
  {
    ma: 'NOI_DUNG_DE',
    nhan: 'Nội dung đề',
    moTa: 'Toàn bộ các phần, câu hỏi, phương án (tự xếp 4/2/1 cột), dòng "HẾT" và ghi chú cuối đề. BẮT BUỘC có trong mẫu',
    viDu: 'PHẦN I. TRẮC NGHIỆM … Câu 1. … A. … B. …',
    nhom: 'Khối nội dung',
    kieu: 'khoi',
  },
  {
    ma: 'DAP_AN',
    nhan: 'Đáp án & hướng dẫn chấm',
    moTa: 'Bảng Câu – Đáp án/Hướng dẫn chấm – Điểm và tổng điểm; chỉ in khi xuất "kèm đáp án", ngược lại cả đoạn bị bỏ',
    viDu: 'Bảng đáp án',
    nhom: 'Khối nội dung',
    kieu: 'khoi',
  },
  // ——— Vùng điều kiện ———
  {
    ma: 'KEM_DAP_AN',
    nhan: 'Chỉ in khi kèm đáp án',
    moTa: 'Vùng giữa {{#KEM_DAP_AN}} và {{/KEM_DAP_AN}} (VD ngắt trang + tiêu đề "ĐÁP ÁN" + {{DAP_AN}}) chỉ giữ lại khi xuất kèm đáp án',
    viDu: 'Trang đáp án',
    nhom: 'Vùng điều kiện',
    kieu: 'dieu-kien',
  },
  {
    ma: 'CO_MA_DE',
    nhan: 'Chỉ in khi có mã đề',
    moTa: 'Vùng chỉ giữ lại khi xuất đề hoán vị (có mã đề); đề gốc bỏ vùng này',
    viDu: 'Dòng "Mã đề: 101"',
    nhom: 'Vùng điều kiện',
    kieu: 'dieu-kien',
  },
];

export const MA_TRUONG_BAT_BUOC = ['NOI_DUNG_DE'];

const THEO_MA = new Map(DANH_MUC_TRUONG_TRON.map((t) => [t.ma, t]));
export const timTruongTron = (ma: string) => THEO_MA.get(ma);

/** Cú pháp trường trộn: {{MA}} (cho phép khoảng trắng trong ngoặc) */
export const MAU_TRUONG_TRON = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
/** Đoạn mở/đóng vùng điều kiện: {{#MA}} / {{/MA}} */
export const MAU_DIEU_KIEN = /\{\{\s*([#/])\s*([A-Za-z0-9_]+)\s*\}\}/g;
export const cuPhapTruong = (ma: string) => {
  const t = timTruongTron(ma);
  return t?.kieu === 'dieu-kien' ? `{{#${ma}}} … {{/${ma}}}` : `{{${ma}}}`;
};
