/** Phân loại tài liệu → trình xem tương ứng */

export type KieuTaiLieu =
  | 'word'
  | 'powerpoint'
  | 'excel'
  | 'pdf'
  | 'text'
  | 'anh'
  | 'video'
  | 'khac';

const DUOI_TEXT = new Set([
  'txt', 'json', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'c', 'cpp', 'h',
  'cs', 'java', 'sql', 'md', 'csv', 'xml', 'pas', 'log', 'ini', 'yaml', 'yml',
]);

export const layDuoiTep = (ten: string) => (ten.split('.').pop() ?? '').toLowerCase();

export function phanLoaiTaiLieu(ten: string, mime = ''): KieuTaiLieu {
  const duoi = layDuoiTep(ten);
  if (duoi === 'docx' || duoi === 'doc' || duoi === 'docm') return 'word';
  if (duoi === 'pptx' || duoi === 'ppt' || duoi === 'pptm') return 'powerpoint';
  if (duoi === 'xlsx' || duoi === 'xls' || duoi === 'xlsm') return 'excel';
  if (mime === 'application/pdf' || duoi === 'pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'anh';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('text/') || DUOI_TEXT.has(duoi)) return 'text';
  return 'khac';
}

/** Trình duyệt tự hiển thị được (không cần máy chủ chuyển đổi) */
export const hienThiDuocTrenTrinhDuyet = (ten: string, mime = ''): boolean => {
  const duoi = layDuoiTep(ten);
  const kieu = phanLoaiTaiLieu(ten, mime);
  if (kieu === 'word') return duoi === 'docx';
  if (kieu === 'powerpoint') return duoi === 'pptx';
  return kieu !== 'excel' && kieu !== 'khac';
};

export const nhanKieuTaiLieu: Record<KieuTaiLieu, string> = {
  word: 'Word',
  powerpoint: 'PowerPoint',
  excel: 'Excel',
  pdf: 'PDF',
  text: 'Văn bản',
  anh: 'Ảnh',
  video: 'Video',
  khac: 'Tệp',
};
