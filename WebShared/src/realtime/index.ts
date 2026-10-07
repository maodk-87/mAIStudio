/**
 * @web-shared/realtime — kênh giám sát realtime (SignalR) có dự phòng polling, dùng chung các web
 * (QLTHI: `/hubs/giam-sat-ky-thi`; KTĐG: `/hubs/giam-sat-thi`). Web dùng module này phải cài `@microsoft/signalr`.
 */
export { useKenhGiamSat } from './useKenhGiamSat';
export { default as TheTrangThaiKenh, type TheTrangThaiKenhProps } from './TheTrangThaiKenh';
export type { KenhCapNhat, SuKienGiamSat, ThamGiaNhom, TuyChonKenhGiamSat } from './types';

/** Hub giám sát kỳ thi hệ QLTHI — query `phanCongId`, vào nhóm bằng `ThamGia({ dotId, diemThiId?, phongId?, maCa? })` */
export const HUB_GIAM_SAT_KY_THI = '/hubs/giam-sat-ky-thi';
/** Hub giám sát ca thi hệ KTĐG — query `khongGian`, `namHocId`; vào nhóm bằng `ThamGiaCa({ kyId, caId })` */
export const HUB_GIAM_SAT_THI = '/hubs/giam-sat-thi';

/** Tên sự kiện server → client của các hub giám sát */
export const SU_KIEN_GIAM_SAT = {
  thiSinhCapNhat: 'ThiSinhCapNhat',
  viPham: 'ViPham',
  phongCapNhat: 'PhongCapNhat',
  trangThaiPhatDe: 'TrangThaiPhatDe',
  caCapNhat: 'CaCapNhat',
} as const;
