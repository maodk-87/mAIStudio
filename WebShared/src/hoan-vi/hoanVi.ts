/**
 * Engine HOÁN VỊ ĐỀ phía FE — soi gương `KTDG.CauHoi.HoanVi` (BE), cùng bộ sinh ngẫu nhiên xác định nên
 * cùng đề + cùng hạt giống cho CÙNG mã đề ở FE và BE (xem trước, chế độ mock, đối soát).
 *
 * Hoán vị tự động 2 bước (YC-DT-05, docs/nghiep-vu-hoan-vi-de.md):
 *  (1) bố cục theo mẫu đề — thứ tự phần giữ nguyên, đảo câu trong phần; liên phần chỉ khi mẫu đề cho phép và chỉ đổi chỗ
 *      giữa các câu CÙNG LOẠI; câu cố định vị trí không đổi chỗ; câu chùm đi nguyên cụm;
 *  (2) theo chế độ đảo của từng câu (YC-NH-05b) — đảo lệnh hỏi (câu con) và/hoặc phương án; Đúng/Sai 4 ý giữ a-b-c-d;
 *      phương án "Tất cả các ý trên"/đánh dấu cố định ghim tại chỗ; câu chùm có ký hiệu N** gắn câu con không đảo câu con.
 */
import { BoSinhNgauNhien, daoGiuCoDinh } from './boSinhNgauNhien';
import { coKyHieuGanCauCon } from './danhSoViTri';
import {
  LOAI_CAU_HV,
  LoiKhongSinhDuMaDe,
  LoiVuotSoHoanViKhaDi,
  type CauTrongDeHv,
  type CauTrucDeHv,
  type CheDoDaoHv,
  type DoiChieuCauHv,
  type DongDapAnHv,
  type MaDeSinh,
  type NoiDungCauHv,
  type PhuongAnHv,
  type TuyChonSinhMaDe,
} from './kieu';

/** Trần ước lượng số hoán vị khả dĩ — đủ lớn để coi như không giới hạn */
export const TRAN_HOAN_VI_KHA_DI = 1_000_000;

const MAU_GHIM_RE =
  /(tất cả|cả)\s+(các\s+)?(ý|đáp án|phương án|câu)\s+(trên|đều đúng|đều sai)|cả\s+[a-d]\s*,\s*[a-d]|không có (ý|đáp án|phương án) nào/i;

const CHE_DO_MAC_DINH: CheDoDaoHv = 'dao-lenh-hoi-va-dap-an';
const daoLenhHoi = (cheDo: CheDoDaoHv) => cheDo === 'dao-lenh-hoi-va-dap-an' || cheDo === 'chi-dao-lenh-hoi';
const daoDapAn = (cheDo: CheDoDaoHv) => cheDo === 'dao-lenh-hoi-va-dap-an' || cheDo === 'chi-dao-dap-an';
const laTracNghiem = (loaiCau: string) => loaiCau === LOAI_CAU_HV.TracNghiem1 || loaiCau === LOAI_CAU_HV.TracNghiemNhieu;
const laCauChum = (cau: NoiDungCauHv) => cau.loaiCau === LOAI_CAU_HV.CauChum && (cau.cauCon?.length ?? 0) > 0;

/** Phương án cố định vị trí: đánh dấu hoặc nội dung dạng "Tất cả các ý trên"/"Cả A, B đều đúng" */
export const laPhuongAnGhim = (p: PhuongAnHv): boolean => !!p.coDinhViTri || MAU_GHIM_RE.test(p.noiDung.replace(/<[^>]+>/g, ' '));

/** Loại câu dùng để ghép cặp khi đảo liên phần — câu chùm xét theo loại của câu con đầu tiên */
const loaiGhepCap = (c: CauTrongDeHv): string => (laCauChum(c.noiDung) ? c.noiDung.cauCon![0].loaiCau : c.noiDung.loaiCau);

