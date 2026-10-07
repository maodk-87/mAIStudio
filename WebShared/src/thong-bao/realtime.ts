/**
 * Kết nối realtime hub thông báo `/hubs/thong-bao` (apis/00 §5.4) — sự kiện `ThongBaoMoi`.
 *
 * - Một kết nối dùng chung cho cả trang (đếm người đăng ký; hết người đăng ký → ngắt).
 * - Token: `accessTokenFactory` đọc access token hiện tại của client API mặc định (gateway nhận qua query
 *   `access_token`). Token hết hạn → negotiate 401 → rơi về polling; lượt hỏi polling qua axios tự làm mới
 *   token, lần thử nối lại sau dùng token mới.
 * - Tự nối lại (`withAutomaticReconnect`); đứt hẳn hoặc không nối được → kênh `polling` (người dùng hỏi
 *   định kỳ) và thử nối lại sau `CHO_THU_LAI_MS`.
 */
import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type HubConnection,
} from '@microsoft/signalr';
import { layAccessTokenMacDinh } from '../api';
import type { KenhThongBao } from './types';

export const DUONG_DAN_HUB_THONG_BAO = '/hubs/thong-bao';
export const SU_KIEN_THONG_BAO_MOI = 'ThongBaoMoi';
/** Chờ trước khi thử nối lại sau khi đứt hẳn / không nối được */
const CHO_THU_LAI_MS = 30_000;

interface NguoiNghe {
  khiCoThongBao: () => void;
  khiDoiKenh: (kenh: KenhThongBao) => void;
}

const dsNguoiNghe = new Set<NguoiNghe>();
let ketNoi: HubConnection | null = null;
let kenhHienTai: KenhThongBao = 'polling';
let henThuLai: ReturnType<typeof setTimeout> | undefined;

function datKenh(kenh: KenhThongBao) {
  if (kenhHienTai === kenh) return;
  kenhHienTai = kenh;
  dsNguoiNghe.forEach((n) => n.khiDoiKenh(kenh));
}

function baoCoThongBao() {
  dsNguoiNghe.forEach((n) => n.khiCoThongBao());
}

function henNoiLai() {
  if (henThuLai || dsNguoiNghe.size === 0) return;
  henThuLai = setTimeout(() => {
    henThuLai = undefined;
    void batDau();
  }, CHO_THU_LAI_MS);
}

function taoKetNoi(): HubConnection {
  const kn = new HubConnectionBuilder()
    .withUrl(DUONG_DAN_HUB_THONG_BAO, { accessTokenFactory: () => layAccessTokenMacDinh() ?? '' })
    .withAutomaticReconnect([0, 2_000, 10_000, 30_000])
    .configureLogging(LogLevel.None)
    .build();
  kn.on(SU_KIEN_THONG_BAO_MOI, baoCoThongBao);
  kn.onreconnecting(() => datKenh('polling'));
  kn.onreconnected(() => {
    datKenh('realtime');
    // Có thể đã lỡ thông báo trong lúc mất kết nối
    baoCoThongBao();
  });
  kn.onclose(() => {
    datKenh('polling');
    henNoiLai();
  });
  return kn;
}

async function batDau() {
  if (dsNguoiNghe.size === 0 || !layAccessTokenMacDinh()) {
    henNoiLai();
    return;
  }
  ketNoi ??= taoKetNoi();
  if (ketNoi.state !== HubConnectionState.Disconnected) return;
  try {
    await ketNoi.start();
    datKenh('realtime');
  } catch {
    datKenh('polling');
    henNoiLai();
  }
}

async function dung() {
  if (henThuLai) clearTimeout(henThuLai);
  henThuLai = undefined;
  const kn = ketNoi;
  ketNoi = null;
  kenhHienTai = 'polling';
  if (kn) await kn.stop().catch(() => undefined);
}

/**
 * Đăng ký nhận thông báo realtime — trả hàm hủy. Người đăng ký đầu tiên mở kết nối,
 * người cuối cùng hủy thì ngắt. `khiDoiKenh` gọi ngay với kênh hiện tại.
 */
export function dangKyThongBaoRealtime(khiCoThongBao: () => void, khiDoiKenh: (kenh: KenhThongBao) => void): () => void {
  const nguoi: NguoiNghe = { khiCoThongBao, khiDoiKenh };
  dsNguoiNghe.add(nguoi);
  khiDoiKenh(kenhHienTai);
  void batDau();
  return () => {
    dsNguoiNghe.delete(nguoi);
    if (dsNguoiNghe.size === 0) void dung();
  };
}
