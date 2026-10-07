/**
 * MÔ HÌNH DỮ LIỆU LMS (DTO trên đường truyền) — hợp đồng giữa LMS.Web và backend LMS
 * (docs/lms/05-hop-dong-api-lms.md, bảng vật lý docs/lms/04-thiet-ke-csdl-lms.md).
 * Giá trị mã (trạng thái, loại…) là kebab-case; ngày giờ là chuỗi ISO 8601.
 */

// ───────────────────────── Mã / hằng (kiểu) ─────────────────────────

export type VaiTroLms =
  | 'hoc-sinh'
  | 'phu-huynh'
  | 'giao-vien'
  | 'tro-giang'
  | 'to-truong'
  | 'ban-giam-hieu'
  | 'giao-vu'
  | 'quan-tri-cap-tren'
  /** Chuyên viên Bộ/Sở/Phường-Xã có phân công soạn chương trình học cấp trên (LMS-114b) */
  | 'chuyen-vien';

export type LoaiKhongGian = 'lop' | 'master';

/** Cấp học — suy từ khối: 1–5 Tiểu học, 6–9 THCS, 10–12 THPT */
export type CapHocLms = 'tieu-hoc' | 'thcs' | 'thpt';

export type TrangThaiMaster = 'dang-soan' | 'da-phat-hanh' | 'ngung-su-dung';

/** Cấp của chương trình học (Lớp Master) = cấp đơn vị sở hữu (LMS-114); hiển thị qua `nhanChuongTrinhHoc` (LMS-115) */
export type CapChuongTrinh = 'bo' | 'so' | 'phuong-xa' | 'truong';

export type LoaiHoatDong =
  | 'bai-tap'
  | 'bai-kiem-tra'
  | 'thao-luan'
  | 'bai-tap-nhom'
  | 'ghi-am'
  // GĐ3
  | 'khao-sat'
  | 'cham-cheo'
  | 'diem-danh'
  | 'buoi-hoc-truc-tuyen';

export type TrangThaiHoatDong = 'nhap' | 'da-giao' | 'da-dong';

export type LoaiMuc = 'trang' | 'tep' | 'hoat-dong' | 'lien-ket';

export type DieuKienHoanThanh = 'xem' | 'nop' | 'dat-diem';

export type ThangDiem = 'thang-10' | 'dat-chua-dat';

export type CachLayDiem = 'cao-nhat' | 'gan-nhat';

export type CongBoDapAn = 'ngay-khi-nop' | 'sau-han' | 'thu-cong' | 'khong';

export type CongBoDiem = 'tu-dong' | 'thu-cong';

export type HinhThucNop = 'van-ban' | 'tep' | 'giay' | 'ghi-am';

export type TrangThaiLuotLam = 'dang-lam' | 'da-nop' | 'dang-cham' | 'da-cham';

/** Trạng thái một ô sổ điểm (LMS-601) */
export type TrangThaiOSoDiem =
  | 'chua-den-han'
  | 'chua-nop'
  | 'nop-muon'
  | 'mien'
  | 'dang-cham'
  | 'da-cham'
  | 'da-cong-bo';

export type DatChuaDat = 'dat' | 'chua-dat';

/** Loại câu hỏi KTĐG hỗ trợ trên LMS (docs/lms/99 mục 5.2) */
export type LoaiCauLms =
  | 'mot-dap-an'
  | 'nhieu-dap-an'
  | 'dung-sai'
  | 'dien-khuyet'
  | 'tra-loi-ngan'
  | 'tu-luan'
  | 'chum'
  // GĐ2
  | 'noi-cap'
  | 'sap-xep';

export type MucDichDe = 'dgtx' | 'luyen-tap' | 'dgdk';

export type NguonDe = 'bo' | 'so' | 'phuong-xa' | 'truong' | 'to' | 'ca-nhan' | 'dvcc';

// ───────────────────────── Phiên & cấu hình ─────────────────────────

export interface HocKy {
  id: string;
  ten: string;
  ngayBatDau: string;
  ngayKetThuc: string;
  /** Đã khóa sổ điểm LMS của học kỳ (LMS-602) */
  daKhoa: boolean;
}

export interface NamHocLms {
  id: string;
  ten: string;
  ngayBatDau: string;
  ngayKetThuc: string;
}