/** Bước 2 cho một câu (đệ quy câu con) */
function daoNoiDung<T extends NoiDungCauHv>(cau: T, rng: BoSinhNgauNhien, cheDoEp?: CheDoDaoHv): T {
  const cheDo = cheDoEp ?? cau.cheDoDao ?? CHE_DO_MAC_DINH;
  let kq: T = cheDoEp ? { ...cau, cheDoDao: cheDoEp } : cau;
  if (laCauChum(cau)) {
    const dsCon = daoLenhHoi(cheDo) && !coKyHieuGanCauCon(cau) ? daoGiuCoDinh(cau.cauCon!, () => false, rng) : cau.cauCon!;
    // Câu con kế thừa quyền đảo đáp án của câu mẹ
    const cheDoCon: CheDoDaoHv = daoDapAn(cheDo) ? 'chi-dao-dap-an' : 'khong-dao';
    kq = { ...kq, cauCon: dsCon.map((c) => daoNoiDung(c, rng, cheDoCon)) };
  }
  if (daoDapAn(cheDo) && laTracNghiem(cau.loaiCau) && cau.phuongAn.length > 1)
    kq = { ...kq, phuongAn: daoGiuCoDinh(cau.phuongAn, laPhuongAnGhim, rng) };
  return kq;
}

/** Sinh MỘT mã đề theo hạt giống (không kiểm tra chất lượng) — tương đương `HoanVi.SinhMaDe` của BE */
export function sinhMaDe<T extends CauTrucDeHv>(de: T, hatGiong: string): T {
  const rng = new BoSinhNgauNhien(hatGiong);
  let dsPhan: T['dsPhan'];
  if (de.choPhepDaoLienPhan && de.dsPhan.length > 1) {
    const tatCa = de.dsPhan.flatMap((p) => p.dsCau);
    const daDao = tatCa.slice();
    for (const loai of Array.from(new Set(tatCa.map(loaiGhepCap)))) {
      const viTri = tatCa.map((_, i) => i).filter((i) => loaiGhepCap(tatCa[i]) === loai);
      const cungLoai = daoGiuCoDinh(
        viTri.map((i) => tatCa[i]),
        (c) => !!c.coDinhViTri || !!c.laCauNeo,
        rng,
      );
      viTri.forEach((v, k) => {
        daDao[v] = cungLoai[k];
      });
    }
    let viTriPhan = 0;
    dsPhan = de.dsPhan.map((p) => {
      const phan = { ...p, dsCau: daDao.slice(viTriPhan, viTriPhan + p.dsCau.length) };
      viTriPhan += p.dsCau.length;
      return phan;
    });
  } else {
    dsPhan = de.dsPhan.map((p) => ({ ...p, dsCau: daoGiuCoDinh(p.dsCau, (c) => !!c.coDinhViTri, rng) }));
  }
  dsPhan = dsPhan.map((p) => ({ ...p, dsCau: p.dsCau.map((c) => ({ ...c, noiDung: daoNoiDung(c.noiDung, rng) })) }));
  return { ...de, dsPhan };
}

/** Chữ ký thứ tự của đề/mã đề: id câu → id phương án → id câu con theo thứ tự hiển thị */
export function chuKy(de: CauTrucDeHv): string {
  const cau = (c: NoiDungCauHv, id: string): string =>
    `${id}[${c.phuongAn.map((p) => p.id).join(',')}]${c.cauCon?.length ? `{${c.cauCon.map((con) => cau(con, con.id)).join('')}}` : ''}`;
  return de.dsPhan.map((p) => `|${p.dsCau.map((c) => cau(c.noiDung, c.cauHoiId)).join('')}`).join('');
}

/**
 * false khi trong một phần có từ `nguong` câu trắc nghiệm một đáp án LIÊN TIẾP (kể cả câu con của câu chùm) có đáp án đúng
 * ở cùng vị trí. Bộ đếm bắt đầu lại ở mỗi phần; loại câu khác ngắt chuỗi.
 */
export function datDapAnLienTiep(de: CauTrucDeHv, nguong = 4): boolean {
  for (const phan of de.dsPhan) {
    let dem = 0;
    let truoc = -1;
    for (const cau of phan.dsCau.flatMap((c) => (c.noiDung.loaiCau === LOAI_CAU_HV.CauChum ? (c.noiDung.cauCon ?? []) : [c.noiDung]))) {
      const viTri = cau.loaiCau === LOAI_CAU_HV.TracNghiem1 ? cau.phuongAn.findIndex((p) => p.dung) : -1;
      if (viTri < 0) {
        dem = 0;
        truoc = -1;
        continue;
      }
      dem = viTri === truoc ? dem + 1 : 1;
      truoc = viTri;
      if (dem >= nguong) return false;
    }
  }
  return true;
}

