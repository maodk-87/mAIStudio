/**
 * Ánh xạ MÃ PHÂN LOẠI đọc từ Word (`CauHoiBocTach.phanLoai` của oImportWord) sang id danh mục của Môn–Khối đang chọn:
 *  - Mẫu Khảo thí số: "CH-TN:0100.010010_VD_TC_1" = {mã loại}:{mã chủ đề}.{mã tiểu mục}_{CĐTD}_{TPNL}_{đảo};
 *  - Mẫu Thi TN THPT: dòng mã "6.14_2_1_1." (mỗi thành phần có thể là danh sách "+" theo thứ tự câu con/ý).
 * Mã KHÔNG có trong danh mục → trả lỗi theo từng trường để màn soát/màn soạn báo đỏ và người dùng chọn lại.
 * Dùng chung cho màn import (ImportWordCauHoi) và dán vào màn soạn (SoanCauHoi).
 */
import type { PhanLoaiBocTach, PhanLoaiTienTo } from '../oimportword';
import { CapDoTuDuy, CheDoDaoCauHoi } from './hang';
import type { MucDanhMuc, NutChuDe } from './types';

/** Tiền tố số của mẫu TN THPT ("1.1_2_3_1", `CauHoiBocTach.phanLoai`) → dạng mã để ánh xạ danh mục */
export function tuPhanLoaiTienTo(p: PhanLoaiTienTo): PhanLoaiBocTach {
  return {
    dongMa: p.maGoc,
    maChuDe: [String(p.chuDe)],
    maTieuMuc: [String(p.tieuMuc)],
    capDoTuDuy: [String(p.capDoTuDuy)],
    maTpnl: [String(p.tpnl[0] ?? '')],
    khaNangDao: ([1, 2, 3, 4].includes(p.khaNangDao) ? p.khaNangDao : 4) as PhanLoaiBocTach['khaNangDao'],
    maKhaNangDao: String(p.khaNangDao),
  };
}

export type TruongPhanLoai = 'chuDe' | 'tieuMuc' | 'cdtd' | 'tpnl' | 'cheDoDao';

/** Lỗi theo trường: mã trong tệp không khớp danh mục (khóa có mặt = trường phải chọn lại) */
export type LoiPhanLoai = Partial<Record<TruongPhanLoai, string>>;

export interface KetQuaAnhXaPhanLoai {
  /** Chủ đề khớp mã (có cả khi mã tiểu mục sai — để chọn sẵn Chủ đề, chỉ phải chọn lại Tiểu mục) */
  chuDeId?: string;
  tieuMucId?: string;
  cdtd?: CapDoTuDuy;
  tpnlId?: string;
  cheDoDao?: CheDoDaoCauHoi;
  loi: LoiPhanLoai;
}

export interface DanhMucPhanLoai {
  /** Cây chủ đề → tiểu mục của Môn–Khối đang chọn */
  cayChuDe: NutChuDe[];
  /** TPNL của môn đang chọn */
  dsTpnl: MucDanhMuc[];
}

/** Mã cấp độ tư duy chấp nhận: chữ (NB/TH/VD), số (1/2/3 — Mẫu Thi TN THPT) hoặc giá trị hệ thống */
const CDTD_THEO_MA: Record<string, CapDoTuDuy> = {
  NB: CapDoTuDuy.NhanBiet,
  '1': CapDoTuDuy.NhanBiet,
  'NHAN-BIET': CapDoTuDuy.NhanBiet,
  TH: CapDoTuDuy.ThongHieu,
  '2': CapDoTuDuy.ThongHieu,
  'THONG-HIEU': CapDoTuDuy.ThongHieu,
  VD: CapDoTuDuy.VanDung,
  '3': CapDoTuDuy.VanDung,
  'VAN-DUNG': CapDoTuDuy.VanDung,
};

/** Mã khả năng đảo 1–4 (YC-NH-05b) */
const CHE_DO_DAO_THEO_MA: Record<string, CheDoDaoCauHoi> = {
  '1': CheDoDaoCauHoi.DaoLenhHoiVaDapAn,
  '2': CheDoDaoCauHoi.ChiDaoLenhHoi,
  '3': CheDoDaoCauHoi.ChiDaoDapAn,
  '4': CheDoDaoCauHoi.KhongDao,
};

