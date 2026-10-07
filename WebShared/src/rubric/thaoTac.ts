/**
 * Thao tác trên cây rubric cho trình soạn (FR-RB-020, 022) — hàm thuần, trả cây mới đã đánh lại thứ tự và mã hiển thị.
 * Mọi thao tác không hợp lệ theo bảng quan hệ cha – con trả về `{ loi }` thay vì cây.
 */
import type { CayRubric, LoaiNutRubric, NutRubric } from './types';
import { conCua, conDuocPhep, duyetCay, laNutLa, lapChiMuc, nhanLoaiNut, sinhMaHienThi, taoKhoa, taoNut } from './tinhToan';

export type KetQuaThaoTac = { cay: CayRubric; khoaChon?: string } | { loi: string };

/** Đánh lại thứ tự anh em liên tiếp và sinh lại mã hiển thị */
function chuanHoa(nut: NutRubric[], maGoc: string): CayRubric {
  const cm = lapChiMuc({ nut });
  const ds = nut.map((n) => ({ ...n }));
  const theoKhoa = new Map(ds.map((n) => [n.khoaNut, n]));
  cm.con.forEach((con) => con.forEach((c, i) => (theoKhoa.get(c.khoaNut)!.thuTu = i)));
  return sinhMaHienThi({ nut: ds }, maGoc);
}

const chen = (nut: NutRubric[], khoaCha: string, viTri: number, moi: NutRubric[]) => {
  // Dời các anh em từ vị trí chèn trở đi
  const ds = nut.map((n) => (n.khoaCha === khoaCha && n.thuTu >= viTri ? { ...n, thuTu: n.thuTu + 1 } : n));
  return [...ds, ...moi];
};

export function themCon(cay: CayRubric, khoaCha: string, loai: LoaiNutRubric, maGoc: string): KetQuaThaoTac {
  const cm = lapChiMuc(cay);
  const cha = cm.theoKhoa.get(khoaCha);
  if (!cha) return { loi: 'Không tìm thấy nút' };
  if (!conDuocPhep[cha.loai].includes(loai)) return { loi: `${nhanLoaiNut[cha.loai]} không chứa được ${nhanLoaiNut[loai]}` };
  const moi = taoNut(loai, khoaCha, conCua(cm, khoaCha).length);
  return { cay: chuanHoa([...cay.nut, moi], maGoc), khoaChon: moi.khoaNut };
}

export function themCungCap(cay: CayRubric, khoa: string, loai: LoaiNutRubric, maGoc: string): KetQuaThaoTac {
  const cm = lapChiMuc(cay);
  const n = cm.theoKhoa.get(khoa);
  if (!n?.khoaCha) return { loi: 'Gốc rubric chỉ có một (chính là câu hỏi)' };
  const cha = cm.theoKhoa.get(n.khoaCha)!;
  if (!conDuocPhep[cha.loai].includes(loai)) return { loi: `${nhanLoaiNut[cha.loai]} không chứa được ${nhanLoaiNut[loai]}` };
  const moi = taoNut(loai, n.khoaCha, n.thuTu + 1);
  return { cay: chuanHoa(chen(cay.nut, n.khoaCha, n.thuTu + 1, [moi]), maGoc), khoaChon: moi.khoaNut };
}

export function xoaNut(cay: CayRubric, khoa: string, maGoc: string): KetQuaThaoTac {
  const cm = lapChiMuc(cay);
  const n = cm.theoKhoa.get(khoa);
  if (!n?.khoaCha) return { loi: 'Không xóa được gốc rubric' };
  const bo = new Set(duyetCay(cm, khoa).map((x) => x.khoaNut));
  const anhEm = conCua(cm, n.khoaCha);
  const chonTiep = anhEm[n.thuTu + 1]?.khoaNut ?? anhEm[n.thuTu - 1]?.khoaNut ?? n.khoaCha;
  return { cay: chuanHoa(cay.nut.filter((x) => !bo.has(x.khoaNut)), maGoc), khoaChon: chonTiep };
}

/** Tab: biến nút thành con cuối của anh em phía trên */
export function thutVao(cay: CayRubric, khoa: string, maGoc: string): KetQuaThaoTac {
  const cm = lapChiMuc(cay);
  const n = cm.theoKhoa.get(khoa);
  if (!n?.khoaCha || n.thuTu === 0) return { loi: 'Không có nút phía trên cùng cấp để làm nút cha' };
  const tren = conCua(cm, n.khoaCha)[n.thuTu - 1];
  if (!conDuocPhep[tren.loai].includes(n.loai))
    return { loi: laNutLa(tren) ? `${nhanLoaiNut[tren.loai]} là nút lá — đổi sang Nhóm trước khi thêm con` : `${nhanLoaiNut[tren.loai]} không chứa được ${nhanLoaiNut[n.loai]}` };
  const nut = cay.nut.map((x) => (x.khoaNut === khoa ? { ...x, khoaCha: tren.khoaNut, thuTu: conCua(cm, tren.khoaNut).length } : x));
  return { cay: chuanHoa(nut, maGoc), khoaChon: khoa };
}

