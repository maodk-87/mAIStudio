/**
 * Bản đọc đề bài (audio .mp3) — chỉ áp dụng câu hỏi Khối 1, 2, 3 (HS chưa đọc thạo).
 * Câu có bản đọc KHÔNG được đảo đáp án (lời đọc gắn thứ tự A/B/C/D cố định).
 */

/** Bản đọc gắn với câu hỏi — maTep theo Dịch vụ Tệp; duongDan để phát (mock: data URL) */
export interface BanDocDeBai {
  maTep: string;
  ten: string;
  kichThuoc: number;
  duongDan: string;
}

/** Các khối được đính kèm bản đọc đề bài */
export const KHOI_CO_BAN_DOC = ['khoi-1', 'khoi-2', 'khoi-3'];

export const laKhoiCoBanDoc = (khoiId?: string) => !!khoiId && KHOI_CO_BAN_DOC.includes(khoiId);

export const GIOI_HAN_BAN_DOC_MB = 10;

/** Chế độ đảo có đảo đáp án → chế độ tương ứng bỏ phần đảo đáp án (giá trị CheDoDaoCauHoi) */
const BO_DAO_DAP_AN: Record<string, string> = {
  'dao-lenh-hoi-va-dap-an': 'chi-dao-lenh-hoi',
  'chi-dao-dap-an': 'khong-dao',
};

/** Chế độ đảo này có đảo đáp án không */
export const coDaoDapAn = (cheDo: string) => cheDo in BO_DAO_DAP_AN;

/** Bỏ phần đảo đáp án khỏi chế độ đảo (giữ nguyên nếu vốn không đảo đáp án) */
export const boDaoDapAn = <T extends string>(cheDo: T): T => (BO_DAO_DAP_AN[cheDo] ?? cheDo) as T;