/**
 * Ước lượng số hoán vị khác nhau của đề (tính cả thứ tự đề gốc), dừng ở `tran`:
 * ∏ phạm vi đảo (số câu di động)! × ∏ câu (số phương án di động)! × ∏ câu chùm được đảo con (số câu con)!.
 */
export function soHoanViKhaDi(de: CauTrucDeHv, tran = TRAN_HOAN_VI_KHA_DI): number {
  let tich = 1;
  const nhan = (n: number): boolean => {
    for (let i = 2; i <= n && tich < tran; i++) tich *= i;
    return tich >= tran;
  };
  const noiDung = (c: NoiDungCauHv, cheDo: CheDoDaoHv): boolean => {
    if (laCauChum(c)) {
      if (daoLenhHoi(cheDo) && !coKyHieuGanCauCon(c) && nhan(c.cauCon!.length)) return true;
      const cheDoCon: CheDoDaoHv = daoDapAn(cheDo) ? 'chi-dao-dap-an' : 'khong-dao';
      for (const con of c.cauCon!) if (noiDung(con, cheDoCon)) return true;
    }
    return daoDapAn(cheDo) && laTracNghiem(c.loaiCau) && nhan(c.phuongAn.filter((p) => !laPhuongAnGhim(p)).length);
  };
  const tatCa = de.dsPhan.flatMap((p) => p.dsCau);
  const phamVi =
    de.choPhepDaoLienPhan && de.dsPhan.length > 1
      ? Array.from(new Set(tatCa.map(loaiGhepCap))).map(
          (loai) => tatCa.filter((c) => loaiGhepCap(c) === loai && !c.coDinhViTri && !c.laCauNeo).length,
        )
      : de.dsPhan.map((p) => p.dsCau.filter((c) => !c.coDinhViTri).length);
  for (const n of phamVi) if (nhan(n)) return tran;
  for (const c of tatCa) if (noiDung(c.noiDung, c.noiDung.cheDoDao ?? CHE_DO_MAC_DINH)) return tran;
  return tich;
}

/**
 * Sinh MỘT mã đề đạt kiểm tra: thử `hatGiong` trước (kết quả giống `sinhMaDe` nếu đạt), không đạt thì thử
 * `{hatGiong}:2`, `:3`… Chữ ký mã đề đạt được thêm vào `chuKyDaCo`.
 */
export function sinhMaDeDatChuan<T extends CauTrucDeHv>(
  de: T,
  hatGiong: string,
  chuKyDaCo: Set<string>,
  tuyChon: TuyChonSinhMaDe = {},
): MaDeSinh<T> {
  const chuKyGoc = tuyChon.khongTrungDeGoc === false ? null : chuKy(de);
  const lanToiDa = Math.max(tuyChon.soLanThuToiDa ?? 25, 1);
  let dau: T | undefined;
  for (let lan = 1; lan <= lanToiDa; lan++) {
    const hg = lan === 1 ? hatGiong : `${hatGiong}:${lan}`;
    const md = sinhMaDe(de, hg);
    dau ??= md;
    const ck = chuKy(md);
    if (ck === chuKyGoc || chuKyDaCo.has(ck) || !datDapAnLienTiep(md, tuyChon.nguongDapAnLienTiep ?? 4)) continue;
    chuKyDaCo.add(ck);
    return { thuTu: 0, hatGiong: hg, cauTruc: md, soLanThu: lan, dat: true };
  }
  if (tuyChon.nemLoiKhiKhongDat !== false) throw new LoiKhongSinhDuMaDe(0, 1);
  return { thuTu: 0, hatGiong, cauTruc: dau as T, soLanThu: lanToiDa, dat: false };
}

/**
 * Sinh `soMaDe` mã đề từ một đề gốc, có kiểm tra chất lượng: không quá ngưỡng đáp án đúng liên tiếp cùng vị trí, không trùng
 * nhau, không trùng `chuKyDaCo` (mã đề cùng thế hệ đã có) và (mặc định) không trùng đề gốc. Lần thử đầu của mã thứ i dùng hạt
 * giống `{hatGiongGoc}:{i}` — tương đương `HoanVi.SinhBoMaDe` của BE.
 */