/** Ngữ cảnh phiên LMS — `GET /lms/phien/ngu-canh` */
export interface PhienLms {
  nguoiDungId: string;
  taiKhoan: string;
  hoTen: string;
  donVi: string;
  /** Cấp đơn vị của tài khoản — nhãn "Chương trình học cấp …" (LMS-115); mặc định `truong` */
  capDonVi?: CapChuongTrinh;
  truongId: string;
  /** Các vai trò LMS của tài khoản (suy từ phân công CSDL + LMS) */
  vaiTro: VaiTroLms[];
  /** Quyền theo từng vai trò (`lms.*`, wildcard 3 cấp) */
  quyenTheoVaiTro: Partial<Record<VaiTroLms, string[]>>;
  giaoVienId?: string;
  hocSinhId?: string;
  /** Học sinh: cấp học — quyết định giao diện (docs/lms/06 mục học sinh theo cấp) */
  capHoc?: CapHocLms;
  /** Phụ huynh: danh sách học sinh là con */
  conIds?: string[];
  /** Tổ chuyên môn (TTCM) */
  toChuyenMon?: { id: string; ten: string; monHocIds: string[] };
  /** Cấp quản lý bắt buộc 2FA (docs/lms/99 mục 3 quy tắc 3) */
  batBuoc2Fa: boolean;
  lmsDaBat: boolean;
  /** Cờ tính năng theo giai đoạn + phụ huynh (từ cấu hình trường) */
  tinhNang: { gd2: boolean; gd3: boolean; phuHuynh: boolean };
  namHoc: NamHocLms;
  hocKy: HocKy[];
}

/** Cấu hình LMS cấp trường — `GET/PUT /lms/cau-hinh` */
export interface CauHinhLms {
  lmsDaBat: boolean;
  /** Tổng dung lượng kho tệp của trường (MB) — giới hạn theo tenant (LMS-302) */
  dungLuongToiDaMb: number;
  /** Dung lượng tối đa một tệp tải lên (MB) */
  dungLuongMoiTepMb: number;
  dinhDangTepChoPhep: string[];
  /** Chu kỳ tự lưu bài làm (giây) — mặc định 30 */
  chuKyTuLuuGiay: number;
  /** Cho phụ huynh xem tiến độ/điểm */
  choPhepPhuHuynh: boolean;
  /** Công bố điểm mặc định cho hoạt động mới */
  congBoDiemMacDinh: CongBoDiem;
  /** Bật các tính năng Giai đoạn 2 (docs/lms/99 mục 8) */
  batTinhNangGd2: boolean;
  /** Bật các tính năng Giai đoạn 3 */
  batTinhNangGd3: boolean;
  ngayCapNhat?: string;
  nguoiCapNhat?: string;
}

export interface DungLuongKho {
  daDungMb: number;
  toiDaMb: number;
  theoLop: { khongGianId: string; ten: string; loai: LoaiKhongGian; daDungMb: number; soTep: number }[];
}

// ───────────────────────── Tổ chức (đọc từ CSDL) ─────────────────────────

export interface MonHoc {
  id: string;
  ma: string;
  ten: string;
}

export interface GiaoVienTomTat {
  id: string;
  hoTen: string;
  email?: string;
  toChuyenMonId?: string;
  toChuyenMonTen?: string;
}

export interface HocSinhLms {
  id: string;
  maHocSinh: string;
  hoTen: string;
  gioiTinh: 'Nam' | 'Nữ';
  ngaySinh: string;
  lopId: string;
  lopTen: string;
  khoi: number;
  capHoc: CapHocLms;
  /** Thêm giờ làm bài mặc định (%) cho học sinh khuyết tật — khả năng tiếp cận */
  themGioPhanTram?: number;
}

/** Lớp môn học (không gian học — quan hệ 1–1 với lớp môn học CSDL, LMS-101) */
export interface LopMonHoc {
  id: string;
  ten: string;
  lopId: string;
  lopTen: string;
  monHocId: string;
  monHocTen: string;
  khoi: number;
  namHocId: string;
  giaoVienId: string;
  giaoVienTen: string;
  siSo: number;
  masterId: string | null;
  masterTen?: string | null;
  /** Lưu trữ cuối năm — chỉ đọc (LMS-112, GĐ2) */
  luuTru: boolean;
}

export interface LopMonHocTomTat extends LopMonHoc {
  soModule: number;
  soHoatDongDangMo: number;
  soBaiChoCham: number;
  /** Tỷ lệ hoàn thành trung bình (%) */
  tienDoTrungBinh: number;
  /** Vai trò của người xem trên lớp này */
  vaiTroCuaToi?: 'giao-vien' | 'tro-giang' | 'xem';
}

export interface TroGiang {
  id: string;
  lopMonHocId: string;
  giaoVienId: string;
  giaoVienTen: string;
  quyen: ('xem' | 'cham' | 'soan')[];
}

// ───────────────────────── Lớp Master ─────────────────────────

