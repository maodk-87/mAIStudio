/**
 * Hằng + nhãn hiển thị của hệ LMS (giá trị mã khớp `@/types/lms`). Không dùng `enum` (erasableSyntaxOnly).
 */
import type {
  CachLayDiem,
  CapChuongTrinh,
  CongBoDapAn,
  CongBoDiem,
  DieuKienHoanThanh,
  KetQuaDayXuongMa,
  HinhThucNop,
  LoaiCauLms,
  LoaiHoatDong,
  LoaiMuc,
  LopMaster,
  MucDichDe,
  NguonDe,
  ThangDiem,
  TrangThaiHoatDong,
  TrangThaiLuotLam,
  TrangThaiMaster,
  TrangThaiOSoDiem,
  VaiTroLms,
} from './types';

/** Permission hệ LMS `lms.[doi_tuong].[hanh_dong]` (docs/lms/03-phan-quyen-lms.md) */
export const Quyen = {
  LopMonHocXem: 'lms.lop_mon_hoc.xem',
  MasterXem: 'lms.lop_master.xem',
  MasterTao: 'lms.lop_master.tao',
  MasterSua: 'lms.lop_master.sua',
  MasterXoa: 'lms.lop_master.xoa',
  MasterPhanCong: 'lms.lop_master.phan_cong',
  MasterGanLop: 'lms.lop_master.gan_lop',
  MasterPhatHanh: 'lms.lop_master.phat_hanh',
  MasterSaoChep: 'lms.lop_master.sao_chep',
  ModuleXem: 'lms.module_hoc.xem',
  ModuleTao: 'lms.module_hoc.tao',
  ModuleSua: 'lms.module_hoc.sua',
  ModuleXoa: 'lms.module_hoc.xoa',
  NoiDungXem: 'lms.noi_dung.xem',
  NoiDungTao: 'lms.noi_dung.tao',
  NoiDungSua: 'lms.noi_dung.sua',
  NoiDungXoa: 'lms.noi_dung.xoa',
  TepXem: 'lms.tep.xem',
  TepTaiLen: 'lms.tep.tai_len',
  TepXoa: 'lms.tep.xoa',
  ThongBaoXem: 'lms.thong_bao.xem',
  ThongBaoTao: 'lms.thong_bao.tao',
  ThongBaoXoa: 'lms.thong_bao.xoa',
  HoatDongXem: 'lms.hoat_dong.xem',
  HoatDongTao: 'lms.hoat_dong.tao',
  HoatDongSua: 'lms.hoat_dong.sua',
  HoatDongXoa: 'lms.hoat_dong.xoa',
  HoatDongGiao: 'lms.hoat_dong.giao',
  BaiNopNop: 'lms.bai_nop.nop',
  BaiNopXem: 'lms.bai_nop.xem',
  ChamBaiCham: 'lms.cham_bai.cham',
  ChamBaiCongBo: 'lms.cham_bai.cong_bo',
  ChamBaiGiaHan: 'lms.cham_bai.gia_han',
  SoDiemXem: 'lms.so_diem.xem',
  SoDiemSua: 'lms.so_diem.sua',
  SoDiemXuat: 'lms.so_diem.xuat',
  SoDiemDayKtdg: 'lms.so_diem.day_ktdg',
  SoDiemKhoa: 'lms.so_diem.khoa',
  ThaoLuanDang: 'lms.thao_luan.dang',
  ThaoLuanQuanLy: 'lms.thao_luan.quan_ly',
  NhomHocSinhQuanLy: 'lms.nhom_hoc_sinh.quan_ly',
  TienDoXem: 'lms.tien_do.xem',
  BaoCaoXemLop: 'lms.bao_cao.xem_lop',
  BaoCaoXemTo: 'lms.bao_cao.xem_to',
  BaoCaoXemTruong: 'lms.bao_cao.xem_truong',
  GiamSatXem: 'lms.giam_sat.xem',
  CauHinhXem: 'lms.cau_hinh.xem',
  CauHinhSua: 'lms.cau_hinh.sua',
} as const;

