import logoKhaoThiSo from './tai-nguyen/logo-khao-thi-so.png';

/** Nhận diện sản phẩm — dùng chung mọi web (header, trang đăng nhập, tiêu đề tab) */
export const thuongHieu = {
  ten: 'KHẢO THÍ SỐ',
  tenThuong: 'Khảo thí số',
  vietTat: 'KTS',
  tenMien: 'khaothiso.com.vn',
  moTa: 'NHCH - Thi/Kiểm tra - Học tập',
  logo: logoKhaoThiSo,
} as const;

/**
 * Bảng màu lấy từ icon sản phẩm: xanh đậm góc dưới-trái (#0B508B) → xanh công vụ ở thân
 * (#1E6198) → xanh trời góc trên-phải (#6DB2DB), nét chữ trắng. Giữ đồng bộ với `:root`
 * trong giao-dien.scss (theme antd cần giá trị hex, không đọc được CSS var).
 */
export const bangMau = {
  xanhDam: '#0b3f73',
  primary: '#14599a',
  primaryHover: '#2a70b0',
  primaryDark: '#0d4a84',
  primaryLight: '#eaf2fa',
  primaryVien: '#b7d0e8',
  xanhTroi: '#5fa8da',
  do: '#c62828',
  vang: '#d99a1e',
  success: '#1f7a3d',
  warning: '#b45309',
  info: '#1769aa',
  nenTrang: '#f1f4f8',
  nenBox: '#ffffff',
  nenHeaderBox: '#f6f9fc',
  vien: '#dce3eb',
  vienDam: '#c3cfdc',
  chu: '#1b2a3a',
  chuPhu: '#55657a',
  voHieu: '#98a4b3',
  nenVoHieu: '#eef1f5',
} as const;
