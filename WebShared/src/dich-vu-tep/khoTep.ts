/**
 * MOCK — kho tệp in-memory giả lập Dịch vụ Tệp dùng chung (docs/11-trinh-xem-tai-lieu.md mục 4).
 * Mỗi web (SPA riêng) có kho riêng trong phiên; khi có BE thay bằng API thật.
 * Mỗi bản ghi giữ nội dung gốc (Blob) và mốc thời điểm "máy chủ chuyển đổi xong".
 * Mất khi tải lại trang (như mọi mock khác) — nơi hiển thị có fallback data URL.
 */

/** Trạng thái chuẩn bị bản xem (đúng hợp đồng API docs/11 mục 4.2) */
export type TrangThaiChuyenDoi = 'dang-chuyen-doi' | 'san-sang' | 'loi';

/**
 * Định dạng bản xem máy chủ trả về:
 * - 'goc'  : giai đoạn mock — FE tự hiển thị từ tệp gốc (docx/pptx render trên trình duyệt);
 * - 'pdf'  : giai đoạn P2 — máy chủ đã chuyển sang PDF bằng LibreOffice headless.
 */
export type DinhDangBanXem = 'goc' | 'pdf';

export interface BanGhiTep {
  maTep: string;
  ten: string;
  mime: string;
  kichThuoc: number;
  noiDung: Blob;
  /** Thời điểm (ms) máy chủ giả lập chuyển đổi xong */
  sanSangLuc: number;
  /** Có lỗi thì tệp chỉ cho tải về, không có bản xem */
  thongBaoLoi?: string;
  dinhDangBanXem: DinhDangBanXem;
  taoLuc: string;
}

export const khoTep = new Map<string, BanGhiTep>();