export const nhanVaiTro: Record<VaiTroLms, string> = {
  'hoc-sinh': 'Học sinh',
  'phu-huynh': 'Phụ huynh',
  'giao-vien': 'Giáo viên bộ môn',
  'tro-giang': 'Trợ giảng',
  'to-truong': 'Tổ trưởng chuyên môn',
  'ban-giam-hieu': 'Ban giám hiệu',
  'giao-vu': 'Giáo vụ / Quản trị trường',
  'quan-tri-cap-tren': 'Quản trị cấp trên',
  'chuyen-vien': 'Chuyên viên',
};

export const nhanLoaiHoatDong: Record<LoaiHoatDong, string> = {
  'bai-tap': 'Bài tập',
  'bai-kiem-tra': 'Bài kiểm tra trực tuyến',
  'thao-luan': 'Thảo luận',
  'bai-tap-nhom': 'Bài tập nhóm',
  'ghi-am': 'Nộp ghi âm',
  'khao-sat': 'Khảo sát',
  'cham-cheo': 'Chấm chéo',
  'diem-danh': 'Điểm danh',
  'buoi-hoc-truc-tuyen': 'Buổi học trực tuyến',
};

/** Giai đoạn triển khai của từng loại hoạt động (docs/lms/99 mục 4.4) */
export const giaiDoanLoaiHoatDong: Record<LoaiHoatDong, 1 | 2 | 3> = {
  'bai-tap': 1,
  'bai-kiem-tra': 1,
  'thao-luan': 2,
  'bai-tap-nhom': 2,
  'ghi-am': 2,
  'khao-sat': 3,
  'cham-cheo': 3,
  'diem-danh': 3,
  'buoi-hoc-truc-tuyen': 3,
};

export const mauLoaiHoatDong: Record<LoaiHoatDong, string> = {
  'bai-tap': 'blue',
  'bai-kiem-tra': 'purple',
  'thao-luan': 'cyan',
  'bai-tap-nhom': 'geekblue',
  'ghi-am': 'magenta',
  'khao-sat': 'gold',
  'cham-cheo': 'volcano',
  'diem-danh': 'lime',
  'buoi-hoc-truc-tuyen': 'orange',
};

export const nhanTrangThaiHoatDong: Record<TrangThaiHoatDong, { nhan: string; mau: string }> = {
  nhap: { nhan: 'Nháp', mau: 'default' },
  'da-giao': { nhan: 'Đã giao', mau: 'processing' },
  'da-dong': { nhan: 'Đã đóng', mau: 'default' },
};

/** Hậu tố cấp của chương trình học — cấp Trường không hiển thị cấp (LMS-115) */
export const nhanCapChuongTrinh: Record<CapChuongTrinh, string> = {
  bo: 'cấp Bộ',
  so: 'cấp Sở',
  'phuong-xa': 'cấp Phường/Xã',
  truong: '',
};

/**
 * Tên hiển thị của Lớp Master trên giao diện (LMS-115): "Chương trình học" + cấp; cấp Trường chỉ "Chương trình học".
 * Mọi màn dùng hàm này — không viết cứng "Lớp Master".
 */
export const nhanChuongTrinhHoc = (cap: CapChuongTrinh = 'truong'): string =>
  nhanCapChuongTrinh[cap] ? `Chương trình học ${nhanCapChuongTrinh[cap]}` : 'Chương trình học';

/** Nhãn nguồn của chương trình nhận từ cấp trên: "Nhận từ: Chương trình học cấp … — {tên} (bản n)" (LMS-114c) */
export const nhanNguonCapTren = (m: Pick<LopMaster, 'masterCapTrenCap' | 'masterCapTrenTen' | 'phienBanCapTrenDaNhan'>): string =>
  `Nhận từ: ${nhanChuongTrinhHoc(m.masterCapTrenCap ?? undefined)} — ${m.masterCapTrenTen ?? ''}${m.phienBanCapTrenDaNhan ? ` (bản ${m.phienBanCapTrenDaNhan})` : ''}`;

export const nhanTrangThaiMaster: Record<TrangThaiMaster, { nhan: string; mau: string }> = {
  'dang-soan': { nhan: 'Đang soạn', mau: 'warning' },
  'da-phat-hanh': { nhan: 'Đã phát hành', mau: 'success' },
  'ngung-su-dung': { nhan: 'Ngừng sử dụng', mau: 'default' },
};

