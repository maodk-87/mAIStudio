/**
 * API thông báo cá nhân `/api/v1/nen-tang/thong-bao` (apis/02 §3) — gọi qua client mặc định của web.
 * Sự kiện `ktdg:thong-bao-thay-doi` (window) báo chuông tải lại khi màn khác đánh dấu đã đọc.
 */
import { layApiMacDinh, type PhanTrang } from '../api';
import type { BoLocThongBao, ThongBao } from './types';

const GOC_TB = '/v1/nen-tang/thong-bao';
const SU_KIEN_THONG_BAO = 'ktdg:thong-bao-thay-doi';

export async function layTrangThongBao(boLoc: BoLocThongBao = {}): Promise<PhanTrang<ThongBao>> {
  const { data } = await layApiMacDinh().get<PhanTrang<ThongBao>>(GOC_TB, {
    params: { trang: 1, soBanGhi: 20, ...boLoc },
  });
  return data;
}

/** Trang đầu thông báo (mới nhất trước) — dùng cho chuông header */
export const layDanhSachThongBao = async (boLoc: BoLocThongBao = {}) => (await layTrangThongBao(boLoc)).danhSach;

/** Số thông báo chưa đọc — lỗi không hiện toast (chuông gọi nền) */
export async function laySoThongBaoChuaDoc(): Promise<number> {
  const { data } = await layApiMacDinh().get<{ soChuaDoc: number }>(`${GOC_TB}/so-chua-doc`, {
    khongThongBao: true,
  });
  return data.soChuaDoc;
}

/** Báo cho chuông header tải lại (sau khi đánh dấu đã đọc ở màn khác) */
export function baoThongBaoThayDoi() {
  window.dispatchEvent(new Event(SU_KIEN_THONG_BAO));
}

/** Nghe thay đổi thông báo — trả hàm hủy */
export function ngheThongBaoThayDoi(f: () => void): () => void {
  window.addEventListener(SU_KIEN_THONG_BAO, f);
  return () => window.removeEventListener(SU_KIEN_THONG_BAO, f);
}

export async function danhDauDaDoc(id: string): Promise<void> {
  await layApiMacDinh().put(`${GOC_TB}/${id}/da-doc`);
  baoThongBaoThayDoi();
}

export async function danhDauDocTatCa(): Promise<number> {
  const { data } = await layApiMacDinh().put<{ soChuaDoc: number } | undefined>(`${GOC_TB}/da-doc-tat-ca`);
  baoThongBaoThayDoi();
  return data?.soChuaDoc ?? 0;
}