export interface LopMaster {
  id: string;
  ten: string;
  monHocId: string;
  monHocTen: string;
  khoi: number;
  namHocId: string;
  namHocTen: string;
  moTa?: string;
  trangThai: TrangThaiMaster;
  /** Phiên bản phát hành hiện tại (0 = chưa phát hành) */
  phienBan: number;
  ngayPhatHanh?: string | null;
  /** Cấp của chương trình (GĐ3: cấp Bộ/Sở/Phường-Xã đẩy xuống cấp quản lý trực tiếp — LMS-114) */
  capPhatHanh: CapChuongTrinh;
  saoChepTuMasterId?: string | null;
  nguoiTao: string;
  ngayTao: string;
  soLopGan: number;
  soModule: number;
  soHoatDong: number;
  nguoiSoan: string[];
  /** Đơn vị sở hữu (trường hoặc Phường/Xã, Sở, Bộ) */
  donViId: string;
  donViTen?: string | null;
  /** Chương trình nhận từ cấp trên (LMS-114c) — nguồn + phiên bản đã nhận */
  masterCapTrenId?: string | null;
  masterCapTrenTen?: string | null;
  masterCapTrenCap?: CapChuongTrinh | null;
  phienBanCapTrenDaNhan?: number | null;
  /** Nguồn cấp trên đã ngừng sử dụng — các mục khóa đã được mở */
  nguonCapTrenNgung: boolean;
  /** Số đơn vị trực thuộc đã nhận (chương trình cấp trên) */
  soDonViDaNhan: number;
  /** Người dùng hiện tại được soạn chương trình này (API tính theo vai trò/phân công) — false: chỉ xem */
  duocSoan?: boolean;
  /** Ngược của `duocSoan` — người dùng hiện tại chỉ xem */
  chiDoc?: boolean;
}

/** Loại nhân sự được phân công soạn (LMS-114b) — chuyên viên: `giaoVienId` là id tài khoản */
export type LoaiNhanSuSoan = 'giao-vien' | 'chuyen-vien';

export type QuyenSoanMaster = 'soan' | 'phat-hanh';

export interface PhanCongSoanMaster {
  id: string;
  masterId: string;
  giaoVienId: string;
  giaoVienTen: string;
  quyen: QuyenSoanMaster[];
  loaiNhanSu: LoaiNhanSuSoan;
  donViNhanSuTen?: string | null;
}

/** Ứng viên phân công soạn chương trình cấp trên (LMS-114b) */
export interface UngVienNhanSu {
  id: string;
  hoTen: string;
  taiKhoan?: string | null;
  donViId?: string | null;
  donViTen?: string | null;
  /** GV dạy môn của chương trình */
  dayMon: boolean;
}

export interface UngVienPhanCong {
  chuyenVien: UngVienNhanSu[];
  truong: { id: string; ten: string }[];
  /** Chỉ có khi truyền `truongId` */
  giaoVien: UngVienNhanSu[];
}

export type LyDoKhongHopLeDayXuong = 'lms-chua-bat' | 'khong-co-khoi';
export type KetQuaDayXuongMa = 'thanh-cong' | 'bo-qua' | 'loi';

/** Tình trạng triển khai chương trình cấp trên tại một đơn vị trực thuộc trực tiếp (MH-37, LMS-114e) */
export interface TrienKhaiMaster {
  donViId: string;
  donViTen: string;
  cap: CapChuongTrinh;
  hopLe: boolean;
  lyDo?: LyDoKhongHopLeDayXuong | null;
  ketQua?: KetQuaDayXuongMa | null;
  /** `bo-chon | lms-chua-bat | khong-co-khoi` */
  lyDoKetQua?: string | null;
  phienBanDaNhan?: number | null;
  thoiDiem?: string | null;
  masterDichId?: string | null;
  masterDichTen?: string | null;
  trangThaiDich?: TrangThaiMaster | null;
  phienBanDichPhatHanh: number;
  soKhacBietChoXem: number;
  soLopGan: number;
  soDonViCapDuoiDaNhan: number;
}

/** Kết quả đẩy chương trình xuống một đơn vị (LMS-114c) */
export interface KetQuaDayXuong {
  donViId: string;
  donViTen: string;
  ketQua: KetQuaDayXuongMa;
  lyDo?: string | null;
  masterDichId?: string | null;
  soMucThem: number;
  soMucCapNhat: number;
  soMucGiuBanCapDuoi: number;
}

/** Một lần gán lớp môn học vào Master — `denNgay` rỗng = đang gán (LMS-104, LMS-106) */
export interface GanLopMaster {
  id: string;
  masterId: string;
  masterTen: string;
  lopMonHocId: string;
  lopMonHocTen: string;
  tuNgay: string;
  denNgay: string | null;
  nguoiGan: string;
  lanApDungCuoi?: string | null;
  phienBanDaApDung?: number | null;
}

export interface KetQuaApDung {
  soLop: number;
  soMucThem: number;
  soMucBoQua: number;
  chiTiet: { lopMonHocId: string; lopMonHocTen: string; soMucThem: number }[];
}

/** Khác biệt khi đồng bộ Master → lớp (LMS-109, GĐ2) */
export interface KhacBietDongBo {
  masterItemId: string;
  loaiDoiTuong: 'module' | 'muc' | 'trang' | 'hoat-dong';
  tieuDe: string;
  tinhTrang: 'moi' | 'da-cap-nhat' | 'gv-da-sua' | 'bi-khoa' | 'giong';
  moTa: string;
}

export interface PhienBanMaster {
  phienBan: number;
  ngayPhatHanh: string;
  nguoiPhatHanh: string;
  ghiChu?: string;
  soMuc: number;
}

// ───────────────────────── Học liệu ─────────────────────────

/** Ngày tương đối trên Master (tuần thứ n, ngày thứ k của tuần) */
export interface NgayTuongDoi {
  tuan: number;
  ngay: number;
}

