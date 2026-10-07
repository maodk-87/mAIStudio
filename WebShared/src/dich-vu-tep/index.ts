/**
 * Service Dịch vụ Tệp (MOCK) — hợp đồng API theo docs/11-trinh-xem-tai-lieu.md mục 4.2:
 *
 * | Hàm              | API thật (khi có BE)          |
 * |------------------|-------------------------------|
 * | taiLenTep        | POST /api/tep (multipart)     |
 * | layThongTinTep   | GET  /api/tep/{maTep}         |
 * | layBanXemTep     | GET  /api/tep/{maTep}/xem     |
 * | layTepGoc        | GET  /api/tep/{maTep}/tai-ve  |
 *
 * Mock mô phỏng: kiểm tra kích thước/định dạng, chặn macro, định dạng Office cũ
 * cần máy chủ chuyển đổi, và độ trễ "máy chủ đang chuẩn bị bản xem" với tệp Office.
 * Khi có BE: thay thân hàm bằng axios; FE đọc `dinhDangBanXem` — 'pdf' thì
 * trình xem dùng thẳng trình xem PDF, 'goc' thì tự hiển thị docx/pptx.
 */
import {
  khoTep,
  type BanGhiTep,
  type DinhDangBanXem,
  type TrangThaiChuyenDoi,
} from './khoTep';

/** Mô phỏng độ trễ mạng (package dùng chung không phụ thuộc services/api.service của từng web) */
async function goiMock<T>(duLieu: () => T, ms: number): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  return duLieu();
}

const taoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type { DinhDangBanXem, TrangThaiChuyenDoi };

export interface ThongTinTep {
  maTep: string;
  ten: string;
  mime: string;
  kichThuoc: number;
  trangThai: TrangThaiChuyenDoi;
  thongBaoLoi?: string;
  dinhDangBanXem: DinhDangBanXem;
  taoLuc: string;
}

export const GIOI_HAN_TEP_MB = 25;

/** Thời gian máy chủ giả lập chuẩn bị bản xem cho tệp Office */
const THOI_GIAN_CHUYEN_DOI_MS = 1200;

const duoiTep = (ten: string) => (ten.split('.').pop() ?? '').toLowerCase();

const DUOI_OFFICE_MOI = new Set(['docx', 'pptx', 'xlsx']);
const DUOI_OFFICE_CU = new Set(['doc', 'ppt', 'xls']);
const DUOI_MACRO = new Set(['docm', 'xlsm', 'pptm', 'dotm', 'potm']);

const sangThongTin = (bg: BanGhiTep): ThongTinTep => ({
  maTep: bg.maTep,
  ten: bg.ten,
  mime: bg.mime,
  kichThuoc: bg.kichThuoc,
  trangThai: bg.thongBaoLoi ? 'loi' : Date.now() >= bg.sanSangLuc ? 'san-sang' : 'dang-chuyen-doi',
  thongBaoLoi: bg.thongBaoLoi,
  dinhDangBanXem: bg.dinhDangBanXem,
  taoLuc: bg.taoLuc,
});

const layBanGhi = (maTep: string): BanGhiTep => {
  const bg = khoTep.get(maTep);
  if (!bg) throw new Error(`Không tìm thấy tệp ${maTep}`);
  return bg;
};

/** POST /api/tep — tải tệp lên; tệp Office cần thời gian chuẩn bị bản xem */
export const taiLenTep = (noiDung: Blob, ten: string) =>
  goiMock(() => {
    if (noiDung.size > GIOI_HAN_TEP_MB * 1024 * 1024) {
      throw new Error(`Tệp vượt quá ${GIOI_HAN_TEP_MB}MB`);
    }
    const duoi = duoiTep(ten);
    let thongBaoLoi: string | undefined;
    if (DUOI_MACRO.has(duoi)) {
      thongBaoLoi = 'Tệp có chứa macro — vì an toàn hệ thống chỉ cho phép tải về, không mở xem trực tiếp.';
    } else if (DUOI_OFFICE_CU.has(duoi)) {
      thongBaoLoi =
        'Định dạng Office cũ (.doc/.ppt/.xls) cần máy chủ chuyển đổi để xem. Hãy tải về, hoặc lưu lại tệp dạng .docx/.pptx rồi chèn lại.';
    }
    const bg: BanGhiTep = {
      maTep: `tep-${taoId()}`,
      ten,
      mime: noiDung.type,
      kichThuoc: noiDung.size,
      noiDung,
      sanSangLuc: DUOI_OFFICE_MOI.has(duoi) ? Date.now() + THOI_GIAN_CHUYEN_DOI_MS : Date.now(),
      thongBaoLoi,
      dinhDangBanXem: 'goc',
      taoLuc: new Date().toISOString(),
    };
    khoTep.set(bg.maTep, bg);
    return sangThongTin(bg);
  }, 400);

/** GET /api/tep/{maTep} — metadata + trạng thái chuẩn bị bản xem (FE poll) */
export const layThongTinTep = (maTep: string) => goiMock(() => sangThongTin(layBanGhi(maTep)), 150);

/** GET /api/tep/{maTep}/xem — nội dung bản xem (mock: tệp gốc; P2: PDF đã chuyển đổi) */
export const layBanXemTep = (maTep: string) =>
  goiMock(() => {
    const bg = layBanGhi(maTep);
    const tt = sangThongTin(bg);
    if (tt.trangThai !== 'san-sang') throw new Error(tt.thongBaoLoi ?? 'Bản xem chưa sẵn sàng');
    return bg.noiDung;
  }, 200);

/** GET /api/tep/{maTep}/tai-ve — tệp gốc để tải về */
export const layTepGoc = (maTep: string) => goiMock(() => layBanGhi(maTep).noiDung, 150);
