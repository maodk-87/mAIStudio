/**
 * Bộ máy RUBRIC (thuần, không phụ thuộc giao diện) — cùng thuật toán với backend (SRS mục 3):
 * tính điểm tối đa / điểm đạt trên cây, trạng thái hoàn tất, "Không làm bài", kiểm tra hợp lệ VR-01…VR-13,
 * mã hiển thị, so khác biệt phiên bản, làm tròn tổng bài, xuất hướng dẫn chấm, dựng cây từ bảng dán.
 * Mọi phép cộng/trừ dùng SỐ NGUYÊN đơn vị 0,01 điểm (FR-RB-014) — không cộng số thực trực tiếp.
 */
import type {
  CauHinhLamTron,
  CayRubric,
  CheDoRubric,
  DuLieuChamRubric,
  LoaiNutRubric,
  MaLoiRubric,
  NutRubric,
  VanDeRubric,
} from './types';

// ————— Số học đơn vị 0,01 —————

/** Điểm → số nguyên phần trăm (0,25 → 25) */
/**
 * moTa / dapAnMau / muc[].moTa nhập bằng OEditor (chế độ gọn): văn bản thường là chuỗi thường,
 * có công thức toán thì là HTML (`<span data-cong-thuc="latex">latex</span>`).
 */
export const laHtml = (s?: string) => !!s && /<[a-z][\s\S]*>/i.test(s);

/** Chữ thuần (bóc thẻ, giải mã thực thể cơ bản; công thức còn lại dạng LaTeX) — đếm độ dài, in bảng, so sánh */
export const chuThuan = (s?: string) =>
  laHtml(s)
    ? (s as string)
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
    : (s ?? '');

export const sangNguyen = (x: number) => Math.round(x * 100);
/** Số nguyên phần trăm → điểm */
export const tuNguyen = (n: number) => n / 100;
/** Hiển thị điểm kiểu Việt Nam (dấu phẩy, bỏ số 0 thừa) */
export const hienDiem = (x: number | null | undefined) =>
  x == null ? '—' : x.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