export interface LienKetMaster {
  masterId?: string | null;
  masterItemId?: string | null;
  /** Mục do Master khóa — GV lớp không sửa (GĐ2) */
  khoa?: boolean;
  /** GV lớp đã sửa sau khi áp dụng */
  daSuaSauApDung?: boolean;
}

export interface ModuleHoc extends LienKetMaster {
  id: string;
  khongGianId: string;
  loaiKhongGian: LoaiKhongGian;
  ten: string;
  moTa?: string;
  thuTu: number;
  /** Ngày mở (lớp) */
  ngayMo?: string | null;
  /** Ngày mở tương đối (Master) */
  ngayMoTuongDoi?: NgayTuongDoi | null;
  /** Học tuần tự: hoàn thành mục trước mới mở mục sau (LMS-202) */
  hocTuanTu: boolean;
  daXuatBan: boolean;
}

export interface MucModule extends LienKetMaster {
  id: string;
  moduleId: string;
  thuTu: number;
  loai: LoaiMuc;
  tieuDe: string;
  /** id trang / tệp / hoạt động */
  doiTuongId?: string | null;
  /** Liên kết ngoài (loai = lien-ket) */
  url?: string | null;
  dieuKienHoanThanh: DieuKienHoanThanh;
  /** Điểm tối thiểu (thang 10) khi điều kiện = dat-diem (LMS-203, GĐ2) */
  diemToiThieu?: number | null;
  /** Thụt lề hiển thị */
  thutLe?: number;
}

/** Mục kèm trạng thái của học sinh đang xem */
export interface MucModuleHienThi extends MucModule {
  loaiHoatDong?: LoaiHoatDong;
  hanNop?: string | null;
  /** HS: đã hoàn thành */
  daHoanThanh?: boolean;
  /** HS: bị khóa do học tuần tự / chưa tới ngày mở */
  biKhoa?: boolean;
  lyDoKhoa?: string;
  /** GV: số bài chờ chấm */
  soChoCham?: number;
}

export interface ModuleChiTiet extends ModuleHoc {
  muc: MucModuleHienThi[];
  /** HS: tỷ lệ hoàn thành module (%) */
  tienDo?: number;
  biKhoa?: boolean;
  lyDoKhoa?: string;
}

export interface TrangNoiDung extends LienKetMaster {
  id: string;
  khongGianId: string;
  loaiKhongGian: LoaiKhongGian;
  tieuDe: string;
  noiDungHtml: string;
  ngayCapNhat: string;
  nguoiCapNhat: string;
}

export interface TepLms extends LienKetMaster {
  id: string;
  khongGianId: string;
  loaiKhongGian: LoaiKhongGian;
  ten: string;
  mime: string;
  kichThuoc: number;
  thuMuc?: string | null;
  /** Mã tệp ở Dịch vụ Tệp (xem trực tuyến) */
  maTep?: string | null;
  /** URL xem/tải (endpoint có kiểm quyền) */
  duongDan?: string | null;
  ngayTaiLen: string;
  nguoiTaiLen: string;
}

export interface ThongBaoLop {
  id: string;
  lopMonHocId: string;
  tieuDe: string;
  noiDungHtml: string;
  ghimDau: boolean;
  nguoiDang: string;
  ngayDang: string;
  soNguoiDaDoc?: number;
}

export interface NhomHocSinh {
  id: string;
  lopMonHocId: string;
  ten: string;
  hocSinhIds: string[];
  cachTao: 'thu-cong' | 'ngau-nhien';
}

// ───────────────────────── Hoạt động ─────────────────────────

export interface CauHinhBaiTap {
  hinhThucNop: HinhThucNop[];
  /** 0 = không giới hạn */
  soLanNopToiDa: number;
  dinhDangTep?: string[];
  dungLuongToiDaMb?: number;
}

export interface CauHinhBaiKiemTra {
  deId: string;
  deMa: string;
  deTen: string;
  soCau: number;
  tongDiemDe: number;
  /** Snapshot đề KTĐG chốt khi giao (LMS không lưu nội dung đề) */
  snapshotId?: string | null;
  /** null = không giới hạn thời gian */
  thoiGianLamPhut: number | null;
  soLuotToiDa: number;
  cachLayDiem: CachLayDiem;
  xaoCau: boolean;
  xaoDapAn: boolean;
  congBoDapAn: CongBoDapAn;
  /** Mã truy cập phiên (GĐ2) */
  maTruyCap?: string | null;
  /** Giới hạn IP mạng trường (GĐ2) */
  gioiHanIpTruong?: boolean;
  /** Bài kiểm tra chung theo Master (LMS-110, GĐ2) */
  laBaiChungMaster?: boolean;
}

export interface CauHinhThaoLuan {
  /** Bắt buộc đăng bài trước khi xem bài bạn (LMS-403) */
  batBuocDangTruoc: boolean;
}

export interface TruDiemMuon {
  /** Trừ bao nhiêu điểm (thang 10) mỗi ngày muộn */
  diemMoiNgay: number;
  /** Điểm sàn sau khi trừ */
  diemSan: number;
}