/** Kết quả đẩy chương trình cấp trên xuống đơn vị trực thuộc (LMS-114c) */
export const nhanKetQuaDayXuong: Record<KetQuaDayXuongMa, { nhan: string; mau: string }> = {
  'thanh-cong': { nhan: 'Đã nhận', mau: 'success' },
  'bo-qua': { nhan: 'Bỏ qua', mau: 'default' },
  loi: { nhan: 'Lỗi', mau: 'error' },
};

/** Lý do đơn vị không nhận / bỏ qua khi đẩy xuống (LMS-114c, MH-37) */
export const nhanLyDoDayXuong: Record<string, string> = {
  'lms-chua-bat': 'Chưa bật LMS',
  'khong-co-khoi': 'Không có khối',
  'bo-chon': 'Không chọn khi phát hành',
};

/** Nhãn loại nhân sự phân công soạn (LMS-114b) */
export const nhanLoaiNhanSuSoan: Record<'giao-vien' | 'chuyen-vien', string> = {
  'giao-vien': 'Giáo viên',
  'chuyen-vien': 'Chuyên viên',
};

export const nhanTrangThaiOSoDiem: Record<TrangThaiOSoDiem, { nhan: string; mau: string }> = {
  'chua-den-han': { nhan: 'Chưa đến hạn', mau: 'default' },
  'chua-nop': { nhan: 'Chưa nộp', mau: 'error' },
  'nop-muon': { nhan: 'Nộp muộn', mau: 'warning' },
  mien: { nhan: 'Miễn', mau: 'default' },
  'dang-cham': { nhan: 'Đang chấm', mau: 'processing' },
  'da-cham': { nhan: 'Đã chấm', mau: 'blue' },
  'da-cong-bo': { nhan: 'Đã công bố', mau: 'success' },
};

export const nhanTrangThaiLuotLam: Record<TrangThaiLuotLam, { nhan: string; mau: string }> = {
  'dang-lam': { nhan: 'Đang làm', mau: 'processing' },
  'da-nop': { nhan: 'Đã nộp', mau: 'blue' },
  'dang-cham': { nhan: 'Đang chấm', mau: 'warning' },
  'da-cham': { nhan: 'Đã chấm', mau: 'success' },
};

export const nhanTrangThaiCuaEm: Record<string, { nhan: string; mau: string }> = {
  'chua-lam': { nhan: 'Chưa làm', mau: 'default' },
  'dang-lam': { nhan: 'Đang làm', mau: 'processing' },
  'da-nop': { nhan: 'Đã nộp', mau: 'blue' },
  'nop-muon': { nhan: 'Nộp muộn', mau: 'warning' },
  'da-cham': { nhan: 'Đã có điểm', mau: 'success' },
  'qua-han': { nhan: 'Quá hạn', mau: 'error' },
  mien: { nhan: 'Được miễn', mau: 'default' },
};

export const nhanLoaiMuc: Record<LoaiMuc, string> = {
  trang: 'Trang nội dung',
  tep: 'Tệp',
  'hoat-dong': 'Hoạt động',
  'lien-ket': 'Liên kết ngoài',
};

export const nhanDieuKienHoanThanh: Record<DieuKienHoanThanh, string> = {
  xem: 'Đã xem',
  nop: 'Đã nộp bài',
  'dat-diem': 'Đạt điểm tối thiểu',
};

export const nhanThangDiem: Record<ThangDiem, string> = {
  'thang-10': 'Thang điểm 10',
  'dat-chua-dat': 'Đạt / Chưa đạt',
};

export const nhanCachLayDiem: Record<CachLayDiem, string> = {
  'cao-nhat': 'Lấy điểm cao nhất',
  'gan-nhat': 'Lấy điểm lượt gần nhất',
};

export const nhanCongBoDapAn: Record<CongBoDapAn, string> = {
  'ngay-khi-nop': 'Ngay khi học sinh nộp bài',
  'sau-han': 'Sau khi hết hạn làm bài',
  'thu-cong': 'Khi giáo viên công bố',
  khong: 'Không công bố đáp án',
};

export const nhanCongBoDiem: Record<CongBoDiem, string> = {
  'tu-dong': 'Tự động khi chấm xong',
  'thu-cong': 'Giáo viên công bố thủ công',
};

