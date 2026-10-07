/**
 * @web-shared/api — tầng gọi API dùng chung các web tenant (KTDG/ADMIN/CSDL/NHCH/QLTHI) — docs/15 mục 7.
 *
 * - Axios instance gọi đường dẫn tương đối `/api` qua gateway (không bao giờ tự khai tenant).
 * - Access token giữ trong bộ nhớ store của web; hết hạn (401) → tự gọi `lam-moi` bằng cookie refresh
 *   HttpOnly (một lần cho mọi request song song) rồi gửi lại; thất bại → `khiHetPhien()`.
 * - Header ngữ cảnh: `X-Khong-Gian` (không gian cấp trường), `X-Nam-Hoc-Id` (năm học đang chọn), header bổ sung
 *   theo web (`layHeaderBoSung` — NHCH/QLTHI: `X-Phan-Cong-Id`, `X-Step-Up-Token`).
 * - 401 `CAN_STEP_UP` → không làm mới token, gọi `khiCanStepUp` (web mở màn Passcode); 401 `CAN_PASSCODE` → màn tự xử lý.
 * - Lỗi chuẩn RFC 9457 (apis/00 §4.3, §4.6) → `LoiApi`; `errors{truong:[...]}` gán vào Form antd bằng `ganLoiVaoForm`.
 * - Hiển thị lỗi chung: web đăng ký `datBoHienThiLoi` ở gốc App (toast); request truyền `khongThongBao: true` để tự xử lý.
 */
import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { FormInstance } from 'antd';

export const DUONG_DAN_LAM_MOI = '/api/v1/nen-tang/xac-thuc/lam-moi';

/** Lỗi API đã chuẩn hóa từ problem+json. */
export class LoiApi extends Error {
  status: number;
  type: string;
  maLoi?: string;
  errors?: Record<string, string[]>;
  chiTiet?: unknown;
  quyenYeuCau?: string;

  constructor(status: number, duLieu: Partial<DuLieuLoi> | undefined, thongBaoMacDinh: string) {
    super(duLieu?.detail || duLieu?.title || thongBaoMacDinh);
    this.name = 'LoiApi';
    this.status = status;
    this.type = duLieu?.type ?? '';
    this.maLoi = duLieu?.maLoi;
    this.errors = duLieu?.errors;
    this.chiTiet = duLieu?.chiTiet;
    this.quyenYeuCau = duLieu?.quyenYeuCau;
  }

  /** Hậu tố type (VD `du-lieu-khong-hop-le`, `phien-ban-cu`). */
  get loai(): string {
    return this.type.split('/').pop() ?? '';
  }
}

export interface DuLieuLoi {
  type: string;
  title: string;
  status: number;
  detail?: string;
  maLoi?: string;
  errors?: Record<string, string[]>;
  chiTiet?: unknown;
  quyenYeuCau?: string;
}

/** Thông tin request đưa cho `layHeaderBoSung` (để web bỏ header theo đường dẫn — VD không gửi ngữ cảnh công việc cho API nền tảng). */
export interface YeuCauApi {
  url?: string;
  method?: string;
}

export interface CauHinhApiClient {
  layAccessToken: () => string | null | undefined;
  capNhatAccessToken: (token: string, hetHanLuc?: string) => void;
  /** Phiên hết hạn không làm mới được — web xóa store + chuyển về cổng đăng nhập. */
  khiHetPhien: () => void;
  layKhongGian?: () => string | null | undefined;
  layNamHocId?: () => string | null | undefined;
  /**
   * Header ngữ cảnh bổ sung gắn vào MỌI request (bỏ giá trị rỗng; không ghi đè header request tự đặt) —
   * NHCH/QLTHI: `X-Phan-Cong-Id` (phân công đang làm việc), NHCH: `X-Step-Up-Token` (apis/00 §3.2).
   */
  layHeaderBoSung?: (yeuCau: YeuCauApi) => Record<string, string | null | undefined>;
  /**
   * Response 401 `maLoi = CAN_STEP_UP` (type `…/step-up-required`): phiên bảo mật cao hết hạn — KHÔNG làm mới token,
   * gọi hàm này (web xóa token step-up + mở màn nhập Passcode) rồi reject `LoiApi`.
   */
  khiCanStepUp?: (loi: LoiApi) => void;
  baseURL?: string;
  /** Đường dẫn làm mới token (mặc định `DUONG_DAN_LAM_MOI` — Nền tảng). Web có xác thực riêng (DVCC) truyền đường dẫn của mình. */
  duongDanLamMoi?: string;
  /**
   * Trả true khi web biết đã có phiên đăng nhập (VD cờ `daDangNhap` lưu localStorage) nhưng access token chưa có trong bộ nhớ
   * (vừa tải lại trang): request làm mới token bằng cookie refresh TRƯỚC khi gửi — tránh loạt 401 rồi mới làm mới.
   */
  coPhienChuaCoToken?: () => boolean;
}