export interface GiaoCho {
  loai: 'ca-lop' | 'hoc-sinh' | 'nhom';
  hocSinhIds?: string[];
  nhomIds?: string[];
}

export interface HoatDong extends LienKetMaster {
  id: string;
  khongGianId: string;
  loaiKhongGian: LoaiKhongGian;
  loai: LoaiHoatDong;
  tieuDe: string;
  moTaHtml: string;
  trangThai: TrangThaiHoatDong;
  coDiem: boolean;
  thangDiem: ThangDiem;
  hocKyId: string;
  ngayMo?: string | null;
  hanNop?: string | null;
  /** Hạn cuối nhận bài muộn */
  hanCuoi?: string | null;
  choNopMuon: boolean;
  /** Master: hạn tương đối */
  ngayMoTuongDoi?: NgayTuongDoi | null;
  hanNopTuongDoi?: NgayTuongDoi | null;
  congBoDiem: CongBoDiem;
  giaoCho: GiaoCho;
  baiTap?: CauHinhBaiTap | null;
  baiKiemTra?: CauHinhBaiKiemTra | null;
  thaoLuan?: CauHinhThaoLuan | null;
  /** GĐ2 */
  rubricId?: string | null;
  chuanDauRaIds?: string[];
  nhomDiemId?: string | null;
  truDiemMuon?: TruDiemMuon | null;
  ngayTao: string;
  nguoiTao: string;
}

/** Tóm tắt hoạt động cho danh sách (GV) */
export interface HoatDongTomTat extends HoatDong {
  soDaNop: number;
  soChoCham: number;
  soDaCham: number;
  soDaCongBo: number;
  tongHocSinh: number;
}

/** Hoạt động nhìn từ học sinh */
export interface HoatDongCuaHocSinh extends HoatDong {
  lopMonHocTen: string;
  monHocTen: string;
  /** Hạn nộp hiệu lực sau gia hạn riêng */
  hanNopHieuLuc?: string | null;
  trangThaiCuaEm: 'chua-lam' | 'dang-lam' | 'da-nop' | 'nop-muon' | 'da-cham' | 'qua-han' | 'mien';
  diemCuaEm?: number | null;
  datChuaDatCuaEm?: DatChuaDat | null;
  nhanXetCuaEm?: string | null;
  soLanDaNop: number;
  soLuotConLai?: number;
  luotDangLamId?: string | null;
  biKhoa?: boolean;
  lyDoKhoa?: string;
}

/** Ngoại lệ riêng từng học sinh: gia hạn, thêm giờ, thêm lượt (LMS-503) */
export interface NgoaiLeHocSinh {
  id: string;
  hoatDongId: string;
  hocSinhId: string;
  hocSinhTen: string;
  hanNopMoi?: string | null;
  themPhut?: number | null;
  themLuot?: number | null;
  lyDo: string;
  nguoiTao: string;
  ngayTao: string;
}

export interface TepDinhKem {
  ten: string;
  mime: string;
  kichThuoc: number;
  maTep?: string | null;
  duongDan?: string | null;
}

/** Một lần nộp bài tập */
export interface BaiNop {
  id: string;
  hoatDongId: string;
  hocSinhId: string;
  hocSinhTen: string;
  nhomId?: string | null;
  lanNop: number;
  noiDungHtml?: string | null;
  tep: TepDinhKem[];
  /** Nộp giấy — GV chỉ nhập điểm */
  laNopGiay: boolean;
  ngayNop: string;
  nopMuon: boolean;
  soNgayMuon: number;
}

// ───────────────────────── Đề KTĐG & làm bài ─────────────────────────

export interface DeKtdg {
  id: string;
  ma: string;
  ten: string;
  monHocId: string;
  monHocTen: string;
  khoi: number;
  chuDeIds: string[];
  chuDeTen: string[];
  nguon: NguonDe;
  mucDich: MucDichDe;
  soCau: number;
  tongDiem: number;
  thoiGianGoiYPhut: number;
  loaiCau: LoaiCauLms[];
  nguoiDuyet: string;
  ngayDuyet: string;
}

export interface PhanLoaiKtdg {
  monHoc: MonHoc[];
  khoi: number[];
  chuDe: { id: string; ten: string; monHocId: string; khoi: number }[];
  nguon: NguonDe[];
}

export interface PhuongAn {
  id: string;
  noiDungHtml: string;
}

/** Câu hỏi trong đề làm bài — KHÔNG có đáp án (docs/lms/99 mục 5.5) */
export interface CauHoiLamBai {
  id: string;
  /** Số thứ tự hiển thị (sau xáo) */
  so: number;
  loai: LoaiCauLms;
  noiDungHtml: string;
  diem: number;
  phuongAn?: PhuongAn[];
  /** Đúng/Sai nhiều ý */
  yDungSai?: PhuongAn[];
  /** Điền khuyết: số ô trống (ký hiệu [[1]], [[2]]… trong nội dung) */
  soOTrong?: number;
  /** Trả lời ngắn dạng số */
  donVi?: string | null;
  /** Nối cặp */
  veTrai?: PhuongAn[];
  vePhai?: PhuongAn[];
  /** Sắp xếp */
  mucSapXep?: PhuongAn[];
  /** Câu chùm */
  nguLieuHtml?: string | null;
  cauCon?: CauHoiLamBai[];
}

