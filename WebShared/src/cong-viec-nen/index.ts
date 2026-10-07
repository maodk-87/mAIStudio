/**
 * @web-shared/cong-viec-nen — theo dõi JOB NỀN + tải tệp kết quả (apis/00 §5.1, apis/02 §8, apis/23 §1.1).
 *
 * Endpoint xuất của module trả `202 { jobId, trangThai, duongDanTheoDoi, duongDanTaiTep }` → poll
 * `GET /api/v1/nen-tang/cong-viec-nen/{id}` tới `xong | loi` → `GET …/{id}/tep` (proxy từ kho S3, chỉ chủ job).
 * Job `loi` vẫn có thể kèm `ketQua` (dữ liệu nghiệp vụ) — màn dùng làm DỰ PHÒNG dựng tệp tại trình duyệt (VD `LOI_DUNG_TEP`).
 */
import type { AxiosRequestConfig } from 'axios';
import { layApiMacDinh, LoiApi } from '../api';
import { taiTep } from '../xuat-tep/taiTep';

export type TrangThaiCongViecNen = 'cho-xu-ly' | 'dang-xu-ly' | 'xong' | 'loi';

export interface LoiCongViecNen {
  status: number;
  type: string;
  title: string;
  detail?: string;
  maLoi?: string;
  errors?: Record<string, string[]>;
}

export interface CongViecNen<T = unknown> {
  id: string;
  loai: string;
  moTa: string;
  trangThai: TrangThaiCongViecNen;
  tienDo: number;
  buocHienTai?: string;
  soLanThu: number;
  soLanThuToiDa: number;
  taoLuc: string;
  batDauLuc?: string;
  ketThucLuc?: string;
  coTep: boolean;
  tenTep?: string;
  loaiNoiDung?: string;
  kichThuocTep?: number;
  tepHetHanLuc?: string;
  ketQua?: T;
  loi?: LoiCongViecNen;
  doiTuongId?: string;
}

/** Thân 202 của endpoint tạo job. */
export interface CongViecNenDaTao {
  jobId: string;
  trangThai: TrangThaiCongViecNen;
  duongDanTheoDoi: string;
  duongDanTaiTep: string;
}

const GOC = '/v1/nen-tang/cong-viec-nen';

/** Lỗi job (`trangThai = loi`) — `congViec.ketQua` có thể còn dữ liệu để dựng dự phòng. */
export class LoiJobNen<T = unknown> extends Error {
  congViec: CongViecNen<T>;

  constructor(congViec: CongViecNen<T>) {
    super(congViec.loi?.detail || congViec.loi?.title || 'Công việc nền bị lỗi.');
    this.name = 'LoiJobNen';
    this.congViec = congViec;
  }

  get maLoi(): string | undefined {
    return this.congViec.loi?.maLoi;
  }

  /** Lỗi hạ tầng (dựng tệp/kho/hệ thống) — nên chuyển sang dựng tại trình duyệt; lỗi nghiệp vụ (4xx) thì báo người dùng. */
  get laLoiHaTang(): boolean {
    return (this.congViec.loi?.status ?? 500) >= 500;
  }
}

export const layCongViecNen = async <T = unknown>(id: string): Promise<CongViecNen<T>> =>
  (await layApiMacDinh().get<CongViecNen<T>>(`${GOC}/${id}`, { khongThongBao: true } as AxiosRequestConfig)).data;

export interface TuyChonCho<T> {
  /** Khoảng poll (ms) — mặc định 1000, tăng dần tới 4000. */
  khoangCachMs?: number;
  /** Thời gian chờ tối đa (ms) — mặc định 180000. */
  thoiGianToiDaMs?: number;
  khiCapNhat?: (cv: CongViecNen<T>) => void;
  signal?: AbortSignal;
}

const ngu = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Đã hủy', 'AbortError'));
    });
  });

