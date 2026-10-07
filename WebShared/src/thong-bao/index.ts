/**
 * @web-shared/thong-bao — thông báo cá nhân dùng chung KTDG.Web/ADMIN.Web/CSDL.Web/NHCH.Web/QLTHI.Web:
 * API `/nen-tang/thong-bao`, kết nối realtime hub `/hubs/thong-bao` (SignalR, tự nối lại, fallback polling)
 * và chuông header. Web dùng module này phải cài `@microsoft/signalr`.
 */
export { default as ChuongThongBao, type ChuongThongBaoProps } from './ChuongThongBao';
export {
  baoThongBaoThayDoi,
  danhDauDaDoc,
  danhDauDocTatCa,
  layDanhSachThongBao,
  laySoThongBaoChuaDoc,
  layTrangThongBao,
  ngheThongBaoThayDoi,
} from './dichVu';
export { dangKyThongBaoRealtime, DUONG_DAN_HUB_THONG_BAO, SU_KIEN_THONG_BAO_MOI } from './realtime';
export type { BoLocThongBao, KenhThongBao, LoaiThongBao, ThongBao } from './types';