export function sinhBoMaDe<T extends CauTrucDeHv>(
  de: T,
  soMaDe: number,
  hatGiongGoc: string,
  tuyChon: TuyChonSinhMaDe = {},
  chuKyDaCo: Iterable<string> = [],
): MaDeSinh<T>[] {
  const nemLoi = tuyChon.nemLoiKhiKhongDat !== false;
  const tapChuKy = new Set(chuKyDaCo);
  const toiDa = soHoanViKhaDi(de) - (tuyChon.khongTrungDeGoc === false ? 0 : 1);
  if (soMaDe < 1 || (nemLoi && toiDa < soMaDe + tapChuKy.size)) throw new LoiVuotSoHoanViKhaDi(Math.max(toiDa, 0), soMaDe);
  const motMa: TuyChonSinhMaDe = { ...tuyChon, soLanThuToiDa: tuyChon.soLanThuToiDa ?? soMaDe * 25, nemLoiKhiKhongDat: false };
  const kq: MaDeSinh<T>[] = [];
  for (let i = 1; i <= soMaDe; i++) {
    const md = sinhMaDeDatChuan(de, `${hatGiongGoc}:${i}`, tapChuKy, motMa);
    if (!md.dat && nemLoi) throw new LoiKhongSinhDuMaDe(kq.length, soMaDe);
    kq.push({ ...md, thuTu: i });
  }
  return kq;
}

/** Chia `soMaDe` cho `soDeGoc` đề gốc: mỗi đề ⌊N/M⌋, phần dư cộng 1 cho các đề đầu (24, 5 → 5,5,5,5,4) */
export function phanBo(soMaDe: number, soDeGoc: number): number[] {
  if (soDeGoc < 1) return [];
  const n = Math.max(Math.trunc(soMaDe), 0);
  const moi = Math.floor(n / soDeGoc);
  const du = n % soDeGoc;
  return Array.from({ length: soDeGoc }, (_, i) => moi + (i < du ? 1 : 0));
}

/**
 * Thứ tự mã đề trong nhóm đề — xen kẽ các đề gốc: bắt đầu từ một đề gốc chọn theo hạt giống, lặp vòng tròn, mỗi lượt lấy một
 * mã đề chưa dùng, bỏ qua đề gốc đã hết. Trả về (chỉ số đề gốc, chỉ số mã đề trong đề gốc đó).
 */
export function xepXenKe(soMaDeTheoDeGoc: readonly number[], hatGiong: string): { deGoc: number; maDe: number }[] {
  const kq: { deGoc: number; maDe: number }[] = [];
  const m = soMaDeTheoDeGoc.length;
  if (!m) return kq;
  const daLay = Array.from({ length: m }, () => 0);
  const tong = soMaDeTheoDeGoc.reduce((s, n) => s + Math.max(n, 0), 0);
  let k = new BoSinhNgauNhien(hatGiong).tiep(m);
  while (kq.length < tong) {
    if (daLay[k] < soMaDeTheoDeGoc[k]) kq.push({ deGoc: k, maDe: daLay[k]++ });
    k = (k + 1) % m;
  }
  return kq;
}

/** Đáp án của một câu theo vị trí hiển thị — tương đương `HoanVi.DapAnCua` của BE */
export function dapAnCua(c: NoiDungCauHv): string {
  switch (c.loaiCau) {
    case LOAI_CAU_HV.TracNghiem1:
    case LOAI_CAU_HV.TracNghiemNhieu:
    case LOAI_CAU_HV.DungSai:
      return c.phuongAn.map((p, i) => (p.dung ? String.fromCharCode(65 + i) : '')).join('');
    case LOAI_CAU_HV.DungSai4Y:
      return c.phuongAn.map((p) => (p.dung ? 'Đ' : 'S')).join('');
    case LOAI_CAU_HV.TraLoiNgan:
    case LOAI_CAU_HV.DienKhuyet:
      return c.dapAnGoiY ?? '';
    case LOAI_CAU_HV.SapXep:
    case LOAI_CAU_HV.KeoTha:
      return c.phuongAn.map((_, i) => i + 1).join('-');
    case LOAI_CAU_HV.GhepDoi:
    case LOAI_CAU_HV.NoiDay:
      return 'Theo cặp';
    default:
      return 'TL';
  }
}

/** Trải đề thành các câu được đánh số (câu chùm → từng câu con) */
function traiCau(de: CauTrucDeHv): { id: string; cauHoiId: string; cau: NoiDungCauHv }[] {
  return de.dsPhan
    .flatMap((p) => p.dsCau)
    .flatMap((c) =>
      laCauChum(c.noiDung)
        ? c.noiDung.cauCon!.map((con) => ({ id: `${c.cauHoiId}/${con.id}`, cauHoiId: con.id, cau: con }))
        : [{ id: c.cauHoiId, cauHoiId: c.cauHoiId, cau: c.noiDung }],
    );
}

