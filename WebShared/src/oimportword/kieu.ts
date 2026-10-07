/**
 * Kiểu dữ liệu + HỢP ĐỒNG ĐỊNH DẠNG của plugin oImportWord.
 *
 * Một "định dạng" (DinhDangCauHoi) mô tả cách một loại câu hỏi được trình bày trong
 * Word và cách bóc tách nó. Cả hai chức năng — DÁN câu hỏi vào OEditor và IMPORT tệp
 * .docx — đều chạy qua cùng danh sách định dạng này, nên câu hỏi được hiểu giống nhau.
 * Thêm định dạng mới: viết một đối tượng DinhDangCauHoi rồi `dangKyDinhDang()` —
 * không phải sửa bộ máy (xem README của WebShared).
 */

/** Loại câu — dùng đúng giá trị `LoaiCauHoi` của các web ('trac-nghiem-1', 'dung-sai-4-y'…) */
export type MaLoaiCau = string;

/** Mã loại câu các định dạng mặc định dùng — TRÙNG giá trị `LoaiCauHoi` (constants/enum.ts) của web */
export const LOAI_CAU = {
  TracNghiem1DapAn: 'trac-nghiem-1',
  TracNghiemNhieuDapAn: 'trac-nghiem-nhieu',
  DungSai: 'dung-sai',
  DungSai4Y: 'dung-sai-4-y',
  TraLoiNgan: 'tra-loi-ngan',
  DienKhuyet: 'dien-khuyet',
  TuLuan: 'tu-luan',
  CauChum: 'cau-chum',
  GhepDoi: 'ghep-doi',
  SapXep: 'sap-xep',
  KeoTha: 'keo-tha',
  ToMau: 'to-mau',
  NoiDay: 'noi-day',
} as const;

export type TrangThaiBocTach = 'ok' | 'canh-bao' | 'loi';

/**
 * Phân loại dạng MÃ danh mục (như gõ trong tệp/câu dán), web tự ánh xạ sang id (soan-cau-hoi/anhXaPhanLoai.ts):
 * mã sau "CH-<mã>:" ("CH-TN:0100.010010_VD_TC_1") do maLoaiCau.docMaPhanLoai đọc, hoặc chuyển từ `PhanLoaiTienTo`.
 * Mỗi mảng: danh sách theo thứ tự câu con/ý, một phần tử = áp cho mọi câu con.
 */
export interface PhanLoaiBocTach {
  /** Dòng mã đã chuẩn hóa, VD "1.1_2_3_1" · "CH-TN:0100.010010_VD_TC_1" */
  dongMa: string;
  maChuDe: string[];
  maTieuMuc: string[];
  /** Mã cấp độ tư duy: "1"/"NB" Biết · "2"/"TH" Hiểu · "3"/"VD" Vận dụng */
  capDoTuDuy: string[];
  maTpnl: string[];
  /** Khả năng đảo 1–4 (YC-NH-05b): 1 đảo lệnh hỏi & đáp án · 2 chỉ đảo lệnh hỏi · 3 chỉ đảo đáp án · 4 không đảo */
  khaNangDao: 1 | 2 | 3 | 4;
  /** Mã khả năng đảo NGUYÊN VĂN trong tệp — ngoài 1–4 thì web báo đỏ để chọn lại */
  maKhaNangDao?: string;
  /** Dòng đầu mã "[Neo/Không neo]_[Thêm/Sửa/Giữ nguyên]_[ID: …]" nếu có */
  trangThaiSoan?: 'them' | 'sua' | 'giu-nguyen';
  /** Mã câu hỏi đã có (phần sau "ID:"), "CH" = câu mới */
  maCau?: string;
}

/**
 * Mẫu (định dạng tệp) import Word — CỐ ĐỊNH trong mã nguồn (mauImport.ts), người dùng chọn ở bước 1:
 *   'khao-thi-so' — đầu câu ghi mã loại "CH-TN1", "CH-NHOM", câu con "CHC-TN1";
 *   'tn-thpt'     — đầu câu ghi tiền tố phân loại "<Chủ đề>.<Tiểu mục>_<CĐTD>_<TPNL>_<Khả năng đảo>", loại câu theo PHẦN;
 *   'mac-dinh'    — câu đơn giản đánh số "Câu N.", loại câu tự nhận diện.
 */
export type MaMauImport = 'khao-thi-so' | 'tn-thpt' | 'mac-dinh';

/**
 * Phân loại ghi trong tiền tố câu của mẫu TN THPT, VD "1.1_2_3_1" — giữ nguyên SỐ như trong tệp;
 * web tự đối chiếu với danh mục Môn–Khối đang chọn (số thứ tự chủ đề/tiểu mục/TPNL).
 */
export interface PhanLoaiTienTo {
  /** Tiền tố gốc, VD "1.1_2_3_1" */
  maGoc: string;
  /** Số thứ tự chủ đề (từ 1) */
  chuDe: number;
  /** Số thứ tự tiểu mục trong chủ đề (từ 1) */
  tieuMuc: number;
  /** 1 = Nhận biết · 2 = Thông hiểu · 3 = Vận dụng */
  capDoTuDuy: number;
  /** Số thứ tự thành phần năng lực (có thể nhiều, nối bằng "+") */
  tpnl: number[];
  /** 1 = đảo lệnh hỏi & đáp án · 2 = chỉ đảo lệnh hỏi · 3 = chỉ đảo đáp án · 4 = không đảo */
  khaNangDao: number;
}

export interface PhuongAnBocTach {
  /** HTML (giữ công thức <span data-cong-thuc>, ảnh, định dạng) */
  noiDung: string;
  dung: boolean;
}

