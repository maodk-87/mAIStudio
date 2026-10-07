/**
 * Đánh số VỊ TRÍ cho các ký hiệu số câu động của câu hỏi nhóm (docs/13 mục 4, docs/nghiep-vu-hoan-vi-de.md mục 9).
 * Nội dung câu LƯU NGUYÊN ký hiệu — số thật chỉ thay lúc HIỂN THỊ/XUẤT theo thứ tự câu của đề/mã đề đang hiển thị:
 *   "N**+k"   câu con thứ k                        — VD "##Задания N**+1 – N**+2 …##", ô trống "(N**+k)"
 *   "N***"    câu con CUỐI của nhóm                — VD "trả lời câu N** – câu N***"
 *   "(N**)"   ô trống thứ j (đếm tăng dần trong một nhóm)
 *   "N**"     câu con ĐẦU của nhóm
 * Cùng đặc tả với `KTDG.CauHoi.DanhSoViTri` (BE).
 */
import { LOAI_CAU_HV, type CauTrucDeHv, type NoiDungCauHv, type ViTriCauHv } from './kieu';

export interface ViTriNhom {
  /** Số thứ tự (trong đề đã sinh) của câu hỏi con đầu tiên */
  soBatDau: number;
  /** Số thứ tự của câu hỏi con cuối cùng */
  soKetThuc: number;
}

const O_TRONG_GAN_CAU_CON_RE = /\(\s*N\*\*(\s*\+\s*\d+)?\s*\)|\(\s*\d+\s*\)\s*_{2,}|_{2,}\s*\(\s*\d+\s*\)/;

/** Nội dung có chứa ký hiệu vị trí cần đánh số khi sinh đề không */
export const coKyHieuViTri = (noiDung?: string | null): boolean => !!noiDung && noiDung.includes('N**');

/**
 * Bộ thay ký hiệu của MỘT câu chùm — giữ bộ đếm ô trống "(N**)" qua nhiều chuỗi (nội dung → ngữ liệu → câu con);
 * tạo mới cho từng câu, không dùng chung.
 */
export function taoBoDanhSo({ soBatDau, soKetThuc }: ViTriNhom): (noiDung: string) => string {
  let oTrong = 0;
  return (noiDung) =>
    coKyHieuViTri(noiDung)
      ? noiDung
          .replace(/N\*\*\s*\+\s*(\d+)/g, (_t, k: string) => String(soBatDau + Number(k) - 1))
          .replace(/N\*\*\*/g, String(soKetThuc))
          .replace(/\(\s*N\*\*\s*\)/g, () => `(${soBatDau + oTrong++})`)
          .replace(/N\*\*/g, String(soBatDau))
      : noiDung;
}

/** Thay ký hiệu vị trí trong MỘT chuỗi (HTML hoặc văn bản) bằng số thứ tự thật */
export const danhSoViTri = (noiDung: string, viTri: ViTriNhom): string => taoBoDanhSo(viTri)(noiDung);

/**
 * Câu chùm có ký hiệu gắn với TỪNG câu con (câu dẫn câu con chứa "N**+k"; ngữ liệu có ô trống "(N**+k)"/"(N**)"/"(k)___")
 * → không được đảo thứ tự câu con khi hoán vị.
 */
export const coKyHieuGanCauCon = (cau: NoiDungCauHv): boolean =>
  (cau.cauCon ?? []).some((c) => /N\*\*\s*\+\s*\d+/.test(c.noiDung)) ||
  O_TRONG_GAN_CAU_CON_RE.test(cau.nguLieu ?? '') ||
  O_TRONG_GAN_CAU_CON_RE.test(cau.noiDung);

/** Số "đơn vị câu" tính vào đề — câu chùm tính theo số câu con */
export const soCauTinh = (cau: NoiDungCauHv): number =>
  cau.loaiCau === LOAI_CAU_HV.CauChum ? Math.max(1, cau.cauCon?.length ?? 0) : 1;

/** Số câu đầu/cuối của từng câu theo thứ tự hiển thị (đánh liên tục toàn đề) */
export function viTriCau(de: CauTrucDeHv): ViTriCauHv[] {
  const kq: ViTriCauHv[] = [];
  let so = 0;
  for (const phan of de.dsPhan)
    for (const cau of phan.dsCau) {
      const n = soCauTinh(cau.noiDung);
      kq.push({ cauHoiId: cau.cauHoiId, phanId: phan.id, soCauBatDau: so + 1, soCauKetThuc: so + n });
      so += n;
    }
  return kq;
}

/** Thay ký hiệu của MỘT câu (nội dung, ngữ liệu, câu con) — trả về bản sao, không sửa đối tượng gốc */
export function danhSoCau<T extends NoiDungCauHv>(cau: T, viTri: ViTriNhom): T {
  const coKyHieu =
    coKyHieuViTri(cau.noiDung) || coKyHieuViTri(cau.nguLieu) || (cau.cauCon ?? []).some((c) => coKyHieuViTri(c.noiDung));
  if (!coKyHieu) return cau;
  const thay = taoBoDanhSo(viTri);
  const noiDung = thay(cau.noiDung);
  const nguLieu = cau.nguLieu == null ? cau.nguLieu : thay(cau.nguLieu);
  return {
    ...cau,
    noiDung,
    nguLieu,
    ...(cau.cauCon ? { cauCon: cau.cauCon.map((c) => ({ ...c, noiDung: thay(c.noiDung) })) } : {}),
  };
}

/**
 * Bản ĐỂ HIỂN THỊ/XUẤT của đề hoặc mã đề: mọi ký hiệu được thay bằng số câu thật theo thứ tự hiện có.
 * KHÔNG lưu/gửi kết quả này về máy chủ (đề, mã đề, snapshot luôn giữ ký hiệu).
 */
export function danhSoDe<T extends CauTrucDeHv>(de: T): T {
  let so = 0;
  return {
    ...de,
    dsPhan: de.dsPhan.map((p) => ({
      ...p,
      dsCau: p.dsCau.map((c) => {
        const n = soCauTinh(c.noiDung);
        const kq = { ...c, noiDung: danhSoCau(c.noiDung, { soBatDau: so + 1, soKetThuc: so + n }) };
        so += n;
        return kq;
      }),
    })),
  };
}