/** Bảng đáp án mã đề theo thứ tự hiển thị — tương đương `HoanVi.BangDapAn` của BE */
export const bangDapAn = (de: CauTrucDeHv): DongDapAnHv[] =>
  traiCau(de)
    .filter((x) => x.cau.loaiCau !== LOAI_CAU_HV.CauChum)
    .map((x, i) => ({ thuTu: i + 1, cauHoiId: x.cauHoiId, dapAn: dapAnCua(x.cau) }));

const nhanPhuongAn = (loaiCau: string, i: number) => String.fromCharCode((loaiCau === LOAI_CAU_HV.DungSai4Y ? 97 : 65) + i);

/** Đối chiếu mã đề → đề gốc theo từng câu được đánh số: thứ tự gốc, đáp án, nhãn gốc của từng phương án */
export function doiChieu(goc: CauTrucDeHv, maDe: CauTrucDeHv): DoiChieuCauHv[] {
  const thuTuGoc = new Map<string, number>();
  const nhanGoc = new Map<string, Map<string, string>>();
  traiCau(goc).forEach((x, i) => {
    thuTuGoc.set(x.id, i + 1);
    nhanGoc.set(x.id, new Map(x.cau.phuongAn.map((p, k) => [p.id, nhanPhuongAn(x.cau.loaiCau, k)])));
  });
  return traiCau(maDe).map((x, i) => ({
    thuTu: i + 1,
    thuTuGoc: thuTuGoc.get(x.id) ?? 0,
    cauHoiId: x.id,
    loaiCau: x.cau.loaiCau,
    dapAn: dapAnCua(x.cau),
    phuongAnGoc: x.cau.phuongAn.map((p) => nhanGoc.get(x.id)?.get(p.id) ?? ''),
  }));
}

/** Nguyên tắc hoán vị TỰ ĐỘNG của một đề — để modal hoán vị hiển thị read-only (docs/ui/2 §7.3) */
export function nguyenTacHoanVi(de: CauTrucDeHv): {
  boCuc: 'toan-de' | 'trong-phan' | 'lien-phan';
  soCauKhoaViTri: number;
  soCauChumKhongDaoCon: number;
  soHoanViKhaDi: number;
  moTa: string[];
} {
  const tatCa = de.dsPhan.flatMap((p) => p.dsCau);
  const boCuc = de.dsPhan.length <= 1 ? 'toan-de' : de.choPhepDaoLienPhan ? 'lien-phan' : 'trong-phan';
  const soCauKhoaViTri = tatCa.filter((c) => c.coDinhViTri).length;
  const soCauChumKhongDaoCon = tatCa.filter((c) => laCauChum(c.noiDung) && coKyHieuGanCauCon(c.noiDung)).length;
  const moTa = [
    boCuc === 'toan-de'
      ? 'Đề không phân phần — câu hỏi được đảo vị trí trong toàn đề'
      : boCuc === 'lien-phan'
        ? `Đề có ${de.dsPhan.length} phần — câu hỏi được đổi chỗ với câu cùng loại ở phần khác (mẫu đề cho phép đảo liên phần), thứ tự các phần giữ nguyên`
        : `Đề có ${de.dsPhan.length} phần — câu hỏi đảo vị trí trong phạm vi từng phần, thứ tự các phần giữ nguyên`,
    'Đảo lệnh hỏi/phương án theo quy tắc đảo khai báo ở từng câu; câu hỏi nhóm đi nguyên cụm; Đúng/Sai 4 ý giữ thứ tự ý; phương án ghim ("Tất cả các ý trên"…) giữ vị trí',
  ];
  if (soCauKhoaViTri) moTa.push(`${soCauKhoaViTri} câu khóa vị trí — giữ nguyên chỗ ở mọi mã đề`);
  if (soCauChumKhongDaoCon)
    moTa.push(`${soCauChumKhongDaoCon} câu hỏi nhóm có ký hiệu số câu (N**+k, ô trống) gắn với câu con — không đảo thứ tự câu con`);
  return { boCuc, soCauKhoaViTri, soCauChumKhongDaoCon, soHoanViKhaDi: soHoanViKhaDi(de), moTa };
}
