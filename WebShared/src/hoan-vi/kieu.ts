/**
 * Kiểu dữ liệu của engine hoán vị đề phía FE — soi gương `KTDG.CauHoi` (MoHinh.cs, HoanVi.cs) với tên camelCase.
 * Là kiểu TỐI THIỂU: đối tượng truyền vào có thêm trường khác (điểm, phiên bản, lời giải…) thì được giữ nguyên.
 */

/** Loại câu — đúng giá trị `LoaiCauHoi` kebab của @web-shared/soan-cau-hoi/hang.ts */
export const LOAI_CAU_HV = {
  TracNghiem1: 'trac-nghiem-1',
  TracNghiemNhieu: 'trac-nghiem-nhieu',
  DungSai: 'dung-sai',
  DungSai4Y: 'dung-sai-4-y',
  GhepDoi: 'ghep-doi',
  SapXep: 'sap-xep',
  DienKhuyet: 'dien-khuyet',
  TraLoiNgan: 'tra-loi-ngan',
  TuLuan: 'tu-luan',
  CauChum: 'cau-chum',
  KeoTha: 'keo-tha',
  ToMau: 'to-mau',
  NoiDay: 'noi-day',
} as const;

/** Chế độ đảo (YC-NH-05b) — đúng giá trị `CheDoDaoCauHoi` kebab; thiếu = đảo lệnh hỏi & đáp án */
export type CheDoDaoHv = 'dao-lenh-hoi-va-dap-an' | 'chi-dao-lenh-hoi' | 'chi-dao-dap-an' | 'khong-dao';

export interface PhuongAnHv {
  id: string;
  noiDung: string;
  dung: boolean;
  coDinhViTri?: boolean;
}

export interface NoiDungCauHv {
  id: string;
  loaiCau: string;
  noiDung: string;
  phuongAn: PhuongAnHv[];
  dapAnGoiY?: string | null;
  nguLieu?: string | null;
  cauCon?: NoiDungCauHv[];
  cheDoDao?: CheDoDaoHv;
}

export interface CauTrongDeHv {
  cauHoiId: string;
  noiDung: NoiDungCauHv;
  coDinhViTri?: boolean;
  laCauNeo?: boolean;
}

export interface PhanDeHv {
  id: string;
  tieuDe: string;
  huongDan?: string | null;
  dsCau: CauTrongDeHv[];
}

/** Cấu trúc đề: thứ tự phần cố định; `choPhepDaoLienPhan` lấy từ mẫu đề (YC-MD-01) */
export interface CauTrucDeHv {
  dsPhan: PhanDeHv[];
  choPhepDaoLienPhan?: boolean;
}

/** Dòng bảng đáp án của một mã đề */
export interface DongDapAnHv {
  thuTu: number;
  cauHoiId: string;
  dapAn: string;
}

/** Tùy chọn kiểm tra chất lượng khi sinh bộ mã đề (docs/nghiep-vu-hoan-vi-de.md BR-05..07) */
export interface TuyChonSinhMaDe {
  /** Số câu trắc nghiệm một đáp án LIÊN TIẾP có đáp án đúng cùng vị trí từ mức này → không đạt (mặc định 4) */
  nguongDapAnLienTiep?: number;
  /** Số lần thử tối đa cho MỘT mã đề; thiếu = số mã đề × 25 (sinh bộ) hoặc 25 (sinh một mã) */
  soLanThuToiDa?: number;
  /** Mã đề không được trùng thứ tự đề gốc (mặc định true) */
  khongTrungDeGoc?: boolean;
  /** true (mặc định): hết số lần thử thì ném `LoiKhongSinhDuMaDe`; false: nhận bản thử đầu, `dat = false` */
  nemLoiKhiKhongDat?: boolean;
}

/** Một mã đề đã sinh: hạt giống THỰC DÙNG (tái lập bằng `sinhMaDe`), số lần thử và cờ đạt kiểm tra */
export interface MaDeSinh<T extends CauTrucDeHv = CauTrucDeHv> {
  thuTu: number;
  hatGiong: string;
  cauTruc: T;
  soLanThu: number;
  dat: boolean;
}

/** Vị trí (số câu) của một câu trong đề/mã đề — câu chùm chiếm dải soCauBatDau..soCauKetThuc */
export interface ViTriCauHv {
  cauHoiId: string;
  phanId: string;
  soCauBatDau: number;
  soCauKetThuc: number;
}

/** Đối chiếu một câu của mã đề về đề gốc: `phuongAnGoc[i]` = nhãn gốc của phương án đang đứng ở vị trí i */
export interface DoiChieuCauHv {
  thuTu: number;
  thuTuGoc: number;
  cauHoiId: string;
  loaiCau: string;
  dapAn: string;
  phuongAnGoc: string[];
}

/** Không sinh đủ mã đề đạt yêu cầu sau số lần thử cho phép */
export class LoiKhongSinhDuMaDe extends Error {
  readonly daSinh: number;
  readonly can: number;
  constructor(daSinh: number, can: number) {
    super(`Không sinh được đủ ${can} mã đề đạt yêu cầu; đã sinh ${daSinh} mã đề.`);
    this.name = 'LoiKhongSinhDuMaDe';
    this.daSinh = daSinh;
    this.can = can;
  }
}

/** Số mã đề yêu cầu vượt số hoán vị khả dĩ của đề */
export class LoiVuotSoHoanViKhaDi extends Error {
  readonly toiDa: number;
  readonly can: number;
  constructor(toiDa: number, can: number) {
    super(`Số mã đề không hợp lệ: đề chỉ có tối đa ${toiDa} hoán vị khác nhau, cần ${can}.`);
    this.name = 'LoiVuotSoHoanViKhaDi';
    this.toiDa = toiDa;
    this.can = can;
  }
}