/** Kết quả bóc tách MỘT câu hỏi — trung lập với nghiệp vụ, web tự ánh xạ vào mô hình của mình */
export interface CauHoiBocTach {
  /** Định dạng đã dùng để bóc tách */
  maDinhDang: string;
  /** Loại câu; '' = CHƯA phân biệt được — người dùng phải cập nhật bổ sung */
  loaiCau: MaLoaiCau;
  /**
   * Mã câu hỏi theo quy ước "CH-<mã loại>" (câu hỏi) / "CHC-<mã loại>" (câu hỏi con),
   * VD "CH-TN1", "CHC-TLN" — lấy từ tài liệu nếu có, không thì sinh theo loại câu đã nhận diện.
   */
  maCauHoi?: string;
  /** Câu dẫn (lead-in) của câu hỏi nhóm — đoạn bao bởi "##…##" hoặc "Cho đoạn văn sau và trả lời câu N**…" */
  cauDan?: string;
  /** Số ô trống (đục lỗ) trong nội dung/ngữ liệu */
  soOTrong?: number;
  /** Nhãn trong tài liệu gốc, VD "Câu 9", "Câu 3.2" (để người soát đối chiếu) */
  nhan?: string;
  /** Phần của đề chứa câu, VD "PHẦN II. …" */
  phan?: string;
  /** HTML đề bài / lời dẫn (đã cắt tiền tố "Câu N.") */
  noiDung: string;
  phuongAn: PhuongAnBocTach[];
  /** Đáp án dạng văn bản (trả lời ngắn, điền khuyết…) */
  dapAn?: string;
  /** HTML lời giải / hướng dẫn chấm (đoạn "Lời giải:", "Hướng dẫn giải:"…) */
  loiGiai?: string;
  /** Câu chùm: ngữ liệu chung + câu con */
  nguLieu?: string;
  cauCon?: CauHoiBocTach[];
  /** Mẫu TN THPT: phân loại đọc từ tiền tố đầu câu */
  phanLoai?: PhanLoaiTienTo;
  trangThai: TrangThaiBocTach;
  /** Lý do cảnh báo/lỗi — người soát cần xem lại */
  lyDo: string[];
}

/** Một khối nội dung ứng với MỘT câu hỏi (hoặc một nhóm câu chùm) */
export interface KhoiCauHoi {
  /** HTML của khối (một hoặc nhiều đoạn) */
  html: string;
  /** Văn bản thuần của khối — tiện cho nhận diện nhanh */
  vanBan: string;
  nhan?: string;
  phan?: string;
  /** Mã loại câu ghi ở đầu câu trong tài liệu ("TN1" trong "CH-TN1") — chỉ có khi IMPORT */
  maLoai?: string;
  /** Khối là câu hỏi con (đầu câu ghi "CHC-…" hoặc "Câu N.k.") */
  laCauCon?: boolean;
  /** Mẫu TN THPT: phân loại đọc từ tiền tố đầu câu (đã cắt khỏi html) */
  phanLoai?: PhanLoaiTienTo;
  /** Mẫu TN THPT: mã loại câu suy ra từ tiêu đề PHẦN (I → TN1, II → DS, III → TLN, tự luận → TL) */
  maLoaiTheoPhan?: string;
  /** Khối mở đầu bằng "Câu N." (không kể tiền tố) */
  coSoCau?: boolean;
  /** Câu chùm: các khối câu con ("Câu N.1.", "Câu N.2."…); html khi đó là ngữ liệu */
  cauCon?: KhoiCauHoi[];
}

export interface NguCanhBocTach {
  /** Loại câu người dùng đang chọn (khi DÁN vào màn soạn) — định dạng nên tôn trọng */
  loaiCauYeuCau?: MaLoaiCau;
  /** Nguồn: dán vào editor hay import tệp */
  nguon: 'dan' | 'tep';
  /** Bóc tách một khối con bằng bộ máy chung (định dạng câu chùm dùng cho câu con) */
  bocTachKhoi: (khoi: KhoiCauHoi) => CauHoiBocTach;
}

/** HỢP ĐỒNG của một định dạng câu hỏi */
export interface DinhDangCauHoi {
  /** Mã duy nhất, VD 'trac-nghiem-abcd' */
  ma: string;
  /** Tên hiển thị */
  ten: string;
  /** Quy ước trình bày trong Word — hiển thị cho người dùng (hướng dẫn, file mẫu) */
  quyUoc: string;
  /** Ví dụ trình bày (văn bản thuần) */
  viDu?: string;
  /** Các loại câu định dạng này bóc tách ra được */
  loaiCau: readonly MaLoaiCau[];
  /** Thứ tự ưu tiên khi điểm nhận diện bằng nhau (lớn hơn thắng) */
  uuTien?: number;
  /**
   * Mức độ khớp của khối với định dạng: 0 = không khớp … 1 = chắc chắn.
   * Bộ máy chọn định dạng có điểm cao nhất (> 0).
   */
  nhanDien(khoi: KhoiCauHoi, nguCanh: NguCanhBocTach): number;
  /** Bóc tách; trả về null nếu thực ra không tách được (bộ máy thử định dạng kế tiếp) */
  bocTach(khoi: KhoiCauHoi, nguCanh: NguCanhBocTach): CauHoiBocTach | null;
}

/** Kết quả bóc tách cả tài liệu */
export interface KetQuaTaiLieu {
  cauHoi: CauHoiBocTach[];
  /** Ghi chú chung (VD: phần mở đầu bị bỏ qua, không tìm thấy câu nào…) */
  ghiChu: string[];
}
