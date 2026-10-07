/**
 * Danh mục MÃ LOẠI CÂU dùng trong quy ước import Word:
 *   đầu mỗi câu hỏi ghi "CH-<mã>" (VD "CH-TN"), câu hỏi con ghi "CHC-<mã>" (VD "CHC-TLN").
 * Có mã → phân loại theo mã; không có mã → bộ máy tự nhận diện; không nhận diện được →
 * câu được đánh dấu "cần cập nhật bổ sung loại câu". Mở rộng: dangKyMaLoaiCau().
 */
import { LOAI_CAU, type MaLoaiCau, type PhanLoaiBocTach } from './kieu';

export interface MucMaLoaiCau {
  /** Mã viết sau "CH-"/"CHC-", viết hoa, VD 'TN' */
  ma: string;
  loaiCau: MaLoaiCau;
  ten: string;
  /** Loại KHÔNG dùng làm câu hỏi con của câu hỏi nhóm (không có mã "CHC-<mã>") */
  khongLaCauCon?: boolean;
}

const MA_MAC_DINH: MucMaLoaiCau[] = [
  { ma: 'TN', loaiCau: LOAI_CAU.TracNghiem1DapAn, ten: 'Trắc nghiệm 1 đáp án' },
  { ma: 'TNN', loaiCau: LOAI_CAU.TracNghiemNhieuDapAn, ten: 'Trắc nghiệm nhiều đáp án' },
  { ma: 'DS', loaiCau: LOAI_CAU.DungSai, ten: 'Đúng/Sai' },
  { ma: 'DS4', loaiCau: LOAI_CAU.DungSai4Y, ten: 'Đúng/Sai 4 ý', khongLaCauCon: true },
  { ma: 'GD', loaiCau: LOAI_CAU.GhepDoi, ten: 'Ghép đôi' },
  { ma: 'SX', loaiCau: LOAI_CAU.SapXep, ten: 'Sắp xếp thứ tự' },
  { ma: 'DK', loaiCau: LOAI_CAU.DienKhuyet, ten: 'Điền khuyết' },
  { ma: 'TLN', loaiCau: LOAI_CAU.TraLoiNgan, ten: 'Trả lời ngắn' },
  { ma: 'TL', loaiCau: LOAI_CAU.TuLuan, ten: 'Tự luận' },
  { ma: 'NHOM', loaiCau: LOAI_CAU.CauChum, ten: 'Câu hỏi nhóm', khongLaCauCon: true },
  { ma: 'KT', loaiCau: LOAI_CAU.KeoTha, ten: 'Kéo thả' },
  { ma: 'TM', loaiCau: LOAI_CAU.ToMau, ten: 'Tô màu vùng hình' },
  { ma: 'ND', loaiCau: LOAI_CAU.NoiDay, ten: 'Nối dây' },
];

const theoMa = new Map<string, MucMaLoaiCau>(MA_MAC_DINH.map((m) => [m.ma, m]));

/** Đăng ký/ghi đè một mã loại câu (VD web có loại câu riêng) */
export function dangKyMaLoaiCau(muc: MucMaLoaiCau): void {
  theoMa.set(muc.ma.toUpperCase(), { ...muc, ma: muc.ma.toUpperCase() });
}

export const danhSachMaLoaiCau = (): MucMaLoaiCau[] => Array.from(theoMa.values());

/** "TN" → 'trac-nghiem-1'; mã lạ → undefined */
export const loaiCauTuMa = (ma: string): MaLoaiCau | undefined => theoMa.get(ma.toUpperCase())?.loaiCau;

/** Mã có dùng được cho câu hỏi con ("CHC-<mã>") không — mã lạ → false */
export const laMaCauCon = (ma: string): boolean => {
  const muc = theoMa.get(ma.toUpperCase());
  return !!muc && !muc.khongLaCauCon;
};

/**
 * 'trac-nghiem-1' → "CH-TN" (câu hỏi) / "CHC-TN" (câu hỏi con); loại chưa có mã, hoặc loại
 * không có mã câu hỏi con (DS4, NHOM) → undefined
 */
export function taoMaCauHoi(loaiCau: MaLoaiCau, laCauCon = false): string | undefined {
  const muc = danhSachMaLoaiCau().find((m) => m.loaiCau === loaiCau);
  if (!muc || (laCauCon && muc.khongLaCauCon)) return undefined;
  return `${laCauCon ? 'CHC' : 'CH'}-${muc.ma}`;
}

/**
 * Mã câu hỏi đầu đoạn: "CH-TN", "CHC - TLN:", "CH–DS4." … — có thể kèm MÃ PHÂN LOẠI sau dấu ":"
 * (Mẫu Khảo thí số): "CH-TN:0100.010010_VD_TC_1" = {mã loại}:{mã chủ đề}.{mã tiểu mục}_{CĐTD}_{TPNL}_{đảo}.
 * Nhóm 1 = CH/CHC, nhóm 2 = mã loại, nhóm 3 = chuỗi mã phân loại (nếu có — nhận diện nhờ có dấu "_").
 */
export const MA_CAU_HOI_RE =
  /^\s*(CHC|CH)\s*[-–]\s*([A-Za-z]+\d*)\b(?:\s*:\s*([^\s_:]+(?:_[^\s_]*)+))?\s*[.:)]?\s*/;

/**
 * Đọc chuỗi mã phân loại sau "CH-<mã>:" — "{mã chủ đề}.{mã tiểu mục}_{CĐTD}_{TPNL}_{đảo}" (VD "0100.010010_VD_TC_1").
 * Chỉ kiểm tra CÚ PHÁP; mã có tồn tại trong danh mục hay không do web đối chiếu (mã giữ nguyên như gõ trong tệp).
 * @param dauMa phần mã loại đứng trước, VD "CH-TN" — để dựng lại nguyên văn dòng mã
 */
export function docMaPhanLoai(chuoi: string, dauMa: string): { phanLoai: PhanLoaiBocTach; loi: string[] } {
  const sach = chuoi.trim().replace(/\.$/, '');
  const cacPhan = sach.split('_').map((x) => x.trim());
  const [chuDeTieuMuc = '', cdtd = '', tpnl = '', dao = ''] = cacPhan;
  const viTriCham = chuDeTieuMuc.indexOf('.');
  const maChuDe = viTriCham >= 0 ? chuDeTieuMuc.slice(0, viTriCham) : chuDeTieuMuc;
  const maTieuMuc = viTriCham >= 0 ? chuDeTieuMuc.slice(viTriCham + 1) : '';
  const loi: string[] = [];
  if (cacPhan.length !== 4 || !maChuDe || !maTieuMuc) {
    loi.push(
      `Mã phân loại "${sach}" sai cú pháp — đúng dạng {mã chủ đề}.{mã tiểu mục}_{cấp độ tư duy}_{thành phần năng lực}_{khả năng đảo}, VD 0100.010010_VD_TC_1`,
    );
  }
  const soDao = /^[1-4]$/.test(dao) ? (Number(dao) as PhanLoaiBocTach['khaNangDao']) : undefined;
  return {
    phanLoai: {
      dongMa: `${dauMa}:${sach}`,
      maChuDe: [maChuDe],
      maTieuMuc: [maTieuMuc],
      capDoTuDuy: [cdtd],
      maTpnl: [tpnl],
      khaNangDao: soDao ?? 1,
      maKhaNangDao: dao,
    },
    loi,
  };
}