/** Đọc số người dùng gõ: chấp nhận cả dấu phẩy và dấu chấm (FR-RB-043) */
export function docSo(chuoi: string): number | null {
  const s = chuoi.trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export const LOAI_LA: LoaiNutRubric[] = ['tieu-chi', 'tieu-chi-muc', 'diem-tru'];
export const laNutLa = (n: Pick<NutRubric, 'loai'>) => LOAI_LA.includes(n.loai);
export const BUOC_MAC_DINH = 0.25;
export const DO_SAU_TOI_DA = 4;

export const nhanLoaiNut: Record<LoaiNutRubric, string> = {
  nhom: 'Nhóm',
  'phuong-an': 'Phương án thay thế',
  'tieu-chi': 'Tiêu chí',
  'tieu-chi-muc': 'Tiêu chí theo mức',
  'diem-tru': 'Điểm trừ',
};

/** Quan hệ cha – con được phép (SRS mục 2) */
export const conDuocPhep: Record<LoaiNutRubric, LoaiNutRubric[]> = {
  nhom: ['nhom', 'phuong-an', 'tieu-chi', 'tieu-chi-muc', 'diem-tru'],
  'phuong-an': ['nhom', 'tieu-chi', 'tieu-chi-muc'],
  'tieu-chi': [],
  'tieu-chi-muc': [],
  'diem-tru': [],
};

// ————— Duyệt cây —————

export interface ChiMucCay {
  theoKhoa: Map<string, NutRubric>;
  con: Map<string | null, NutRubric[]>;
  goc: NutRubric | undefined;
}

export function lapChiMuc(cay: CayRubric): ChiMucCay {
  const theoKhoa = new Map(cay.nut.map((n) => [n.khoaNut, n]));
  const con = new Map<string | null, NutRubric[]>();
  cay.nut.forEach((n) => {
    const ds = con.get(n.khoaCha) ?? [];
    ds.push(n);
    con.set(n.khoaCha, ds);
  });
  con.forEach((ds) => ds.sort((a, b) => a.thuTu - b.thuTu));
  return { theoKhoa, con, goc: con.get(null)?.[0] };
}

export const conCua = (cm: ChiMucCay, khoa: string) => cm.con.get(khoa) ?? [];

/** Độ sâu của nút (gốc = 0) */
export function doSau(cm: ChiMucCay, khoa: string): number {
  let d = 0;
  let n = cm.theoKhoa.get(khoa);
  while (n?.khoaCha) {
    d++;
    n = cm.theoKhoa.get(n.khoaCha);
  }
  return d;
}

/** Duyệt tiền thứ tự (thứ tự hiển thị) */
export function duyetCay(cm: ChiMucCay, khoa?: string): NutRubric[] {
  const bd = khoa ? cm.theoKhoa.get(khoa) : cm.goc;
  if (!bd) return [];
  const kq: NutRubric[] = [];
  const di = (n: NutRubric) => {
    kq.push(n);
    conCua(cm, n.khoaNut).forEach(di);
  };
  di(bd);
  return kq;
}

// ————— Điểm tối đa (maxPoint) —————

function diemToiDaNguyen(cm: ChiMucCay, n: NutRubric): number {
  switch (n.loai) {
    case 'tieu-chi':
      return sangNguyen(n.diemToiDa ?? 0);
    case 'tieu-chi-muc':
      return Math.max(0, ...(n.muc ?? []).map((m) => sangNguyen(m.diem)));
    case 'diem-tru':
      return 0;
    case 'phuong-an': {
      const dau = conCua(cm, n.khoaNut)[0];
      return dau ? diemToiDaNguyen(cm, dau) : 0;
    }
    default:
      return conCua(cm, n.khoaNut)
        .filter((c) => c.loai !== 'diem-tru')
        .reduce((s, c) => s + diemToiDaNguyen(cm, c), 0);
  }
}

/** Điểm tối đa của nút (mặc định: gốc) */
export function tinhDiemToiDa(cay: CayRubric | ChiMucCay, khoa?: string): number {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  const n = khoa ? cm.theoKhoa.get(khoa) : cm.goc;
  return n ? tuNguyen(diemToiDaNguyen(cm, n)) : 0;
}

// ————— Điểm đạt (score) —————

function diemNguyen(cm: ChiMucCay, n: NutRubric, p: DuLieuChamRubric): number | null {
  switch (n.loai) {
    case 'tieu-chi':
    case 'tieu-chi-muc': {
      const v = p.giaTri[n.khoaNut]?.giaTri;
      return v == null ? null : sangNguyen(v);
    }
    case 'diem-tru':
      return sangNguyen(p.giaTri[n.khoaNut]?.giaTri ?? 0);
    case 'phuong-an': {
      const nhanh = p.nhanhChon[n.khoaNut];
      const b = nhanh ? cm.theoKhoa.get(nhanh) : undefined;
      return b ? diemNguyen(cm, b, p) : null;
    }
    default: {
      let tong = 0;
      let tru = 0;
      for (const c of conCua(cm, n.khoaNut)) {
        const v = diemNguyen(cm, c, p);
        if (c.loai === 'diem-tru') tru += v ?? 0;
        else if (v == null) return null;
        else tong += v;
      }
      return Math.max(0, tong - tru);
    }
  }
}

/** Điểm đạt của nút theo phiếu chấm (null = chưa đủ dữ liệu) — mặc định: gốc (điểm câu) */
export function tinhDiem(cay: CayRubric | ChiMucCay, p: DuLieuChamRubric, khoa?: string): number | null {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  const n = khoa ? cm.theoKhoa.get(khoa) : cm.goc;
  if (!n) return null;
  const v = diemNguyen(cm, n, p);
  return v == null ? null : tuNguyen(v);
}

/** Tổng thô nhiều số điểm, không làm tròn (FR-RB-010) */
export const congDiem = (ds: number[]) => tuNguyen(ds.reduce((s, x) => s + sangNguyen(x), 0));

// ————— Phần cây đang hiệu lực, hoàn tất —————

/** Lá thuộc phần cây đang hiệu lực (bỏ qua nhánh không được chọn / nhánh chưa chọn của Phương án) theo thứ tự hiển thị */
export function laHieuLuc(cay: CayRubric | ChiMucCay, p: DuLieuChamRubric): NutRubric[] {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  const kq: NutRubric[] = [];
  const di = (n: NutRubric) => {
    if (laNutLa(n)) {
      kq.push(n);
      return;
    }
    if (n.loai === 'phuong-an') {
      const nhanh = p.nhanhChon[n.khoaNut];
      const b = nhanh && cm.theoKhoa.get(nhanh);
      if (b) di(b);
      return;
    }
    conCua(cm, n.khoaNut).forEach(di);
  };
  if (cm.goc) di(cm.goc);
  return kq;
}

/** Phương án thay thế trong phần hiệu lực chưa chọn nhánh */
export function phuongAnChuaChon(cay: CayRubric | ChiMucCay, p: DuLieuChamRubric): NutRubric[] {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  const kq: NutRubric[] = [];
  const di = (n: NutRubric) => {
    if (n.loai === 'phuong-an') {
      const nhanh = p.nhanhChon[n.khoaNut];
      const b = nhanh && cm.theoKhoa.get(nhanh);
      if (b) di(b);
      else kq.push(n);
      return;
    }
    conCua(cm, n.khoaNut).forEach(di);
  };
  if (cm.goc) di(cm.goc);
  return kq;
}

/** Số ô còn phải chấm (lá hiệu lực null, không tính Điểm trừ) + số Phương án chưa chọn nhánh */
export function soOConLai(cay: CayRubric | ChiMucCay, p: DuLieuChamRubric): number {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  return (
    laHieuLuc(cm, p).filter((n) => n.loai !== 'diem-tru' && p.giaTri[n.khoaNut]?.giaTri == null).length +
    phuongAnChuaChon(cm, p).length
  );
}

/** FR-RB-008: câu hoàn tất khi mọi lá hiệu lực khác null và mọi Phương án đã chọn nhánh */
export const laHoanTat = (cay: CayRubric | ChiMucCay, p: DuLieuChamRubric) => soOConLai(cay, p) === 0;

/** FR-RB-009 "Không làm bài": 0 cho mọi lá hiệu lực, Phương án chọn nhánh đầu tiên */
export function khongLamBai(cay: CayRubric | ChiMucCay): DuLieuChamRubric {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  const p: DuLieuChamRubric = { giaTri: {}, nhanhChon: {} };
  const di = (n: NutRubric) => {
    if (laNutLa(n)) {
      const mucKhong = n.loai === 'tieu-chi-muc' ? n.muc?.find((m) => sangNguyen(m.diem) === 0) : undefined;
      p.giaTri[n.khoaNut] = { giaTri: 0, khoaMuc: mucKhong?.khoaMuc };
      return;
    }
    if (n.loai === 'phuong-an') {
      const dau = conCua(cm, n.khoaNut)[0];
      if (dau) {
        p.nhanhChon[n.khoaNut] = dau.khoaNut;
        di(dau);
      }
      return;
    }
    conCua(cm, n.khoaNut).forEach(di);
  };
  if (cm.goc) di(cm.goc);
  return p;
}

/** Khi đổi nhánh: xóa giá trị các lá của nhánh cũ (FR-RB-007) */
export function doiNhanh(cay: CayRubric | ChiMucCay, p: DuLieuChamRubric, khoaPhuongAn: string, khoaNhanhMoi: string): DuLieuChamRubric {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  const cu = p.nhanhChon[khoaPhuongAn];
  const giaTri = { ...p.giaTri };
  if (cu && cu !== khoaNhanhMoi) duyetCay(cm, cu).filter(laNutLa).forEach((n) => delete giaTri[n.khoaNut]);
  return { giaTri, nhanhChon: { ...p.nhanhChon, [khoaPhuongAn]: khoaNhanhMoi } };
}

/** Kiểm tra giá trị một lá như server (FR-RB-002, 004) */
export function kiemTraGiaTriLa(n: NutRubric, giaTri: number | null): MaLoiRubric | null {
  if (giaTri == null) return null;
  if (n.loai === 'tieu-chi-muc') return (n.muc ?? []).some((m) => sangNguyen(m.diem) === sangNguyen(giaTri)) ? null : 'SCORE_OUT_OF_RANGE';
  const max = sangNguyen(n.diemToiDa ?? 0);
  const v = sangNguyen(giaTri);
  if (v < 0 || v > max) return 'SCORE_OUT_OF_RANGE';
  const buoc = sangNguyen(n.buocDiem ?? BUOC_MAC_DINH);
  return buoc > 0 && v % buoc !== 0 ? 'SCORE_OFF_STEP' : null;
}

/** Lá có giá trị nằm trong nhánh không được chọn (server từ chối SCORE_ON_INACTIVE_BRANCH) */
export function laNgoaiNhanh(cay: CayRubric | ChiMucCay, p: DuLieuChamRubric): string[] {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  const hieuLuc = new Set(laHieuLuc(cm, p).map((n) => n.khoaNut));
  return Object.entries(p.giaTri)
    .filter(([k, v]) => v.giaTri != null && !hieuLuc.has(k) && cm.theoKhoa.get(k)?.loai !== 'diem-tru')
    .map(([k]) => k);
}

// ————— Kiểm tra hợp lệ khi soạn (VR-01 … VR-12; VR-13 ở cấp đề) —————

export interface ThamSoKiemTra {
  diemMucTieu: number;
  cheDo?: CheDoRubric;
  /** Tập bước điểm cho phép của trường (mặc định {0,25; 0,5; 1,0}) */
  buocChoPhep?: number[];
}

/** Nhãn sau kế thừa (lá kế thừa nhãn của cha gần nhất) */
export function nhanHieuLuc(cm: ChiMucCay, khoa: string) {
  let n = cm.theoKhoa.get(khoa);
  const kq: Pick<NutRubric, 'donViKienThucId' | 'yeuCauCanDatId' | 'mucDoNhanThuc'> = {};
  while (n) {
    kq.donViKienThucId ??= n.donViKienThucId;
    kq.yeuCauCanDatId ??= n.yeuCauCanDatId;
    kq.mucDoNhanThuc ??= n.mucDoNhanThuc;
    n = n.khoaCha ? cm.theoKhoa.get(n.khoaCha) : undefined;
  }
  return kq;
}

export function kiemTraHopLe(cay: CayRubric, ts: ThamSoKiemTra): VanDeRubric[] {
  const cm = lapChiMuc(cay);
  const kq: VanDeRubric[] = [];
  const them = (ma: string, mucDo: 'loi' | 'canh-bao', thongBao: string, khoaNut?: string) => kq.push({ ma, mucDo, thongBao, khoaNut });
  const la = (n: NutRubric) => `${n.maHienThi || '(chưa mã)'}`;
  const bdChoPhep = (ts.buocChoPhep ?? [0.25, 0.5, 1]).map(sangNguyen);
  if (!cm.goc) {
    them('VR-05', 'loi', 'Rubric chưa có nút gốc');
    return kq;
  }
  if ((cm.con.get(null) ?? []).length > 1) them('VR-09', 'loi', 'Rubric chỉ có một nút gốc (chính là câu hỏi)');

  // VR-01
  const tong = diemToiDaNguyen(cm, cm.goc);
  if (tong !== sangNguyen(ts.diemMucTieu))
    them('VR-01', 'loi', `Tổng rubric ${hienDiem(tuNguyen(tong))} khác điểm câu ${hienDiem(ts.diemMucTieu)}`, cm.goc.khoaNut);

  cay.nut.forEach((n) => {
    const con = conCua(cm, n.khoaNut);
    const buoc = sangNguyen(n.buocDiem ?? BUOC_MAC_DINH);
    // VR-09 quan hệ cha – con
    if (n.khoaCha) {
      const cha = cm.theoKhoa.get(n.khoaCha);
      if (!cha) them('VR-09', 'loi', `Nút ${la(n)} mồ côi (không tìm thấy nút cha)`, n.khoaNut);
      else if (!conDuocPhep[cha.loai].includes(n.loai))
        them(
          'VR-09',
          'loi',
          cha.loai === 'phuong-an' && n.loai === 'diem-tru'
            ? 'Không đặt Điểm trừ trong Phương án thay thế'
            : `${nhanLoaiNut[cha.loai]} không chứa được ${nhanLoaiNut[n.loai]}`,
          n.khoaNut,
        );
    } else if (n.loai !== 'nhom') them('VR-09', 'loi', 'Gốc rubric phải là Nhóm (đại diện cho câu)', n.khoaNut);
    // VR-04 độ sâu
    if (doSau(cm, n.khoaNut) > DO_SAU_TOI_DA) them('VR-04', 'loi', `${la(n)}: vượt quá ${DO_SAU_TOI_DA} cấp dưới gốc`, n.khoaNut);
    // VR-10 mô tả
    if (!chuThuan(n.moTa).trim()) them('VR-10', 'loi', `${la(n)}: chưa có mô tả tiêu chí`, n.khoaNut);
    else if (chuThuan(n.moTa).length > 1000) them('VR-10', 'loi', `${la(n)}: mô tả quá 1.000 ký tự`, n.khoaNut);
    // Bước điểm thuộc tập cho phép
    if (laNutLa(n) && n.loai !== 'tieu-chi-muc' && !bdChoPhep.includes(buoc))
      them('VR-03', 'loi', `${la(n)}: bước điểm ${hienDiem(tuNguyen(buoc))} không thuộc tập cho phép`, n.khoaNut);

    switch (n.loai) {
      case 'tieu-chi': {
        const max = sangNguyen(n.diemToiDa ?? 0);
        if (max <= 0) them('VR-02', 'loi', `${la(n)}: tiêu chí chưa có điểm`, n.khoaNut);
        else if (buoc > 0 && max % buoc !== 0)
          them('VR-03', 'loi', `${la(n)}: ${hienDiem(tuNguyen(max))} không chia hết cho bước ${hienDiem(tuNguyen(buoc))}`, n.khoaNut);
        if (max > 100) them('VR-12', 'canh-bao', `${la(n)}: tiêu chí lớn (${hienDiem(tuNguyen(max))} điểm), nên chia nhỏ để chấm đều tay`, n.khoaNut);
        break;
      }
      case 'diem-tru': {
        const max = sangNguyen(n.diemToiDa ?? 0);
        if (max <= 0) them('VR-02', 'loi', `${la(n)}: điểm trừ chưa có mức trừ tối đa`, n.khoaNut);
        else if (buoc > 0 && max % buoc !== 0)
          them('VR-03', 'loi', `${la(n)}: mức trừ ${hienDiem(tuNguyen(max))} không chia hết cho bước ${hienDiem(tuNguyen(buoc))}`, n.khoaNut);
        break;
      }
      case 'tieu-chi-muc': {
        const muc = n.muc ?? [];
        const diem = muc.map((m) => sangNguyen(m.diem));
        if (muc.length < 2) them('VR-07', 'loi', `${la(n)}: cần ít nhất 2 mức`, n.khoaNut);
        if (!diem.includes(0)) them('VR-07', 'loi', `${la(n)}: thiếu mức 0 điểm`, n.khoaNut);
        if (new Set(diem).size !== diem.length) them('VR-07', 'loi', `${la(n)}: điểm các mức phải khác nhau`, n.khoaNut);
        if (muc.some((m) => !chuThuan(m.moTa).trim() || !m.nhan.trim())) them('VR-07', 'loi', `${la(n)}: mỗi mức cần tên và mô tả`, n.khoaNut);
        // Điểm mức là bội của 0,25 (đơn vị 0,01 → bội của 25)
        const le = diem.find((d) => d % 25 !== 0);
        if (le != null) them('VR-03', 'loi', `${la(n)}: điểm mức ${hienDiem(tuNguyen(le))} không chia hết cho bước 0,25`, n.khoaNut);
        if (Math.max(0, ...diem) > 100) them('VR-12', 'canh-bao', `${la(n)}: tiêu chí lớn, nên chia nhỏ để chấm đều tay`, n.khoaNut);
        break;
      }
      case 'nhom': {
        if (!con.some((c) => c.loai !== 'diem-tru')) them('VR-05', 'loi', `${la(n)}: nhóm chưa có tiêu chí`, n.khoaNut);
        const tru = con.filter((c) => c.loai === 'diem-tru').reduce((s, c) => s + sangNguyen(c.diemToiDa ?? 0), 0);
        if (tru > diemToiDaNguyen(cm, n)) them('VR-08', 'loi', `${la(n)}: tổng điểm trừ vượt điểm tối đa của nhóm`, n.khoaNut);
        break;
      }
      case 'phuong-an': {
        if (con.length < 2) them('VR-06', 'loi', `${la(n)}: cần ít nhất 2 nhánh`, n.khoaNut);
        const moc = con[0] ? diemToiDaNguyen(cm, con[0]) : 0;
        con.slice(1).forEach((c, i) => {
          const d = diemToiDaNguyen(cm, c);
          if (d !== moc)
            them('VR-06', 'loi', `Cách ${i + 2} tối đa ${hienDiem(tuNguyen(d))}, khác Cách 1 là ${hienDiem(tuNguyen(moc))}`, c.khoaNut);
        });
        const mo = con.filter((c) => c.laNhanhMo);
        if (mo.length > 1) them('VR-06', 'loi', `${la(n)}: tối đa 1 nhánh "Cách khác"`, n.khoaNut);
        mo.forEach((c) => {
          if (c.loai !== 'tieu-chi') them('VR-06', 'loi', `${la(c)}: nhánh "Cách khác" phải là một Tiêu chí duy nhất`, c.khoaNut);
        });
        break;
      }
    }
  });

  // VR-11 nhãn của lá (sau kế thừa)
  const thieuNhan = cay.nut.filter((n) => laNutLa(n) && n.loai !== 'diem-tru').filter((n) => {
    const nh = nhanHieuLuc(cm, n.khoaNut);
    return !nh.donViKienThucId || !nh.mucDoNhanThuc;
  });
  if (thieuNhan.length)
    them(
      'VR-11',
      ts.cheDo === 'dgtx' ? 'canh-bao' : 'loi',
      `${thieuNhan.length} tiêu chí chưa gắn đơn vị kiến thức / mức độ nhận thức`,
      thieuNhan[0].khoaNut,
    );
  return kq;
}

/** VR-13 (cấp đề, cảnh báo): phân bố điểm theo mức độ nhận thức tính từ lá so với ma trận */
export function phanBoTheoMucDo(cay: CayRubric): Record<string, number> {
  const cm = lapChiMuc(cay);
  const kq: Record<string, number> = {};
  cay.nut
    .filter((n) => n.loai === 'tieu-chi' || n.loai === 'tieu-chi-muc')
    .forEach((n) => {
      const md = nhanHieuLuc(cm, n.khoaNut).mucDoNhanThuc ?? 'chua-gan';
      kq[md] = (kq[md] ?? 0) + diemToiDaNguyen(cm, n);
    });
  // Nhánh thay thế: chỉ tính nhánh đầu để không đếm trùng
  cay.nut
    .filter((n) => n.loai === 'phuong-an')
    .forEach((pa) =>
      conCua(cm, pa.khoaNut)
        .slice(1)
        .forEach((nhanh) =>
          duyetCay(cm, nhanh.khoaNut)
            .filter((n) => n.loai === 'tieu-chi' || n.loai === 'tieu-chi-muc')
            .forEach((n) => {
              const md = nhanHieuLuc(cm, n.khoaNut).mucDoNhanThuc ?? 'chua-gan';
              kq[md] -= diemToiDaNguyen(cm, n);
            }),
        ),
    );
  return Object.fromEntries(Object.entries(kq).map(([k, v]) => [k, tuNguyen(v)]));
}

// ————— Mã hiển thị —————

const chuCai = 'abcdefghijklmnopqrstuvwxyz';
const soLaMa = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

/** Sinh lại mã hiển thị theo vị trí: gốc = maGoc; cấp 1: a, b…; cấp 2: 1, 2…; cấp 3: i, ii…; cấp 4: 1, 2… */
export function sinhMaHienThi(cay: CayRubric, maGoc: string): CayRubric {
  const cm = lapChiMuc(cay);
  const ma = new Map<string, string>();
  // Gốc là số câu (3) → con "3.a"; gốc là nhãn chữ (câu trong ngân hàng chưa có số) → con "a", "a.1"
  const coTienTo = /^\d+$/.test(maGoc);
  const di = (n: NutRubric, maN: string, cap: number) => {
    ma.set(n.khoaNut, maN);
    conCua(cm, n.khoaNut).forEach((c, i) => {
      const ky = cap === 0 ? chuCai[i] ?? String(i + 1) : cap === 2 ? soLaMa[i] ?? String(i + 1) : String(i + 1);
      di(c, cap === 0 && !coTienTo ? ky : `${maN}.${ky}`, cap + 1);
    });
  };
  if (cm.goc) di(cm.goc, maGoc, 0);
  return { nut: cay.nut.map((n) => ({ ...n, maHienThi: ma.get(n.khoaNut) ?? n.maHienThi })) };
}

// ————— So khác biệt phiên bản (FR-RB-038) —————

export interface KhacBietPhienBan {
  kieu: 'khong-doi' | 'hinh-thuc' | 'tinh-diem';
  /** Lá có thay đổi ảnh hưởng tính điểm (phải nhập lại) — bao gồm lá mới */
  laPhaiNhapLai: string[];
  nutThem: string[];
  nutXoa: string[];
  nutDoiHinhThuc: string[];
}

const khoaTinhDiem = (n: NutRubric) =>
  JSON.stringify([n.loai, n.khoaCha, n.thuTu, sangNguyen(n.diemToiDa ?? 0), sangNguyen(n.buocDiem ?? BUOC_MAC_DINH), !!n.laNhanhMo, (n.muc ?? []).map((m) => [m.khoaMuc, sangNguyen(m.diem)])]);
const khoaHinhThuc = (n: NutRubric) =>
  JSON.stringify([n.moTa, n.dapAnMau ?? '', n.maHienThi, n.donViKienThucId, n.yeuCauCanDatId, n.mucDoNhanThuc, (n.muc ?? []).map((m) => [m.nhan, m.moTa])]);

export function soSanhPhienBan(cu: CayRubric, moi: CayRubric): KhacBietPhienBan {
  const a = new Map(cu.nut.map((n) => [n.khoaNut, n]));
  const b = new Map(moi.nut.map((n) => [n.khoaNut, n]));
  const nutThem = [...b.keys()].filter((k) => !a.has(k));
  const nutXoa = [...a.keys()].filter((k) => !b.has(k));
  const doiDiem = [...b.keys()].filter((k) => a.has(k) && khoaTinhDiem(a.get(k)!) !== khoaTinhDiem(b.get(k)!));
  const nutDoiHinhThuc = [...b.keys()].filter((k) => a.has(k) && khoaHinhThuc(a.get(k)!) !== khoaHinhThuc(b.get(k)!));
  const tinhDiemDoi = nutThem.length > 0 || nutXoa.length > 0 || doiDiem.length > 0;
  const laPhaiNhapLai = [...nutThem, ...doiDiem].filter((k) => laNutLa(b.get(k)!));
  return {
    kieu: tinhDiemDoi ? 'tinh-diem' : nutDoiHinhThuc.length ? 'hinh-thuc' : 'khong-doi',
    laPhaiNhapLai,
    nutThem,
    nutXoa,
    nutDoiHinhThuc,
  };
}

// ————— Làm tròn tổng bài (FR-RB-011, 012) —————

export const cauHinhLamTronMacDinh: Record<'tieu-hoc' | 'thcs' | 'thpt', CauHinhLamTron> = {
  'tieu-hoc': { soChuSoThapPhan: 0, cachLamTron: 'nua-len', diemToiThieu: 1 },
  thcs: { soChuSoThapPhan: 1, cachLamTron: 'nua-len', diemToiThieu: 0 },
  thpt: { soChuSoThapPhan: 1, cachLamTron: 'nua-len', diemToiThieu: 0 },
};

/** Làm tròn một lần ở tổng bài (tính trên số nguyên đơn vị 0,01) */
export function lamTronTongBai(tongTho: number, ch: CauHinhLamTron): number {
  const v = sangNguyen(tongTho);
  const don = 10 ** (2 - ch.soChuSoThapPhan);
  const du = v % don;
  const nguyen = v - du;
  let kq: number;
  if (ch.cachLamTron === 'lam-tron-xuong') kq = nguyen;
  else if (du * 2 > don) kq = nguyen + don;
  else if (du * 2 < don) kq = nguyen;
  else kq = ch.cachLamTron === 'nua-len' || (nguyen / don) % 2 === 1 ? nguyen + don : nguyen;
  return Math.max(tuNguyen(kq), ch.diemToiThieu);
}

// ————— Tạo nút / cây —————

export const taoKhoa = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function taoNut(loai: LoaiNutRubric, khoaCha: string | null, thuTu: number, them: Partial<NutRubric> = {}): NutRubric {
  return {
    khoaNut: taoKhoa(),
    khoaCha,
    thuTu,
    loai,
    maHienThi: '',
    moTa: '',
    ...(loai === 'tieu-chi' ? { diemToiDa: 0.5, buocDiem: BUOC_MAC_DINH } : {}),
    ...(loai === 'diem-tru' ? { diemToiDa: 0.25, buocDiem: BUOC_MAC_DINH } : {}),
    ...(loai === 'tieu-chi-muc'
      ? {
          muc: [
            { khoaMuc: taoKhoa(), nhan: 'Tốt', moTa: '', diem: 1 },
            { khoaMuc: taoKhoa(), nhan: 'Đạt', moTa: '', diem: 0.5 },
            { khoaMuc: taoKhoa(), nhan: 'Chưa đạt', moTa: '', diem: 0 },
          ],
        }
      : {}),
    ...them,
  };
}

/** Rubric khởi tạo cho câu mới: gốc + 1 tiêu chí mang toàn bộ điểm mục tiêu */
export function taoCayMacDinh(diemMucTieu: number, maGoc = 'Câu'): CayRubric {
  const goc = taoNut('nhom', null, 0, { moTa: 'Toàn câu', maHienThi: maGoc });
  const tc = taoNut('tieu-chi', goc.khoaNut, 0, { moTa: '', diemToiDa: diemMucTieu || 1 });
  return sinhMaHienThi({ nut: [goc, tc] }, maGoc);
}

/** Rubric phẳng cũ (danh sách tiêu chí + điểm) → cây: gốc nhóm + các tiêu chí. Dùng chuyển dữ liệu cũ / nhập nhanh */
export function cayTuDanhSachTieuChi(ds: { tieuChi?: string; moTa?: string; diemToiDa: number }[], maGoc = 'Câu'): CayRubric {
  const goc = taoNut('nhom', null, 0, { moTa: 'Toàn câu', maHienThi: maGoc });
  const la = ds.map((t, i) => taoNut('tieu-chi', goc.khoaNut, i, { moTa: t.tieuChi ?? t.moTa ?? '', diemToiDa: t.diemToiDa }));
  return sinhMaHienThi({ nut: [goc, ...la] }, maGoc);
}

/** Áp các thay đổi ô lá lên dữ liệu chấm (tiêu chí theo mức: đặt điểm theo mức chọn; chỉ ghi chú: giữ điểm) */
export function apThayDoiLa(
  cay: CayRubric | ChiMucCay,
  p: DuLieuChamRubric,
  ds: { khoaNut: string; giaTri?: number | null; khoaMuc?: string; ghiChu?: string }[],
): DuLieuChamRubric {
  const cm = 'nut' in cay ? lapChiMuc(cay) : cay;
  const giaTri = { ...p.giaTri };
  ds.forEach((d) => {
    const n = cm.theoKhoa.get(d.khoaNut);
    const cu = giaTri[d.khoaNut] ?? { giaTri: null };
    const m = d.khoaMuc ? n?.muc?.find((x) => x.khoaMuc === d.khoaMuc) : undefined;
    giaTri[d.khoaNut] = {
      giaTri: m ? m.diem : d.giaTri !== undefined ? d.giaTri : cu.giaTri,
      khoaMuc: m?.khoaMuc ?? cu.khoaMuc,
      ghiChu: d.ghiChu ?? cu.ghiChu,
    };
  });
  return { ...p, giaTri };
}

/** Sao chép cây với khóa nút mới (áp mẫu / nhân bản — không liên kết với nguồn) */
export function saoChepCay(cay: CayRubric, giuKhoa = false): CayRubric {
  if (giuKhoa) return structuredClone(cay);
  const doi = new Map(cay.nut.map((n) => [n.khoaNut, taoKhoa()]));
  return {
    nut: cay.nut.map((n) => ({
      ...structuredClone(n),
      khoaNut: doi.get(n.khoaNut)!,
      khoaCha: n.khoaCha ? doi.get(n.khoaCha) ?? null : null,
      muc: n.muc?.map((m) => ({ ...m, khoaMuc: taoKhoa() })),
    })),
  };
}

// ————— Hướng dẫn chấm (FR-RB-027) & nhập từ bảng dán (FR-RB-028) —————

const thoat = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Nội dung ô nhập (mô tả / đáp án mẫu / mô tả mức) → HTML an toàn: HTML của OEditor giữ nguyên, chuỗi thường thì escape */
export const noiDungHtml = (s?: string) => (laHtml(s) ? (s as string) : thoat(s ?? ''));

/** Bảng HTML "Câu | Ý | Nội dung đáp án | Điểm" — dùng in PDF và xuất Word */
export function xuatHuongDanChamHtml(cay: CayRubric, tieuDe: string): string {
  const cm = lapChiMuc(cay);
  const dong: string[] = [];
  const di = (n: NutRubric, nhanhThu?: number) => {
    const con = conCua(cm, n.khoaNut);
    const diem = n.loai === 'diem-tru' ? `trừ tối đa ${hienDiem(n.diemToiDa)}` : hienDiem(tinhDiemToiDa(cm, n.khoaNut));
    const cau = n.khoaCha ? '' : `<b>${thoat(n.maHienThi)}</b>`;
    const y = n.khoaCha ? thoat(n.maHienThi) : '';
    let noiDung = `${nhanhThu ? `<i>Cách ${nhanhThu}:</i> ` : ''}${noiDungHtml(n.moTa)}`;
    if (n.laNhanhMo) noiDung = '<i>Học sinh làm cách khác đúng vẫn cho điểm tối đa.</i>';
    if (n.dapAnMau) noiDung += `<div style="color:#444">${noiDungHtml(n.dapAnMau)}</div>`;
    if (n.loai === 'tieu-chi-muc')
      noiDung += `<ul>${(n.muc ?? []).map((m) => `<li><b>${thoat(m.nhan)} (${hienDiem(m.diem)}đ)</b>: ${noiDungHtml(m.moTa)}</li>`).join('')}</ul>`;
    dong.push(`<tr><td>${cau}</td><td>${y}</td><td>${noiDung}</td><td style="text-align:center">${diem}</td></tr>`);
    con.forEach((c, i) => di(c, n.loai === 'phuong-an' ? i + 1 : undefined));
  };
  if (cm.goc) di(cm.goc);
  return `<h3>${thoat(tieuDe)}</h3><table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%;font-family:'Times New Roman';font-size:13pt"><thead><tr><th style="width:8%">Câu</th><th style="width:10%">Ý</th><th>Nội dung đáp án</th><th style="width:12%">Điểm</th></tr></thead><tbody>${dong.join('')}</tbody></table>`;
}

/**
 * Dựng cây từ bảng hướng dẫn chấm dán từ Word/Excel (4 cột phân tách tab: Câu | Ý | Nội dung | Điểm).
 * Dòng có cột Câu mở câu (gốc); dòng có Ý mới mở nhóm ý; dòng chỉ có nội dung + điểm là tiêu chí của ý hiện tại.
 */
export function dungCayTuBangDan(chuoi: string, maGoc = 'Câu'): CayRubric {
  const goc = taoNut('nhom', null, 0, { moTa: 'Toàn câu', maHienThi: maGoc });
  const nut: NutRubric[] = [goc];
  let yHienTai: NutRubric | null = null;
  chuoi
    .split(/\r?\n/)
    .map((d) => d.split('\t').map((o) => o.trim()))
    .filter((o) => o.some(Boolean))
    .forEach(([cotCau = '', cotY = '', noiDung = '', cotDiem = '']) => {
      if (cotCau && !cotY && !noiDung) return;
      const diem = docSo(cotDiem);
      if (cotY) {
        yHienTai = taoNut('nhom', goc.khoaNut, conDem(nut, goc.khoaNut), { moTa: noiDung && diem == null ? noiDung : `Ý ${cotY}` });
        nut.push(yHienTai);
        if (noiDung && diem != null && !Number.isNaN(diem))
          nut.push(taoNut('tieu-chi', yHienTai.khoaNut, 0, { moTa: noiDung, diemToiDa: diem }));
        return;
      }
      if (!noiDung) return;
      const cha: NutRubric = yHienTai ?? goc;
      nut.push(taoNut('tieu-chi', cha.khoaNut, conDem(nut, cha.khoaNut), { moTa: noiDung, diemToiDa: diem != null && !Number.isNaN(diem) ? diem : 0 }));
    });
  return sinhMaHienThi({ nut }, maGoc);
}

const conDem = (ds: NutRubric[], khoa: string) => ds.filter((n) => n.khoaCha === khoa).length;