/** Đáp án một câu (chỉ ở xem trước của GV / màn chấm / sau công bố) */
export type DapAnCau =
  | { loai: 'mot-dap-an'; dung: string }
  | { loai: 'nhieu-dap-an'; dung: string[] }
  | { loai: 'dung-sai'; dung: Record<string, boolean> }
  | { loai: 'dien-khuyet'; chapNhan: string[][] }
  | { loai: 'tra-loi-ngan'; giaTri: number; saiSo: number }
  | { loai: 'tu-luan'; goiY: string }
  | { loai: 'noi-cap'; cap: Record<string, string> }
  | { loai: 'sap-xep'; thuTu: string[] }
  | { loai: 'chum' };

export interface CauHoiCoDapAn extends CauHoiLamBai {
  dapAn: DapAnCau;
  loiGiaiHtml?: string | null;
  cauCon?: CauHoiCoDapAn[];
}

export interface DeLamBai {
  snapshotId: string;
  tieuDe: string;
  thoiGianLamPhut: number | null;
  tongDiem: number;
  cauHoi: CauHoiLamBai[];
}

export interface DeXemTruoc extends Omit<DeLamBai, 'cauHoi'> {
  deId: string;
  cauHoi: CauHoiCoDapAn[];
}

/** Câu trả lời (JSON theo loại câu) */
export type TraLoiCau =
  | string // mot-dap-an (id phương án) | tra-loi-ngan | tu-luan (HTML)
  | string[] // nhieu-dap-an | dien-khuyet (theo ô) | sap-xep (thứ tự id)
  | Record<string, boolean> // dung-sai
  | Record<string, string> // noi-cap (trái → phải)
  | null;

export interface DiemCau {
  diem: number | null;
  toiDa: number;
  dung?: boolean | null;
  /** Câu cần chấm tay (tự luận) */
  canChamTay?: boolean;
  nhanXet?: string | null;
}

export interface SuKienLuotLam {
  thoiDiem: string;
  loai: 'bat-dau' | 'luu' | 'mat-ket-noi' | 'ket-noi-lai' | 'nop' | 'tu-nop' | 'cham-xong';
  chiTiet?: string;
}

export interface LuotLam {
  id: string;
  hoatDongId: string;
  hocSinhId: string;
  hocSinhTen: string;
  snapshotId: string;
  lanThu: number;
  hatGiong: number;
  batDau: string;
  /** Hết giờ (đã cộng thêm giờ riêng); null = không giới hạn */
  hanKetThuc: string | null;
  nopLuc?: string | null;
  tuNop: boolean;
  trangThai: TrangThaiLuotLam;
  traLoi: Record<string, TraLoiCau>;
  /** Phiên bản lưu tăng dần (chống ghi đè khi đồng bộ offline) */
  phienBanLuu: number;
  diemTheoCau?: Record<string, DiemCau>;
  /** Điểm quy đổi thang 10 */
  tongDiem?: number | null;
  canChamTay: boolean;
  soLanMatKetNoi: number;
  nhatKy: SuKienLuotLam[];
}

export interface BatDauLuotLamKetQua {
  luotLam: LuotLam;
  de: DeLamBai;
  chuKyTuLuuGiay: number;
}

export interface KetQuaLuotLamHs {
  luotLam: LuotLam;
  hoatDongTieuDe: string;
  daCongBoDiem: boolean;
  duocXemDapAn: boolean;
  /** Có đáp án khi được xem; ngược lại chỉ câu hỏi + câu trả lời của em */
  de: DeLamBai | DeXemTruoc;
}

// ───────────────────────── Thảo luận ─────────────────────────

export interface BaiThaoLuan {
  id: string;
  hoatDongId: string;
  chaId: string | null;
  tacGiaId: string;
  tacGiaTen: string;
  laGiaoVien: boolean;
  noiDungHtml: string;
  ngayDang: string;
}

export interface ThaoLuanHienThi {
  /** false = học sinh chưa đăng bài nên chưa được xem bài bạn */
  duocXemBaiBan: boolean;
  baiViet: BaiThaoLuan[];
}

// ───────────────────────── Chấm bài & sổ điểm ─────────────────────────

/** Ô sổ điểm lưu bền — nguồn duy nhất của điểm hoạt động (bảng lms_o_so_diem) */
export interface KetQuaHoatDong {
  id: string;
  hoatDongId: string;
  hocSinhId: string;
  diem: number | null;
  datChuaDat?: DatChuaDat | null;
  /** Điểm trước khi trừ nộp muộn */
  diemGoc?: number | null;
  diemTruMuon?: number | null;
  nhanXet?: string | null;
  diemRubric?: Record<string, string> | null;
  mien: boolean;
  daCongBo: boolean;
  ngayCongBo?: string | null;
  nguoiCham?: string | null;
  ngayCham?: string | null;
  daDayKtdg: boolean;
  ngayDayKtdg?: string | null;
}

