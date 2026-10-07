/**
 * Nội dung tệp LMS (tài liệu học tập, bài nộp): `duongDan` là đường dẫn endpoint tải tệp CÓ KIỂM QUYỀN của backend LMS
 * (D7 — không có URL công khai), VD `/api/v1/lms/tep/{id}/noi-dung`. Nội dung lấy bằng axios client của web (kèm access
 * token, tự làm mới khi 401, header `X-Vai-Tro-Lms`) dạng blob → object URL; nơi dùng PHẢI giải phóng (`giaiPhong`).
 */
import { layDuoiTep, phanLoaiTaiLieu } from '../trinh-xem-tai-lieu';
import { layApiLms, layHeaderVaiTroLms } from './api';

/** URL xem được của tệp + hàm giải phóng (object URL tạo từ blob phải `revokeObjectURL` khi xong) */
export interface UrlTep {
  url: string;
  giaiPhong: () => void;
}

const khongLamGi = () => {};

/** Đường dẫn cùng origin → đường dẫn tương đối với `baseURL=/api` của axios client */
function duongDanApi(duongDan: string): string | null {
  let dd = duongDan;
  if (/^https?:\/\//i.test(dd)) {
    try {
      const u = new URL(dd);
      if (u.origin !== window.location.origin) return null;
      dd = `${u.pathname}${u.search}`;
    } catch {
      return null;
    }
  }
  if (dd.startsWith('/api/')) return dd.slice(4);
  if (dd.startsWith('/v1/')) return dd;
  return null;
}

/**
 * Tải nội dung tệp dạng Blob — endpoint có kiểm quyền, kèm token của cổng đăng nhập chung.
 * URL khác origin (URL ký ngắn hạn của kho đối tượng, nếu backend dùng) → fetch không kèm thông tin xác thực.
 */
export async function taiNoiDungTepThat(duongDan: string): Promise<Blob> {
  const api = duongDanApi(duongDan);
  if (api) {
    const phanHoi = await layApiLms().get<Blob>(api, {
      responseType: 'blob',
      headers: layHeaderVaiTroLms(),
      khongThongBao: true,
    });
    return phanHoi.data;
  }
  const phanHoi = await fetch(duongDan, { credentials: 'omit' });
  if (!phanHoi.ok) throw new Error(`Không tải được tệp (${phanHoi.status})`);
  return phanHoi.blob();
}

/**
 * Khóa/URL lưu trong `duongDan` → URL xem/tải được ở trình duyệt; null = tệp không có nội dung.
 * Luôn tạo object URL MỚI (gọi `giaiPhong` khi xong).
 */
export async function moUrlTep(duongDan?: string | null): Promise<UrlTep | null> {
  if (!duongDan) return null;
  // data:/blob: (nội dung cục bộ) dùng thẳng; còn lại tải blob có kiểm quyền — không dùng URL trần
  if (duongDan.startsWith('data:') || duongDan.startsWith('blob:')) return { url: duongDan, giaiPhong: khongLamGi };
  const blob = await taiNoiDungTepThat(duongDan);
  const url = URL.createObjectURL(blob);
  return { url, giaiPhong: () => URL.revokeObjectURL(url) };
}

/** Loại hiển thị của tệp: xem trực tuyến ngay (ảnh, video, âm thanh, PDF, docx, pptx, văn bản) hay chỉ tải về */
export function cachHienThiTep(ten: string, mime = ''): 'xem' | 'am-thanh' | 'tai-ve' {
  if (mime.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'ogg'].includes(layDuoiTep(ten))) return 'am-thanh';
  const kieu = phanLoaiTaiLieu(ten, mime || mimeTheoDuoi(ten));
  const duoi = layDuoiTep(ten);
  if (kieu === 'word') return duoi === 'docx' ? 'xem' : 'tai-ve';
  if (kieu === 'powerpoint') return duoi === 'pptx' ? 'xem' : 'tai-ve';
  if (kieu === 'excel' || kieu === 'khac') return 'tai-ve';
  return 'xem';
}

/** Đoán MIME theo đuôi khi trình duyệt không cung cấp */
export function mimeTheoDuoi(ten: string): string {
  const d = layDuoiTep(ten);
  const bang: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return bang[d] ?? 'application/octet-stream';
}