/** Poll tới khi `xong` (trả job) hoặc `loi` (ném `LoiJobNen`); quá hạn chờ → ném Error. */
export async function choCongViecNen<T = unknown>(id: string, tuyChon: TuyChonCho<T> = {}): Promise<CongViecNen<T>> {
  const batDau = Date.now();
  let khoang = tuyChon.khoangCachMs ?? 1000;
  for (;;) {
    const cv = await layCongViecNen<T>(id);
    tuyChon.khiCapNhat?.(cv);
    if (cv.trangThai === 'xong') return cv;
    if (cv.trangThai === 'loi') throw new LoiJobNen<T>(cv);
    if (Date.now() - batDau > (tuyChon.thoiGianToiDaMs ?? 180000))
      throw new Error('Công việc nền chưa xong sau thời gian chờ — xem lại sau ở danh sách công việc.');
    await ngu(khoang, tuyChon.signal);
    khoang = Math.min(4000, Math.round(khoang * 1.5));
  }
}

/** Tên tệp từ header Content-Disposition (ưu tiên filename*=UTF-8''…). */
function tenTuHeader(cd?: string): string | undefined {
  if (!cd) return undefined;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (utf8) return decodeURIComponent(utf8[1]);
  const thuong = /filename="?([^";]+)"?/i.exec(cd);
  return thuong?.[1];
}

/** Tải tệp kết quả job về máy (blob qua API — kiểm chủ job). */
export async function taiTepCongViecNen(id: string, tenMacDinh?: string): Promise<void> {
  const r = await layApiMacDinh().get<Blob>(`${GOC}/${id}/tep`, { responseType: 'blob', khongThongBao: true } as AxiosRequestConfig);
  const ten = tenTuHeader(r.headers['content-disposition'] as string | undefined) ?? tenMacDinh ?? 'tep';
  taiTep(r.data, ten);
}

export interface KetQuaChayCongViecNen<T> {
  congViec: CongViecNen<T>;
  /** Dữ liệu nghiệp vụ job trả (VD HoSoIn / GoiLuuTru) — có cả khi job lỗi dựng tệp. */
  duLieu?: T;
  /** true: đã tải tệp máy chủ; false: job lỗi hạ tầng — màn tự dựng dự phòng từ `duLieu`. */
  daTaiTep: boolean;
  loi?: LoiJobNen<T>;
}

/**
 * Tạo job (gọi `batDau` → 202) → chờ xong → (tùy chọn) tải tệp. Lỗi NGHIỆP VỤ của job → ném `LoiJobNen` (màn báo lỗi);
 * lỗi HẠ TẦNG (5xx: dựng tệp, kho, quá số lần thử) → trả `{ daTaiTep: false, duLieu, loi }` để màn dựng dự phòng tại trình duyệt.
 */
export async function chayCongViecNen<T = unknown>(
  batDau: () => Promise<CongViecNenDaTao>,
  tuyChon: TuyChonCho<T> & { taiVe?: boolean; tenTepMacDinh?: string } = {},
): Promise<KetQuaChayCongViecNen<T>> {
  const tao = await batDau();
  try {
    const cv = await choCongViecNen<T>(tao.jobId, tuyChon);
    if (tuyChon.taiVe !== false && cv.coTep) await taiTepCongViecNen(cv.id, cv.tenTep ?? tuyChon.tenTepMacDinh);
    return { congViec: cv, duLieu: cv.ketQua, daTaiTep: tuyChon.taiVe !== false && cv.coTep };
  } catch (e) {
    if (e instanceof LoiJobNen && e.laLoiHaTang) return { congViec: e.congViec as CongViecNen<T>, duLieu: e.congViec.ketQua as T | undefined, daTaiTep: false, loi: e };
    throw e;
  }
}

/** Chuẩn hóa lỗi job/API thành thông điệp hiển thị. */
export function thongBaoLoiCongViecNen(e: unknown): string {
  if (e instanceof LoiJobNen || e instanceof LoiApi) return e.message;
  return e instanceof Error ? e.message : 'Đã có lỗi xảy ra.';
}