export interface DongCham {
  hocSinh: HocSinhLms;
  trangThai: TrangThaiOSoDiem;
  soLanNop: number;
  nopLucCuoi?: string | null;
  nopMuon: boolean;
  diem: number | null;
  datChuaDat?: DatChuaDat | null;
  daCongBo: boolean;
  coNgoaiLe: boolean;
  luotLamIds?: string[];
}

export interface BaiCham {
  hoatDong: HoatDong;
  hocSinh: HocSinhLms;
  baiNop: BaiNop[];
  luotLam: LuotLam[];
  /** Đề có đáp án của lượt được chấm (bài kiểm tra) */
  de?: DeXemTruoc | null;
  ketQua: KetQuaHoatDong | null;
  rubric?: RubricLms | null;
  ngoaiLe?: NgoaiLeHocSinh | null;
}

export interface LuuChamDuLieu {
  diem?: number | null;
  datChuaDat?: DatChuaDat | null;
  nhanXet?: string | null;
  /** Bài kiểm tra: điểm câu tự luận theo id câu */
  diemCauTuLuan?: Record<string, { diem: number; nhanXet?: string }>;
  luotLamId?: string;
  diemRubric?: Record<string, string> | null;
  /** Bắt buộc khi sửa điểm đã công bố (LMS-603) */
  lyDo?: string;
}

export interface HangChoCham {
  hoatDongId: string;
  hoatDongTieuDe: string;
  loai: LoaiHoatDong;
  lopMonHocId: string;
  lopMonHocTen: string;
  soChoCham: number;
  hanNop?: string | null;
}

export interface CotSoDiem {
  hoatDongId: string;
  tieuDe: string;
  loai: LoaiHoatDong;
  thangDiem: ThangDiem;
  hanNop?: string | null;
  nhomDiemId?: string | null;
}

export interface OSoDiem {
  hoatDongId: string;
  hocSinhId: string;
  trangThai: TrangThaiOSoDiem;
  diem: number | null;
  datChuaDat?: DatChuaDat | null;
  daDayKtdg: boolean;
  nopMuon: boolean;
}

export interface NhomDiem {
  id: string;
  lopMonHocId: string;
  ten: string;
  /** Trọng số % (tổng các nhóm = 100) */
  trongSo: number;
}

export interface SoDiemLop {
  lopMonHoc: LopMonHoc;
  hocKy: HocKy;
  hocSinh: HocSinhLms[];
  cot: CotSoDiem[];
  o: OSoDiem[];
  nhomDiem: NhomDiem[];
  /** Điểm trung bình hoạt động theo HS (có trọng số khi bật nhóm) */
  trungBinh: Record<string, number | null>;
}

export interface NhatKyDiem {
  id: string;
  lopMonHocId: string;
  hoatDongId: string;
  hoatDongTieuDe: string;
  hocSinhId: string;
  hocSinhTen: string;
  hanhDong: 'cham' | 'sua' | 'cong-bo' | 'mien' | 'bo-mien' | 'day-ktdg' | 'tru-muon';
  giaTriCu: string | null;
  giaTriMoi: string | null;
  lyDo?: string | null;
  nguoiThucHien: string;
  thoiDiem: string;
}

export interface LanDayKtdg {
  id: string;
  lopMonHocId: string;
  hoatDongIds: string[];
  hoatDongTieuDe: string[];
  soDiem: number;
  trangThai: 'cho-gui' | 'da-gui' | 'loi';
  maTheoDoi: string;
  thoiDiem: string;
  nguoiThucHien: string;
  thongBaoLoi?: string | null;
}

// ───────────────────────── GĐ2: rubric, chuẩn đầu ra ─────────────────────────

export interface MucRubric {
  id: string;
  ten: string;
  moTa: string;
  /** null = dạng nhận xét không điểm (TT27) */
  diem: number | null;
}

export interface TieuChiRubric {
  id: string;
  ten: string;
  moTa?: string;
  muc: MucRubric[];
  chuanDauRaIds?: string[];
}

export interface RubricLms {
  id: string;
  ten: string;
  nguon: 'thu-vien-ktdg' | 'ca-nhan';
  khongDiem: boolean;
  monHocId?: string | null;
  tieuChi: TieuChiRubric[];
  nguoiTao: string;
}

export interface ChuanDauRa {
  id: string;
  ma: string;
  moTa: string;
  monHocId: string;
  khoi: number;
  chaId: string | null;
}

/** GĐ2 — lắp đề nhanh */
export interface CauHoiKtdgTomTat {
  id: string;
  ma: string;
  loai: LoaiCauLms;
  noiDungRutGon: string;
  mucDo: 'nhan-biet' | 'thong-hieu' | 'van-dung' | 'van-dung-cao';
  chuDeId: string;
  chuDeTen: string;
  diem: number;
}

export interface QuyTacBoc {
  chuDeId?: string | null;
  mucDo: CauHoiKtdgTomTat['mucDo'];
  soCau: number;
}