/** Mã lỗi 401 khi thiếu/hết hạn `X-Step-Up-Token` (KiemTraStepUpFilter). */
export const MA_LOI_CAN_STEP_UP = 'CAN_STEP_UP';
/** Mã lỗi 401 khi thao tác cần token Passcode (`X-Passcode-Token`). */
export const MA_LOI_CAN_PASSCODE = 'CAN_PASSCODE';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Không hiện toast lỗi chung — màn tự xử lý (VD gán lỗi vào form). */
    khongThongBao?: boolean;
    /** Không tự làm mới token khi 401 (dùng cho chính các API xác thực). */
    boQuaLamMoi?: boolean;
    _daThuLai?: boolean;
  }
}

type BoHienThiLoi = (loi: LoiApi) => void;
let boHienThiLoi: BoHienThiLoi | null = null;

/** Gốc App đăng ký cách hiện lỗi chung (thường `notification.error` từ `App.useApp()`). */
export function datBoHienThiLoi(fn: BoHienThiLoi | null) {
  boHienThiLoi = fn;
}

/** Hiện lỗi chung qua bộ đã đăng ký — dùng cho tầng giả lập (mock) để hành vi giống interceptor axios */
export function hienThiLoiChung(loi: LoiApi) {
  if (loi.status !== 401) boHienThiLoi?.(loi);
}

