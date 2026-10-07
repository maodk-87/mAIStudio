/**
 * Hằng dùng chung của câu hỏi — giá trị kebab-case trên đường truyền (docs/apis/00).
 * Khai báo GỐC tại đây; `constants/enum.ts` của mọi web chỉ re-export.
 */

/** Trạng thái vòng đời nội dung (câu hỏi/đề/ma trận) */
export const TrangThaiNoiDung = {
  Nhap: 'nhap',
  ChoDuyet: 'cho-duyet',
  DaDuyet: 'da-duyet',
  TuChoi: 'tu-choi',
  DaPhatHanh: 'da-phat-hanh',
  DaKhoa: 'da-khoa',
  LuuTru: 'luu-tru',
  NgungSuDung: 'ngung-su-dung',
} as const;
export type TrangThaiNoiDung =
  (typeof TrangThaiNoiDung)[keyof typeof TrangThaiNoiDung];

/** Cấp độ tư duy */
export const CapDoTuDuy = {
  NhanBiet: 'nhan-biet',
  ThongHieu: 'thong-hieu',
  VanDung: 'van-dung',
} as const;
export type CapDoTuDuy = (typeof CapDoTuDuy)[keyof typeof CapDoTuDuy];

/** Loại câu hỏi (13 loại) */
export const LoaiCauHoi = {
  TracNghiem1DapAn: 'trac-nghiem-1',
  TracNghiemNhieuDapAn: 'trac-nghiem-nhieu',
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
export type LoaiCauHoi = (typeof LoaiCauHoi)[keyof typeof LoaiCauHoi];

/**
 * Khả năng đảo câu hỏi khi hoán vị đề — cài đặt bắt buộc trên TỪNG câu hỏi
 * ("lệnh hỏi" = câu hỏi con trong câu chùm/Đúng-Sai; "đáp án" = phương án lựa chọn)
 */
export const CheDoDaoCauHoi = {
  /** (1) Đảo lệnh hỏi trong câu chùm/Đ-S VÀ đảo đáp án của mỗi lệnh hỏi (chùm/Đ-S/trắc nghiệm đơn) */
  DaoLenhHoiVaDapAn: 'dao-lenh-hoi-va-dap-an',
  /** (2) Đảo vị trí lệnh hỏi trong câu chùm/nhóm, KHÔNG đảo vị trí đáp án của mỗi lệnh hỏi */
  ChiDaoLenhHoi: 'chi-dao-lenh-hoi',
  /** (3) KHÔNG đảo vị trí lệnh hỏi, chỉ đảo đáp án mỗi lệnh hỏi (chùm/Đ-S/trắc nghiệm) */
  ChiDaoDapAn: 'chi-dao-dap-an',
  /** (4) Không đảo lệnh hỏi và cũng không đảo đáp án */
  KhongDao: 'khong-dao',
} as const;
export type CheDoDaoCauHoi = (typeof CheDoDaoCauHoi)[keyof typeof CheDoDaoCauHoi];