// ───────────────────────── Tiến độ, lịch, báo cáo ─────────────────────────

export interface TienDoHocSinhLop {
  hocSinh: HocSinhLms;
  theoModule: { moduleId: string; daHoanThanh: number; tongMuc: number }[];
  tyLe: number;
}

export interface TienDoLop {
  module: { id: string; ten: string; tongMuc: number }[];
  hocSinh: TienDoHocSinhLop[];
}

export interface SuKienLich {
  id: string;
  loai: 'han-nop' | 'mo-bai' | 'bai-kiem-tra';
  tieuDe: string;
  thoiDiem: string;
  hoatDongId: string;
  lopMonHocId: string;
  lopMonHocTen: string;
  loaiHoatDong: LoaiHoatDong;
}

export interface PhienDangChay {
  hoatDongId: string;
  tieuDe: string;
  lopMonHocId: string;
  lopMonHocTen: string;
  giaoVienTen: string;
  batDau?: string | null;
  ketThuc?: string | null;
  tongHocSinh: number;
  soDangLam: number;
  soDaNop: number;
  soLoiLuu: number;
  soMatKetNoi: number;
  soChoCham: number;
}

export interface ChiSoTongQuan {
  nhan: string;
  giaTri: number;
  donVi?: string;
  moTa?: string;
}

export interface BaoCaoTruong {
  chiSo: ChiSoTongQuan[];
  theoMon: { monHocTen: string; soLop: number; soHoatDong: number; tyLeNop: number; diemTb: number | null }[];
  theoKhoi: { khoi: number; soLop: number; tienDoTb: number; diemTb: number | null }[];
  theoGiaoVien: { giaoVienTen: string; soLop: number; soHoatDong: number; soChoCham: number; lanHoatDongCuoi?: string | null }[];
  hoatDongTheoTuan: { tuan: string; soHoatDong: number; soBaiNop: number }[];
}

/** So sánh kết quả giữa các lớp cùng Master (LMS-113, GĐ2) */
export interface SoSanhLopMaster {
  hoatDong: { masterItemId: string; tieuDe: string }[];
  lop: { lopMonHocId: string; lopMonHocTen: string; diemTb: Record<string, number | null>; tyLeNop: Record<string, number> }[];
}

export interface TongQuanCon {
  hocSinh: HocSinhLms;
  lopMonHoc: (LopMonHoc & { tienDo: number; diemTb: number | null })[];
  sapDenHan: HoatDongCuaHocSinh[];
  diemMoi: (HoatDongCuaHocSinh & { ngayCongBo?: string | null })[];
  thongBao: (ThongBaoLop & { lopMonHocTen: string })[];
}

export interface TrangChuHocSinh {
  lopMonHoc: (LopMonHoc & { tienDo: number; soViecCanLam: number })[];
  sapDenHan: HoatDongCuaHocSinh[];
  thongBao: (ThongBaoLop & { lopMonHocTen: string })[];
  diemMoi: HoatDongCuaHocSinh[];
}

export interface TongQuanGiaoVien {
  lop: LopMonHocTomTat[];
  hangChoCham: HangChoCham[];
  sapDenHan: (HoatDongTomTat & { lopMonHocTen: string })[];
  phienDangChay: PhienDangChay[];
  masterDuocPhanCong: LopMaster[];
}

/** Tham chiếu một không gian học (lớp môn học hoặc Lớp Master) */
export interface KhongGianRef {
  loai: LoaiKhongGian;
  id: string;
}

/** Tóm tắt không gian đang mở (header không gian) */
export interface KhongGianTomTat {
  loai: LoaiKhongGian;
  id: string;
  ten: string;
  monHocTen: string;
  khoi: number;
  /** Người xem được soạn/sửa nội dung */
  duocSoan: boolean;
  /** Người xem được chấm */
  duocCham: boolean;
  /** Chỉ đọc (lưu trữ / Master ngừng sử dụng / chỉ xem) */
  chiDoc: boolean;
  lyDoChiDoc?: string;
  lopMonHoc?: LopMonHoc;
  master?: LopMaster;
}

/** Báo cáo tổng hợp cấp trên (Phường/Xã, Sở) */
export interface BaoCaoCapTren {
  chiSo: ChiSoTongQuan[];
  truong: {
    truongId: string;
    ten: string;
    lmsDaBat: boolean;
    soLopMonHoc: number;
    soLopCoHoatDong: number;
    soHoatDong: number;
    soBaiNop: number;
    diemTb: number | null;
  }[];
}

/** Sự kiện tích hợp (outbox) — phục vụ đối soát LMS ↔ KTĐG */
export interface SuKienTichHop {
  id: string;
  suKien: string;
  khoa: string;
  payload: unknown;
  thoiDiem: string;
}

export interface DoiSoatKtdg {
  soDiemDaDay: number;
  soDiemKtdgDaNhan: number;
  lech: { hoatDongId: string; hoatDongTieuDe: string; hocSinhId: string; hocSinhTen: string; diemLms: number | null; diemKtdg: number | null }[];
}