function chuanHoaLoi(err: unknown): LoiApi {
  if (err instanceof LoiApi) return err;
  const e = err as AxiosError<DuLieuLoi>;
  if (e?.response) {
    const status = e.response.status;
    const macDinh =
      status === 403 ? 'Bạn không có quyền thực hiện thao tác này.'
        : status === 404 ? 'Không tìm thấy dữ liệu.'
          : status === 429 ? 'Bạn thao tác quá nhanh, vui lòng thử lại sau.'
            : status >= 500 ? 'Hệ thống đang bận, vui lòng thử lại sau.'
              : 'Yêu cầu không hợp lệ.';
    const duLieu = typeof e.response.data === 'object' ? e.response.data : undefined;
    return new LoiApi(status, duLieu, macDinh);
  }
  return new LoiApi(0, undefined, 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.');
}

/**
 * Client mặc định của web (instance đầu tiên tạo bằng `taoApiClient` — mỗi web chỉ tạo một ở `configApi`).
 * Dùng cho thành phần dùng chung cần gọi API NenTang mà không phụ thuộc `@/configs` của web
 * (ModalXacMinhPasscode, chuông thông báo realtime).
 */
let clientMacDinh: { api: AxiosInstance; cauHinh: CauHinhApiClient } | null = null;

/** Client API mặc định của web — lỗi nếu web chưa gọi `taoApiClient`. */
export function layApiMacDinh(): AxiosInstance {
  if (!clientMacDinh) throw new Error('Web chưa khởi tạo API client (taoApiClient ở configs/api/configApi).');
  return clientMacDinh.api;
}

/** Access token hiện tại của client mặc định (cho SignalR `accessTokenFactory`). */
export function layAccessTokenMacDinh(): string | null {
  return clientMacDinh?.cauHinh.layAccessToken() ?? null;
}

/** Tạo axios instance chuẩn cho một web. */
export function taoApiClient(cauHinh: CauHinhApiClient): AxiosInstance {
  const api = axios.create({
    baseURL: cauHinh.baseURL ?? '/api',
    timeout: 30000,
    withCredentials: true,
    // Mảng lọc → tham số lặp (a=1&a=2) theo ASP.NET model binding
    paramsSerializer: { indexes: null },
  });
  let dangLamMoi: Promise<string | null> | null = null;

  const lamMoiToken = (): Promise<string | null> => {
    if (!dangLamMoi) {
      dangLamMoi = axios
        .post(cauHinh.duongDanLamMoi ?? DUONG_DAN_LAM_MOI, null, { withCredentials: true })
        .then((r) => {
          const token = r.data?.accessToken as string | undefined;
          if (!token) return null;
          cauHinh.capNhatAccessToken(token, r.data?.hetHanLuc);
          return token;
        })
        .catch(() => null)
        .finally(() => {
          setTimeout(() => (dangLamMoi = null), 0);
        });
    }
    return dangLamMoi;
  };

  api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    if (!cauHinh.layAccessToken() && !config.boQuaLamMoi && cauHinh.coPhienChuaCoToken?.()) await lamMoiToken();
    const token = cauHinh.layAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const khongGian = cauHinh.layKhongGian?.();
    if (khongGian && !config.headers['X-Khong-Gian']) config.headers['X-Khong-Gian'] = khongGian;
    const namHoc = cauHinh.layNamHocId?.();
    if (namHoc && !config.headers['X-Nam-Hoc-Id']) config.headers['X-Nam-Hoc-Id'] = namHoc;
    const boSung = cauHinh.layHeaderBoSung?.({ url: config.url, method: config.method });
    if (boSung) {
      Object.entries(boSung).forEach(([ten, giaTri]) => {
        if (giaTri && !config.headers[ten]) config.headers[ten] = giaTri;
      });
    }
    return config;
  });

  api.interceptors.response.use(
    (r) => r,
    async (err: AxiosError<DuLieuLoi>) => {
      const config = err.config as AxiosRequestConfig | undefined;
      const maLoi401 = err.response?.status === 401 ? err.response.data?.maLoi : undefined;
      // Phiên bảo mật cao (step-up) hết hạn: không phải hết phiên đăng nhập — báo web mở màn Passcode
      if (maLoi401 === MA_LOI_CAN_STEP_UP) {
        const loi = chuanHoaLoi(err);
        cauHinh.khiCanStepUp?.(loi);
        return Promise.reject(loi);
      }
      if (err.response?.status === 401 && config && !config.boQuaLamMoi && !config._daThuLai) {
        const maLoi = maLoi401;
        // Cần Passcode: không phải hết phiên — để màn gọi mở ModalPasscode
        if (maLoi !== MA_LOI_CAN_PASSCODE) {
          config._daThuLai = true;
          const token = await lamMoiToken();
          if (token) {
            config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${token}` };
            return api.request(config);
          }
          xoaTokenPhienPasscode();
          cauHinh.khiHetPhien();
        }
      }
      const loi = chuanHoaLoi(err);
      if (!config?.khongThongBao && loi.status !== 401 && boHienThiLoi) boHienThiLoi(loi);
      return Promise.reject(loi);
    },
  );
  if (!clientMacDinh) clientMacDinh = { api, cauHinh };
  return api;
}

// ————— Passcode (YC-HT-03a, apis/20 §7) —————

/** Rule Passcode — khớp backend `ChinhSachPasscode`: đúng 6 chữ số. */
export const MAU_PASSCODE = /^\d{6}$/;

/** Mã lỗi khi người dùng chưa thiết lập Passcode. */
export const MA_LOI_CHUA_THIET_LAP_PASSCODE = 'CHUA_THIET_LAP_PASSCODE';

/**
 * Chế độ token Passcode (apis/20 §7): `mot-lan` (mặc định — tiêu thụ ở lần dùng đầu, 5′) | `phien` — "phiên xem nhạy cảm"
 * (Z4 30/09/2026): dùng nhiều lần tới hết hạn (mặc định 15′), chỉ route ĐỌC nhận (rubric đã khóa, nội dung câu thi NHCH…).
 */
export type CheDoPasscode = 'mot-lan' | 'phien';

export interface TuyChonPasscode {
  cheDo?: CheDoPasscode;
  /** Chỉ chế độ `phien`: gắn token với một đối tượng (VD `de-thi:<id>`); bỏ trống = mọi đối tượng cùng mục đích */
  doiTuong?: string;
}

export interface KetQuaXacMinhPasscode {
  token: string;
  /** ISO — hết hạn tuyệt đối */
  hetHanLuc: string;
  cheDo: CheDoPasscode;
  doiTuong?: string | null;
}

/** Xác minh Passcode cho một mục đích → token (gửi kèm `voiPasscode(token)`). Chế độ `phien` tự lưu token vào bộ nhớ (xem `layTokenPhienPasscode`). */
export async function xacMinhPasscode(passcode: string, mucDich: string, tuyChon?: TuyChonPasscode): Promise<string> {
  return (await xacMinhPasscodeDayDu(passcode, mucDich, tuyChon)).token;
}

/** Như `xacMinhPasscode` nhưng trả đủ hạn/chế độ. */
export async function xacMinhPasscodeDayDu(
  passcode: string,
  mucDich: string,
  tuyChon?: TuyChonPasscode,
): Promise<KetQuaXacMinhPasscode> {
  const phien = tuyChon?.cheDo === 'phien';
  const { data } = await layApiMacDinh().post<KetQuaXacMinhPasscode>(
    '/v1/nen-tang/passcode/xac-minh',
    phien ? { passcode, mucDich, cheDo: 'phien', doiTuong: tuyChon?.doiTuong || undefined } : { passcode, mucDich },
    { khongThongBao: true },
  );
  if (phien) luuTokenPhienPasscode(mucDich, data.token, data.hetHanLuc, tuyChon?.doiTuong);
  return data;
}

// ————— Kho token "phiên xem nhạy cảm" — CHỈ trong bộ nhớ (không localStorage/sessionStorage): tải lại trang/đăng xuất là mất —————

const khoTokenPhien = new Map<string, { token: string; hetHan: number }>();
const khoaTokenPhien = (mucDich: string, doiTuong?: string) => `${mucDich}|${doiTuong ?? ''}`;
/** Bỏ token sắp hết hạn (còn < 10 giây) để không gửi token chết */
const BIEN_HET_HAN_MS = 10_000;

export function luuTokenPhienPasscode(mucDich: string, token: string, hetHanLuc: string, doiTuong?: string): void {
  const hetHan = Date.parse(hetHanLuc);
  khoTokenPhien.set(khoaTokenPhien(mucDich, doiTuong), {
    token,
    hetHan: Number.isFinite(hetHan) ? hetHan : Date.now() + 15 * 60_000,
  });
}

/** Token phiên còn hạn cho mục đích (ưu tiên token gắn đúng đối tượng, rồi token chung của mục đích); `null` khi không có. */
export function layTokenPhienPasscode(mucDich: string, doiTuong?: string): string | null {
  const khoa = doiTuong ? [khoaTokenPhien(mucDich, doiTuong), khoaTokenPhien(mucDich)] : [khoaTokenPhien(mucDich)];
  for (const k of khoa) {
    const t = khoTokenPhien.get(k);
    if (!t) continue;
    if (t.hetHan - BIEN_HET_HAN_MS > Date.now()) return t.token;
    khoTokenPhien.delete(k);
  }
  return null;
}

/** Xóa token phiên của một mục đích (máy chủ báo `CAN_PASSCODE` — hết hạn/thu hồi), hoặc tất cả (đăng xuất/hết phiên). */
export function xoaTokenPhienPasscode(mucDich?: string): void {
  if (!mucDich) {
    khoTokenPhien.clear();
    return;
  }
  for (const k of [...khoTokenPhien.keys()]) if (k.startsWith(`${mucDich}|`)) khoTokenPhien.delete(k);
}

/** Lỗi 401 `CAN_PASSCODE` — thiếu/sai/hết hạn token Passcode. */
export function laLoiCanPasscode(e: unknown): boolean {
  return e instanceof LoiApi && e.status === 401 && e.maLoi === MA_LOI_CAN_PASSCODE;
}

/** Kết quả step-up: token gửi kèm header `X-Step-Up-Token`, hiệu lực 15' không hoạt động (mỗi request gia hạn). */
export interface KetQuaStepUp {
  stepUpToken: string;
  /** ISO — hạn tính tại thời điểm cấp (server gia hạn trượt theo hoạt động) */
  hetHan: string;
}

/**
 * Step-up vào hệ bảo mật cao (apis/02 §1, YC-HT-03a): xác minh Passcode → token `X-Step-Up-Token`.
 * Lỗi: 400 `errors.passcode` (sai/không đúng định dạng — gán vào form bằng `ganLoiVaoForm`),
 * 422 `maLoi = CHUA_THIET_LAP_PASSCODE`, `TAM_KHOA_PASSCODE` (sai 5 lần → khóa 15').
 */
export async function xacThucStepUp(passcode: string, heThong: 'nhch' | 'qlthi'): Promise<KetQuaStepUp> {
  const { data } = await layApiMacDinh().post<KetQuaStepUp>(
    '/v1/nen-tang/xac-thuc/step-up',
    { passcode, heThong },
    { khongThongBao: true },
  );
  return data;
}

/** Header idempotency cho POST quan trọng (nộp bài, chốt điểm, tạo đợt...) — apis/00 §5.6. */
export function voiIdempotency(khoa?: string): AxiosRequestConfig {
  return { headers: { 'X-Idempotency-Key': khoa ?? taoUuid() } };
}

/** Header token Passcode (lấy từ `POST /nen-tang/passcode/xac-minh`). */
export function voiPasscode(token: string, config: AxiosRequestConfig = {}): AxiosRequestConfig {
  return { ...config, headers: { ...(config.headers ?? {}), 'X-Passcode-Token': token } };
}

export function taoUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Gán lỗi theo trường (`errors`) vào Form antd — validate 2 chiều (apis/00 §4.6).
 * Nhận form có kiểu (`Form.useForm<T>()`) lẫn không kiểu. Tên trường dạng `cacO[2].soCau`
 * → name path `['cacO', 2, 'soCau']`. Trả true nếu có gán.
 */
export function ganLoiVaoForm<T>(form: FormInstance<T>, loi: unknown): boolean {
  if (!(loi instanceof LoiApi) || !loi.errors) return false;
  const ds = Object.entries(loi.errors).map(([ten, errors]) => ({
    name: ten.split(/\.|\[|\]/).filter(Boolean).map((p) => (/^\d+$/.test(p) ? Number(p) : p)),
    errors,
  }));
  // Tên trường đến từ máy chủ (chuỗi động) — không kiểm được theo NamePath<T> lúc biên dịch
  if (ds.length) form.setFields(ds as Parameters<FormInstance<T>['setFields']>[0]);
  return ds.length > 0;
}

/** Thông báo lỗi ngắn gọn cho người dùng (dùng trong catch của màn). */
export function thongBaoLoi(loi: unknown, macDinh = 'Đã có lỗi xảy ra.'): string {
  if (loi instanceof LoiApi) return loi.message;
  if (loi instanceof Error) return loi.message || macDinh;
  return macDinh;
}

/** Chuỗi query từ object (bỏ undefined/null/''; mảng → tham số lặp). */
export function taoQuery(thamSo: Record<string, unknown>): Record<string, unknown> {
  const kq: Record<string, unknown> = {};
  Object.entries(thamSo).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    kq[k] = v;
  });
  return kq;
}

/** Kiểu phân trang chuẩn backend. */
export interface PhanTrang<T> {
  danhSach: T[];
  tongSo: number;
  trang: number;
  soBanGhi: number;
}