const chuan = (ma?: string) => (ma ?? '').trim().toUpperCase();
const laSo = (s: string) => /^\d+$/.test(s);

/** Tìm mục theo mã: khớp nguyên văn (không phân biệt hoa thường) trước, rồi khớp theo giá trị số ("06" = "6") */
function timTheoMa<T extends { ma?: string }>(ds: T[], ma: string, maKhac: (muc: T) => string[] = () => []): T | undefined {
  const can = chuan(ma);
  if (!can) return undefined;
  return (
    ds.find((m) => chuan(m.ma) === can || maKhac(m).some((k) => chuan(k) === can)) ??
    (laSo(can) ? ds.find((m) => laSo(chuan(m.ma)) && Number(chuan(m.ma)) === Number(can)) : undefined)
  );
}

/** Phần tử thứ `viTri` của danh sách mã; danh sách 1 phần tử = áp cho mọi câu con/ý */
const phanTu = (ds: string[], viTri: number): string => (ds.length === 1 ? ds[0] : (ds[viTri] ?? '')).trim();

/**
 * @param viTri thứ tự câu con (0 = câu con đầu / chính câu hỏi) khi mã là danh sách "+"
 */
export function anhXaPhanLoai(
  phanLoai: PhanLoaiBocTach,
  { cayChuDe, dsTpnl }: DanhMucPhanLoai,
  viTri = 0,
): KetQuaAnhXaPhanLoai {
  const kq: KetQuaAnhXaPhanLoai = { loi: {} };

  // ---- Chủ đề . Tiểu mục ----
  const maChuDe = phanTu(phanLoai.maChuDe, viTri);
  const maTieuMuc = phanTu(phanLoai.maTieuMuc, viTri);
  const chuDe = timTheoMa(cayChuDe, maChuDe);
  if (!chuDe) {
    kq.loi.chuDe = `Mã chủ đề "${maChuDe}" không có trong danh mục chủ đề của Môn – Khối đang chọn`;
    kq.loi.tieuMuc = `Chưa xác định được tiểu mục "${maTieuMuc}" vì mã chủ đề không đúng`;
  } else {
    kq.chuDeId = chuDe.id;
    const tieuMuc = timTheoMa(chuDe.con ?? [], maTieuMuc, (tm) => [`${chuDe.ma ?? ''}.${tm.ma ?? ''}`]);
    if (tieuMuc) kq.tieuMucId = tieuMuc.id;
    else kq.loi.tieuMuc = `Mã tiểu mục "${maTieuMuc}" không có trong chủ đề "${maChuDe}" (${chuDe.ten})`;
  }

  // ---- Cấp độ tư duy ----
  const maCdtd = phanTu(phanLoai.capDoTuDuy, viTri);
  kq.cdtd = CDTD_THEO_MA[chuan(maCdtd)];
  if (!kq.cdtd) kq.loi.cdtd = `Mã cấp độ tư duy "${maCdtd}" không có trong hệ thống (NB · TH · VD)`;

  // ---- Thành phần năng lực ----
  const maTpnl = phanTu(phanLoai.maTpnl, viTri);
  const tpnl = timTheoMa(dsTpnl, maTpnl);
  if (tpnl) kq.tpnlId = tpnl.id;
  else kq.loi.tpnl = `Mã thành phần năng lực "${maTpnl}" không có trong danh mục của môn đang chọn`;

  // ---- Khả năng đảo ----
  const maDao = (phanLoai.maKhaNangDao ?? String(phanLoai.khaNangDao)).trim();
  kq.cheDoDao = CHE_DO_DAO_THEO_MA[maDao];
  if (!kq.cheDoDao) kq.loi.cheDoDao = `Mã khả năng đảo "${maDao}" không hợp lệ (1 – 4)`;

  return kq;
}

export const coLoiPhanLoai = (loi?: LoiPhanLoai): boolean => !!loi && Object.keys(loi).length > 0;

/** Gộp lỗi các trường thành một dòng lý do (hiện cạnh câu ở danh sách soát / thông báo khi dán) */
export const moTaLoiPhanLoai = (loi: LoiPhanLoai): string => Object.values(loi).join('; ');