export const nhanHinhThucNop: Record<HinhThucNop, string> = {
  'van-ban': 'Soạn văn bản',
  tep: 'Tải tệp lên',
  giay: 'Nộp giấy (chỉ nhập điểm)',
  'ghi-am': 'Ghi âm',
};

export const nhanLoaiCau: Record<LoaiCauLms, string> = {
  'mot-dap-an': 'Một đáp án đúng',
  'nhieu-dap-an': 'Nhiều đáp án đúng',
  'dung-sai': 'Đúng/Sai',
  'dien-khuyet': 'Điền khuyết',
  'tra-loi-ngan': 'Trả lời ngắn',
  'tu-luan': 'Tự luận',
  chum: 'Câu hỏi chùm',
  'noi-cap': 'Nối cặp',
  'sap-xep': 'Sắp xếp thứ tự',
};

export const nhanMucDichDe: Record<MucDichDe, string> = {
  dgtx: 'Đánh giá thường xuyên',
  'luyen-tap': 'Luyện tập',
  dgdk: 'Đánh giá định kỳ',
};

export const nhanNguonDe: Record<NguonDe, string> = {
  bo: 'Bộ GD&ĐT',
  so: 'Sở GD&ĐT',
  'phuong-xa': 'Phường/Xã',
  truong: 'Kho Trường',
  to: 'Kho Tổ',
  'ca-nhan': 'Kho cá nhân',
  dvcc: 'Đơn vị cung cấp',
};

export const nhanMucDo: Record<string, string> = {
  'nhan-biet': 'Nhận biết',
  'thong-hieu': 'Thông hiểu',
  'van-dung': 'Vận dụng',
  'van-dung-cao': 'Vận dụng cao',
};

/** Mã lỗi nghiệp vụ LMS (problem+json `maLoi`) — docs/lms/05 */
export const MaLoiLms = {
  ChuaKichHoat: 'LMS_CHUA_KICH_HOAT',
  ConPhienMo: 'LMS_CON_PHIEN_MO',
  KhongCoQuyen: 'LMS_KHONG_CO_QUYEN',
  MasterDangGan: 'LMS_MASTER_DANG_GAN_LOP',
  MasterKhongKhop: 'LMS_MASTER_KHONG_KHOP_MON_KHOI',
  MasterChuaPhatHanh: 'LMS_MASTER_CHUA_PHAT_HANH',
  VuotDungLuong: 'LMS_VUOT_DUNG_LUONG',
  TepQuaLon: 'LMS_TEP_QUA_LON',
  DinhDangTep: 'LMS_DINH_DANG_TEP',
  HetLuotLam: 'LMS_HET_LUOT_LAM',
  HetHanNop: 'LMS_HET_HAN_NOP',
  HetLanNop: 'LMS_HET_LAN_NOP',
  ChuaMo: 'LMS_HOAT_DONG_CHUA_MO',
  LuotDaNop: 'LMS_LUOT_DA_NOP',
  SaiMaTruyCap: 'LMS_SAI_MA_TRUY_CAP',
  HocKyDaKhoa: 'LMS_HOC_KY_DA_KHOA',
  CanLyDo: 'LMS_CAN_LY_DO',
  DeKhongHopLe: 'LMS_DE_KHONG_HOP_LE',
  LopLuuTru: 'LMS_LOP_LUU_TRU',
  MucBiKhoa: 'LMS_MUC_BI_KHOA',
  ChuaDuDieuKien: 'LMS_CHUA_DU_DIEU_KIEN',
  MasterTrungTen: 'LMS_MASTER_TRUNG_TEN',
  MasterNgung: 'LMS_MASTER_NGUNG',
  PhuHuynhTat: 'LMS_PHU_HUYNH_TAT',
  TinhNangChuaBat: 'LMS_TINH_NANG_CHUA_BAT',
  MasterCapTrenKhongGanLop: 'LMS_MASTER_CAP_TREN_KHONG_GAN_LOP',
  MasterDaDayXuong: 'LMS_MASTER_DA_DAY_XUONG',
  NhanSuNgoaiPhamVi: 'LMS_NHAN_SU_NGOAI_PHAM_VI',
  PhatHanhChiChuyenVien: 'LMS_PHAT_HANH_CHI_CHUYEN_VIEN',
  KhoiKhongThuocPhamVi: 'LMS_KHOI_KHONG_THUOC_PHAM_VI',
} as const;