/** Shift+Tab: đưa nút ra một cấp, đứng ngay sau nút cha cũ */
export function thutRa(cay: CayRubric, khoa: string, maGoc: string): KetQuaThaoTac {
  const cm = lapChiMuc(cay);
  const n = cm.theoKhoa.get(khoa);
  const cha = n?.khoaCha ? cm.theoKhoa.get(n.khoaCha) : undefined;
  if (!n || !cha?.khoaCha) return { loi: 'Nút đã ở cấp cao nhất dưới gốc' };
  const ong = cm.theoKhoa.get(cha.khoaCha)!;
  if (!conDuocPhep[ong.loai].includes(n.loai)) return { loi: `${nhanLoaiNut[ong.loai]} không chứa được ${nhanLoaiNut[n.loai]}` };
  const khongCon = cay.nut.filter((x) => x.khoaNut !== khoa);
  const nut = chen(khongCon, cha.khoaCha, cha.thuTu + 1, [{ ...n, khoaCha: cha.khoaCha, thuTu: cha.thuTu + 1 }]);
  return { cay: chuanHoa(nut, maGoc), khoaChon: khoa };
}

/** Ctrl+↑/↓: đổi chỗ với anh em liền kề */
export function doiThuTu(cay: CayRubric, khoa: string, huong: -1 | 1, maGoc: string): KetQuaThaoTac {
  const cm = lapChiMuc(cay);
  const n = cm.theoKhoa.get(khoa);
  if (!n?.khoaCha) return { loi: 'Không di chuyển được gốc' };
  const ke = conCua(cm, n.khoaCha)[n.thuTu + huong];
  if (!ke) return { cay, khoaChon: khoa };
  const nut = cay.nut.map((x) =>
    x.khoaNut === khoa ? { ...x, thuTu: ke.thuTu } : x.khoaNut === ke.khoaNut ? { ...x, thuTu: n.thuTu } : x,
  );
  return { cay: chuanHoa(nut, maGoc), khoaChon: khoa };
}

/** Nhân bản một nhánh (khóa nút mới), đặt ngay sau nhánh gốc */
export function nhanBanNhanh(cay: CayRubric, khoa: string, maGoc: string): KetQuaThaoTac {
  const cm = lapChiMuc(cay);
  const n = cm.theoKhoa.get(khoa);
  if (!n?.khoaCha) return { loi: 'Không nhân bản được gốc' };
  const ds = duyetCay(cm, khoa);
  const doi = new Map(ds.map((x) => [x.khoaNut, taoKhoa()]));
  const banSao = ds.map((x) => ({
    ...structuredClone(x),
    khoaNut: doi.get(x.khoaNut)!,
    khoaCha: x.khoaNut === khoa ? n.khoaCha : doi.get(x.khoaCha!)!,
    thuTu: x.khoaNut === khoa ? n.thuTu + 1 : x.thuTu,
    laNhanhMo: x.khoaNut === khoa ? undefined : x.laNhanhMo,
    muc: x.muc?.map((m) => ({ ...m, khoaMuc: taoKhoa() })),
  }));
  return { cay: chuanHoa(chen(cay.nut, n.khoaCha, n.thuTu + 1, banSao), maGoc), khoaChon: banSao[0].khoaNut };
}

/** Đổi loại nút — chỉ khi kết quả vẫn hợp lệ (nút có con không thành lá; quan hệ với cha/con giữ đúng) */
export function doiLoaiNut(cay: CayRubric, khoa: string, loai: LoaiNutRubric, maGoc: string): KetQuaThaoTac {
  const cm = lapChiMuc(cay);
  const n = cm.theoKhoa.get(khoa);
  if (!n) return { loi: 'Không tìm thấy nút' };
  const con = conCua(cm, khoa);
  if (!n.khoaCha && loai !== 'nhom') return { loi: 'Gốc rubric phải là Nhóm' };
  if (n.khoaCha) {
    const cha = cm.theoKhoa.get(n.khoaCha)!;
    if (!conDuocPhep[cha.loai].includes(loai)) return { loi: `${nhanLoaiNut[cha.loai]} không chứa được ${nhanLoaiNut[loai]}` };
  }
  if (con.length && !con.every((c) => conDuocPhep[loai].includes(c.loai)))
    return { loi: `Nút đang có ${con.length} nút con — ${nhanLoaiNut[loai]} không chứa được các nút này` };
  const mau = taoNut(loai, n.khoaCha, n.thuTu);
  const moi: NutRubric = {
    ...n,
    loai,
    diemToiDa: mau.diemToiDa ?? undefined,
    buocDiem: mau.buocDiem,
    muc: mau.muc,
    laNhanhMo: loai === 'tieu-chi' ? n.laNhanhMo : undefined,
  };
  if ((loai === 'tieu-chi' || loai === 'diem-tru') && n.diemToiDa && (n.loai === 'tieu-chi' || n.loai === 'diem-tru')) moi.diemToiDa = n.diemToiDa;
  return { cay: chuanHoa(cay.nut.map((x) => (x.khoaNut === khoa ? moi : x)), maGoc), khoaChon: khoa };
}

/** Sửa thuộc tính một nút (không đổi cấu trúc) */
export function suaNut(cay: CayRubric, khoa: string, thayDoi: Partial<NutRubric>): CayRubric {
  return { nut: cay.nut.map((n) => (n.khoaNut === khoa ? { ...n, ...thayDoi } : n)) };
}

/** Chỉ một nhánh "Cách khác" trong một Phương án thay thế */
export function datNhanhMo(cay: CayRubric, khoa: string, bat: boolean): CayRubric {
  const cm = lapChiMuc(cay);
  const n = cm.theoKhoa.get(khoa);
  if (!n?.khoaCha) return cay;
  return { nut: cay.nut.map((x) => (x.khoaCha === n.khoaCha ? { ...x, laNhanhMo: x.khoaNut === khoa ? bat || undefined : undefined } : x)) };
}
