/**
 * Bộ máy bóc tách của oImportWord — DÙNG CHUNG cho dán (OEditor) và import tệp.
 *
 * 1. tachKhoi — chia tài liệu thành khối câu hỏi:
 *    - đầu câu "CH-<mã>" (VD "CH-TN1") = câu hỏi, "CHC-<mã>" (VD "CHC-TLN") = câu hỏi con;
 *    - hoặc "Câu N." (câu con "Câu N.k."); tiêu đề "PHẦN …" ghi lại làm gợi ý loại câu;
 *    - câu hỏi nhóm: "CH-NHOM", câu dẫn "##…##", "Ngữ liệu N.", lời dẫn "…trả lời câu N** – câu
 *      N***" / "…từ câu 1 đến câu 5", hoặc một đoạn văn mà NGAY DƯỚI là các câu "CHC-…";
 *    - dừng ở "HẾT" / "ĐÁP ÁN".
 * 2. bocTachKhoi — IMPORT: có mã → phân loại theo mã; không mã → tự nhận diện qua các định
 *    dạng đã đăng ký; không nhận diện được → câu LỖI "cần cập nhật bổ sung loại câu".
 *    DÁN: loại câu do người dùng chọn sẵn (mã đầu câu nếu có chỉ bị cắt bỏ).
 */
import { DAU_CHUA_NHAN_DIEN } from '../mathtype';
import { danhSachDinhDang, layDinhDang } from './dangKy';
import type {
  CauHoiBocTach,
  DinhDangCauHoi,
  KetQuaTaiLieu,
  KhoiCauHoi,
  MaLoaiCau,
  MaMauImport,
  NguCanhBocTach,
  PhanLoaiTienTo,
} from './kieu';
import { layMauImport } from './mauImport';
import { LOAI_CAU } from './kieu';
import { danhSachMaLoaiCau, loaiCauTuMa, MA_CAU_HOI_RE, taoMaCauHoi } from './maLoaiCau';
import { catTienToCau, demOTrong, LOI_DAN_NHOM_RE, phanTich } from './tienIch';

const CAU_RE = /^\s*Câu\s*(\d+)(?:\.(\d+))?\s*[.:)]/i;
const NGU_LIEU_RE = /^\s*(?:ngữ\s*liệu|bài\s*đọc|đoạn\s*văn)\s*\d*\s*[.:]/i;
const CAU_DAN_THANG_RE = /^\s*##/;
const PHAN_RE = /^\s*PHẦN\s+(?:[IVXLC]+|\d+)\b/i;
const KET_THUC_RE = /^[\s\-–—_*.]*(?:HẾT|(?:BẢNG\s+)?ĐÁP\s*ÁN(?:\s+(?:VÀ|CHI\s*TIẾT)[^]*)?)[\s\-–—_*.]*$/i;
/** "từ câu 1 đến câu 5" → [1, 5] */
const PHAM_VI_SO_RE = /câu(?:\s*hỏi)?\s*(?:từ\s*)?(?:câu\s*)?(\d+)\s*(?:đến|tới|-|–)\s*(?:câu\s*)?(\d+)/i;
/**
 * Lời dẫn nhóm tiếng Anh (đề TN THPT môn Tiếng Anh): "Read the following passage and mark … the questions from 18 to 22",
 * "Look at the sign … questions 1–2" — nhóm (1) = câu đầu, (2) = câu cuối.
 */
const LOI_DAN_NHOM_EN_RE =
  /^\s*(?:read|look\s+at|study|listen)\b[^]*?\b(?:questions?\s*(?:from\s*)?|from\s*)(\d+)\s*(?:to|-|–|and)\s*(\d+)/i;

/**
 * Tiền tố phân loại mẫu TN THPT "<Chủ đề>.<Tiểu mục>_<CĐTD>_<TPNL>_<Khả năng đảo>" + dấu cách, VD "1.1_2_3_1 ",
 * "[2.3_1_1+4_2] ", "1.1_2_3_1_. " — TPNL nhiều giá trị nối bằng "+".
 */
const TIEN_TO_TN_THPT_RE =
  /^\s*\[?\s*(\d{1,3})\s*\.\s*(\d{1,3})\s*_\s*(\d{1,2})\s*_\s*(\d{1,3}(?:\s*\+\s*\d{1,3})*)\s*_\s*(\d{1,2})(?!\d)\s*_?\s*\]?\s*\.?(?=\s|$)\s*/;

/** Đọc tiền tố TN THPT ở đầu văn bản; trả phân loại + độ dài phần tiền tố (tính trên chuỗi truyền vào) */
export function docTienToTnThpt(chu: string): { phanLoai: PhanLoaiTienTo; doDai: number } | null {
  const k = TIEN_TO_TN_THPT_RE.exec(chu);
  if (!k) return null;
  const tpnl = k[4].split('+').map((s) => Number(s.trim()));
  const maGoc = `${k[1]}.${k[2]}_${k[3]}_${tpnl.join('+')}_${k[5]}`;
  return {
    phanLoai: { maGoc, chuDe: Number(k[1]), tieuMuc: Number(k[2]), capDoTuDuy: Number(k[3]), tpnl, khaNangDao: Number(k[5]) },
    doDai: k[0].length,
  };
}

/** Mẫu TN THPT: mã loại câu theo tiêu đề phần (cụm từ trước, số La Mã sau) */
export function maLoaiTheoPhan(phan?: string): string | undefined {
  if (!phan) return undefined;
  if (/đúng\s*[-–/]?\s*sai/i.test(phan)) return 'DS';
  if (/trả\s*lời\s*ngắn/i.test(phan)) return 'TLN';
  if (/tự\s*luận/i.test(phan)) return 'TL';
  if (/nhiều\s*phương\s*án|lựa\s*chọn/i.test(phan)) return 'TN1';
  const so = /^\s*PHẦN\s+([IVX]+|\d+)\b/i.exec(phan)?.[1]?.toUpperCase();
  return ({ I: 'TN1', '1': 'TN1', II: 'DS', '2': 'DS', III: 'TLN', '3': 'TLN', IV: 'TL', '4': 'TL' } as Record<string, string>)[so ?? ''];
}

/** Dòng chỉ gồm phương án cho một ô trống: "(1) A. … B. …", "1. A. …" hoặc bắt đầu ngay bằng "A." */
const DONG_PHUONG_AN_O_TRONG_RE = /^\s*(?:\(\s*\d+\s*\)|\d+\s*[.:)]|Câu\s*\d+\s*[.:)])?\s*A\s*[.)]\s*\S/i;

const vanBan = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

interface KhoiDangGom {
  cacPhan: string[];
  vanBan: string[];
  nhan?: string;
  phan?: string;
  maLoai?: string;
  laCauCon?: boolean;
  phanLoai?: PhanLoaiTienTo;
  maLoaiTheoPhan?: string;
  coSoCau?: boolean;
}
interface NhomDangGom extends KhoiDangGom {
  cauCon: KhoiCauHoi[];
  /** Phạm vi số câu con theo lời dẫn "từ câu 1 đến câu 5" */
  phamVi?: [number, number];
  /** Số câu con dự kiến (từ "N**+k" lớn nhất trong câu dẫn, hoặc số ô trống trong đoạn văn) */
  soConDuKien?: number;
}

const thanhKhoi = (k: KhoiDangGom, cauCon?: KhoiCauHoi[]): KhoiCauHoi => ({
  html: k.cacPhan.join(''),
  vanBan: k.vanBan.join(' '),
  nhan: k.nhan,
  phan: k.phan,
  ...(k.maLoai ? { maLoai: k.maLoai } : {}),
  ...(k.laCauCon ? { laCauCon: true } : {}),
  ...(k.phanLoai ? { phanLoai: k.phanLoai } : {}),
  ...(k.maLoaiTheoPhan ? { maLoaiTheoPhan: k.maLoaiTheoPhan } : {}),
  ...(k.coSoCau ? { coSoCau: true } : {}),
  ...(cauCon ? { cauCon } : {}),
});

/** Số câu con dự kiến từ câu dẫn: "N**+1 – N**+2" → 2 */
const soConTuKyHieu = (vb: string): number | undefined => {
  const cacK = Array.from(vb.matchAll(/N\*\*\s*\+\s*(\d+)/g), (k) => Number(k[1]));
  return cacK.length ? Math.max(...cacK) : undefined;
};

/**
 * Bỏ mã "CH-…"/"CHC-…" (dài `doDai` ký tự chữ) ở đầu đoạn — mã có thể trải qua nhiều nút chữ
 * (VD "<b>CHC-TN1</b> <b>A.</b> …"); đoạn chỉ còn thẻ rỗng thì trả ''.
 */
function boMaDau(el: Element, doDai: number): string {
  return catDau(el, doDai)?.outerHTML ?? '';
}

/** Bản sao đoạn đã cắt `doDai` ký tự chữ đầu tiên; null khi không còn nội dung */
function catDau(el: Element, doDai: number): Element | null {
  const ban = el.cloneNode(true) as Element;
  const duyet = ban.ownerDocument.createTreeWalker(ban, NodeFilter.SHOW_TEXT);
  let conLai = doDai;
  for (let n = duyet.nextNode() as Text | null; n && conLai > 0; n = duyet.nextNode() as Text | null) {
    const bo = Math.min(conLai, n.data.length);
    n.data = n.data.slice(bo);
    conLai -= bo;
  }
  const coNoiDung = (ban.textContent ?? '').trim() || ban.querySelector('img,[data-cong-thuc],table,video,audio,iframe');
  return coNoiDung ? ban : null;
}

/** Độ dài phần mã tính trên textContent gốc (có thể có khoảng trắng đầu dòng) */
const doDaiMa = (el: Element): number => {
  const chu = el.textContent ?? '';
  const khop = MA_CAU_HOI_RE.exec(chu);
  return khop ? khop[0].length : 0;
};

/**
 * Chia HTML thành các khối câu hỏi; `phanDau` = nội dung trước câu đầu tiên.
 * `mau` = 'tn-thpt': đoạn mở đầu bằng tiền tố phân loại cũng mở câu mới (tiền tố cắt khỏi nội dung, ghi vào
 * `phanLoai`), loại câu gợi ý theo tiêu đề PHẦN (`maLoaiTheoPhan`). Các mẫu khác chia khối như nhau — việc soát
 * câu có đúng mẫu hay không làm ở bocTachTaiLieu.
 */
export function tachKhoi(html: string, mau?: MaMauImport): { khoi: KhoiCauHoi[]; phanDau: string } {
  const { goc } = phanTich(html);
  const khoi: KhoiCauHoi[] = [];
  const phanDau: string[] = [];
  let phanHienTai: string | undefined;
  let cau: KhoiDangGom | null = null;
  let nhom: NhomDangGom | null = null;

  const dongCau = () => {
    if (!cau) return;
    if (nhom && cau.laCauCon) nhom.cauCon.push(thanhKhoi(cau));
    else khoi.push(thanhKhoi(cau));
    cau = null;
  };
  const dongNhom = () => {
    dongCau();
    if (nhom) khoi.push(thanhKhoi(nhom, nhom.cauCon));
    nhom = null;
  };
  const moNhom = (html: string, vb: string, thuocTinh: Partial<NhomDangGom> = {}) => {
    dongNhom();
    nhom = {
      cacPhan: html ? [html] : [],
      vanBan: [vb],
      cauCon: [],
      phan: phanHienTai,
      nhan: vb.slice(0, 30),
      soConDuKien: soConTuKyHieu(vb),
      ...thuocTinh,
    };
  };
  /** Nhóm vừa mở, chưa có câu con, chưa có câu đang gom → đoạn tiếp theo vẫn là phần dẫn của nhóm */
  const nhomDangChoCon = () => {
    const n = nhom as NhomDangGom | null;
    return !!n && !n.cauCon.length && !cau;
  };
  const themVaoNhom = (el: Element, vb: string) => {
    const n = nhom as NhomDangGom;
    n.cacPhan.push(el.outerHTML);
    n.vanBan.push(vb);
    n.soConDuKien ??= soConTuKyHieu(vb);
  };

  const laTnThpt = mau === 'tn-thpt';
  /** Tiền tố TN THPT đứng một mình trên một dòng → áp cho đoạn kế tiếp */
  let tienToCho: PhanLoaiTienTo | undefined;

  for (const elGoc of Array.from(goc.children)) {
    let el: Element = elGoc;
    let vb = vanBan(el);
    if (KET_THUC_RE.test(vb) && vb.length < 60) break;
    if (PHAN_RE.test(vb) && vb.length < 400) {
      dongNhom();
      phanHienTai = vb.slice(0, 200);
      continue;
    }

    // ---- mẫu TN THPT: tiền tố phân loại "1.1_2_3_1" mở câu mới ----
    let phanLoai: PhanLoaiTienTo | undefined;
    if (laTnThpt) {
      const tienTo = docTienToTnThpt(el.textContent ?? '');
      if (tienTo) {
        const conLai = catDau(el, tienTo.doDai);
        if (!conLai) {
          tienToCho = tienTo.phanLoai;
          continue;
        }
        el = conLai;
        vb = vanBan(el);
        phanLoai = tienTo.phanLoai;
      } else if (tienToCho) {
        phanLoai = tienToCho;
      }
      tienToCho = undefined;
    }

    // ---- mã câu hỏi "CH-…" / "CHC-…" ----
    const khopMa = MA_CAU_HOI_RE.exec(vb);
    if (khopMa) {
      const [, tienTo, maLoai] = khopMa;
      const ma = maLoai.toUpperCase();
      const htmlBoMa = boMaDau(el, doDaiMa(el));
      const vbBoMa = vb.slice(khopMa[0].length);
      const cacPhanDau = htmlBoMa ? [htmlBoMa] : [];
      if (tienTo.toUpperCase() === 'CHC') {
        if (!nhom) {
          const cauTruoc = cau as KhoiDangGom | null;
          if (cauTruoc && !cauTruoc.laCauCon) {
            // câu ngay trên hóa ra là phần dẫn/đoạn văn của nhóm
            cau = null;
            nhom = { ...cauTruoc, cauCon: [], soConDuKien: soConTuKyHieu(cauTruoc.vanBan.join(' ')) };
          } else {
            dongCau();
            nhom = { cacPhan: [], vanBan: [], cauCon: [], phan: phanHienTai };
          }
        } else {
          dongCau();
        }
        cau = { cacPhan: cacPhanDau, vanBan: [vbBoMa], maLoai: ma, laCauCon: true, phan: phanHienTai, nhan: `CHC-${ma}` };
      } else if (loaiCauTuMa(ma) === LOAI_CAU.CauChum) {
        moNhom(htmlBoMa, vbBoMa, { maLoai: ma, nhan: `CH-${ma}` });
      } else {
        dongNhom();
        cau = { cacPhan: cacPhanDau, vanBan: [vbBoMa], maLoai: ma, phan: phanHienTai, nhan: `CH-${ma}` };
      }
      continue;
    }

    // ---- câu dẫn / ngữ liệu mở nhóm ----
    const loiDanEn = phanLoai ? null : LOI_DAN_NHOM_EN_RE.exec(vb);
    const laCauDan =
      !phanLoai && (CAU_DAN_THANG_RE.test(vb) || NGU_LIEU_RE.test(vb) || LOI_DAN_NHOM_RE.test(vb) || !!loiDanEn);
    if (laCauDan) {
      const phamViSo = PHAM_VI_SO_RE.exec(vb) ?? loiDanEn;
      const phamVi: [number, number] | undefined = phamViSo
        ? [Number(phamViSo[1]), Number(phamViSo[2])]
        : undefined;
      if (nhomDangChoCon()) {
        themVaoNhom(el, vb);
        const n = nhom as NhomDangGom | null;
        if (n && phamVi) n.phamVi ??= phamVi;
      } else {
        moNhom(el.outerHTML, vb, { phamVi });
      }
      continue;
    }

    // ---- "Câu N." / "Câu N.k." (mẫu TN THPT: cả đoạn mở bằng tiền tố phân loại) ----
    const khopCau = CAU_RE.exec(vb);
    if (khopCau || phanLoai) {
      const laCauConSo = khopCau?.[2] !== undefined;
      const soCau = khopCau ? Number(khopCau[1]) : undefined;
      const n = nhom as NhomDangGom | null;
      let vaoNhom = false;
      if (n) {
        n.soConDuKien ??= demOTrong(n.cacPhan.join('')) || undefined;
        const soConHienCo = n.cauCon.length + ((cau as KhoiDangGom | null)?.laCauCon ? 1 : 0);
        vaoNhom =
          laCauConSo ||
          (!!n.phamVi && soCau !== undefined && soCau >= n.phamVi[0] && soCau <= n.phamVi[1]) ||
          (!!n.soConDuKien && soConHienCo < n.soConDuKien);
      }
      if (vaoNhom) dongCau();
      else dongNhom();
      cau = {
        cacPhan: [el.outerHTML],
        vanBan: [vb],
        nhan: khopCau ? `Câu ${khopCau[1]}${laCauConSo ? `.${khopCau[2]}` : ''}` : phanLoai?.maGoc,
        phan: phanHienTai,
        laCauCon: vaoNhom,
        ...(phanLoai ? { phanLoai } : {}),
        ...(khopCau ? { coSoCau: true } : {}),
        ...(laTnThpt ? { maLoaiTheoPhan: maLoaiTheoPhan(phanHienTai) } : {}),
      };
      continue;
    }

    // ---- đục lỗ: dòng phương án "(1) A. … B. …" dưới đoạn văn CH-DK / câu dẫn nhóm = câu hỏi con ----
    const c0 = cau as KhoiDangGom | null;
    const n0 = nhom as NhomDangGom | null;
    const trongDucLo =
      (c0 && !c0.laCauCon && c0.maLoai && loaiCauTuMa(c0.maLoai) === LOAI_CAU.DienKhuyet) ||
      (n0 &&
        demOTrong(n0.cacPhan.join('')) > 0 &&
        // câu con đang gom chưa có dòng phương án → dòng này là phương án CỦA nó, không phải câu con mới
        (!c0 || (c0.laCauCon && c0.vanBan.some((v) => /(?:^|\s)A\s*[.)]\s*\S/.test(v)))));
    if (trongDucLo && DONG_PHUONG_AN_O_TRONG_RE.test(vb)) {
      if (c0 && !c0.laCauCon) {
        cau = null;
        nhom = { ...c0, cauCon: [] };
      } else {
        dongCau();
      }
      const soO = /^\s*(?:\(\s*\d+\s*\)|\d+\s*[.:)]|Câu\s*\d+\s*[.:)])\s*/i.exec(el.textContent ?? '');
      cau = {
        cacPhan: [soO ? boMaDau(el, soO[0].length) : el.outerHTML],
        vanBan: [soO ? vb.slice(soO[0].trim().length).trim() : vb],
        maLoai: 'TN1',
        laCauCon: true,
        phan: phanHienTai,
      };
      continue;
    }

    // ---- đoạn tiếp theo của câu / phần dẫn nhóm / phần mở đầu ----
    if (cau) {
      const c = cau as KhoiDangGom;
      c.cacPhan.push(el.outerHTML);
      c.vanBan.push(vb);
    } else if (nhom) {
      themVaoNhom(el, vb);
    } else {
      phanDau.push(el.outerHTML);
    }
  }
  dongNhom();
  return { khoi, phanDau: phanDau.join('') };
}

const diemAnToan = (dd: DinhDangCauHoi, khoi: KhoiCauHoi, nguCanh: NguCanhBocTach): number => {
  try {
    const d = dd.nhanDien(khoi, nguCanh);
    return Number.isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
};

/** Chạy các định dạng theo thứ tự điểm nhận diện; trả về kết quả đầu tiên khác null */
function thuCacDinhDang(
  dsDinhDang: DinhDangCauHoi[],
  khoi: KhoiCauHoi,
  nguCanh: NguCanhBocTach,
): CauHoiBocTach | null {
  const ungVien = dsDinhDang
    .map((dd) => ({ dd, diem: diemAnToan(dd, khoi, nguCanh) }))
    .filter((u) => u.diem > 0)
    .sort((a, b) => b.diem - a.diem || (b.dd.uuTien ?? 0) - (a.dd.uuTien ?? 0));
  for (const { dd } of ungVien) {
    try {
      const kq = dd.bocTach(khoi, nguCanh);
      if (kq) return { ...kq, nhan: kq.nhan ?? khoi.nhan, phan: kq.phan ?? khoi.phan };
    } catch {
      // định dạng lỗi → thử định dạng kế tiếp
    }
  }
  return null;
}

const taoNguCanh = (nguon: 'dan' | 'tep', loaiCauYeuCau?: MaLoaiCau): NguCanhBocTach => {
  const nguCanh: NguCanhBocTach = {
    nguon,
    loaiCauYeuCau,
    bocTachKhoi: (khoi) => bocTachKhoiImport(khoi, nguon),
  };
  return nguCanh;
};

const tenLoai = (loaiCau: MaLoaiCau) =>
  danhSachMaLoaiCau().find((m) => m.loaiCau === loaiCau)?.ten ?? loaiCau;

/** Gắn mã câu hỏi hiển thị: giữ mã trong tài liệu, không có thì sinh theo loại câu */
const ganMaCauHoi = (kq: CauHoiBocTach, khoi: KhoiCauHoi): CauHoiBocTach => ({
  ...kq,
  nhan: kq.nhan ?? khoi.nhan,
  phan: kq.phan ?? khoi.phan,
  ...(khoi.phanLoai && !kq.phanLoai ? { phanLoai: khoi.phanLoai } : {}),
  maCauHoi:
    khoi.maLoai && loaiCauTuMa(khoi.maLoai) === kq.loaiCau
      ? `${khoi.laCauCon ? 'CHC' : 'CH'}-${khoi.maLoai.toUpperCase()}`
      : kq.loaiCau
        ? taoMaCauHoi(kq.loaiCau, !!khoi.laCauCon)
        : undefined,
});

/**
 * IMPORT: bóc tách một khối. Có mã → theo mã; không mã → tự nhận diện; không được → câu
 * LỖI yêu cầu cập nhật bổ sung loại câu (loaiCau = '').
 */
function bocTachKhoiImport(khoi: KhoiCauHoi, nguon: 'dan' | 'tep'): CauHoiBocTach {
  const noiDungTho = catTienToCau(khoi.html);
  const chuaPhanLoai = (lyDo: string): CauHoiBocTach =>
    ganMaCauHoi(
      { maDinhDang: 'chua-phan-loai', loaiCau: '', noiDung: noiDungTho, phuongAn: [], trangThai: 'loi', lyDo: [lyDo] },
      khoi,
    );

  let loaiTheoMa: MaLoaiCau | undefined;
  // Mã ghi trong tài liệu ưu tiên; mẫu TN THPT không có mã → loại theo tiêu đề PHẦN
  const theoPhan = !khoi.maLoai && !!khoi.maLoaiTheoPhan;
  if (khoi.maLoai && !khoi.cauCon?.length) {
    loaiTheoMa = loaiCauTuMa(khoi.maLoai);
    if (!loaiTheoMa) {
      return chuaPhanLoai(
        `Mã loại câu "${khoi.laCauCon ? 'CHC' : 'CH'}-${khoi.maLoai}" chưa có trong danh mục — cần cập nhật bổ sung loại câu`,
      );
    }
  } else if (theoPhan && !khoi.cauCon?.length) {
    loaiTheoMa = loaiCauTuMa(khoi.maLoaiTheoPhan!);
  }

  const dsDinhDang = loaiTheoMa ? danhSachDinhDang(loaiTheoMa) : danhSachDinhDang();
  const kq = thuCacDinhDang(dsDinhDang, khoi, taoNguCanh(nguon, loaiTheoMa));
  if (kq) return ganMaCauHoi(kq, khoi);

  if (loaiTheoMa) {
    // mã xác định được loại nhưng nội dung chưa theo quy ước của loại đó (hoặc loại chưa có định dạng)
    return ganMaCauHoi(
      {
        maDinhDang: 'theo-ma',
        loaiCau: loaiTheoMa,
        noiDung: noiDungTho,
        phuongAn: [],
        trangThai: 'canh-bao',
        lyDo: [
          `Đã xác định loại "${tenLoai(loaiTheoMa)}" theo ${theoPhan ? 'tiêu đề phần' : 'mã'} nhưng chưa tách được phương án/đáp án theo quy ước — cần cập nhật bổ sung`,
        ],
      },
      khoi,
    );
  }
  return chuaPhanLoai('Chưa phân biệt được loại câu hỏi — cần cập nhật bổ sung loại câu (hoặc ghi mã "CH-…" ở đầu câu trong tệp Word)');
}

/** Câu có công thức MathType giải mã chưa trọn (ô "?") → cảnh báo để người nhập kiểm tra */
function danhDauCongThucChuaTron(cau: CauHoiBocTach): CauHoiBocTach {
  const cacPhan = [cau.noiDung, cau.loiGiai ?? '', ...cau.phuongAn.map((p) => p.noiDung)];
  if (!cacPhan.some((h) => h.includes(DAU_CHUA_NHAN_DIEN))) return cau;
  return {
    ...cau,
    trangThai: cau.trangThai === 'ok' ? 'canh-bao' : cau.trangThai,
    lyDo: [...cau.lyDo, 'Có công thức chứa ký hiệu chưa nhận diện được (ô "?") — kiểm tra và sửa lại công thức'],
  };
}

const TIEN_TO_TN_THPT_MAU = '"<Chủ đề>.<Tiểu mục>_<CĐTD>_<TPNL>_<Khả năng đảo>" (VD "1.1_2_3_1")';

/** Giá trị trong tiền tố TN THPT nằm ngoài miền cho phép */
function loiPhanLoai(p: PhanLoaiTienTo, nhan: string): string[] {
  const loi: string[] = [];
  if (p.chuDe < 1 || p.tieuMuc < 1 || p.tpnl.some((t) => t < 1)) loi.push(`${nhan}: số thứ tự chủ đề/tiểu mục/năng lực phải từ 1`);
  if (p.capDoTuDuy < 1 || p.capDoTuDuy > 3) loi.push(`${nhan}: cấp độ tư duy "${p.capDoTuDuy}" không hợp lệ (1 = Nhận biết, 2 = Thông hiểu, 3 = Vận dụng)`);
  if (p.khaNangDao < 1 || p.khaNangDao > 4) loi.push(`${nhan}: khả năng đảo "${p.khaNangDao}" không hợp lệ (1–4)`);
  return loi;
}

/**
 * Soát một câu theo MẪU đã chọn (mauImport.ts): câu ngoài danh sách hỗ trợ, thiếu mã/tiền tố của mẫu → lỗi
 * (người soát sửa ở bước soát hoặc sửa tệp). Không đổi nội dung đã bóc tách.
 */
function soatTheoMau(cau: CauHoiBocTach, khoi: KhoiCauHoi, mau: MaMauImport): CauHoiBocTach {
  const moTa = layMauImport(mau);
  const hoTro = new Set<string>(moTa.loaiCauHoTro);
  const laNhom = !!khoi.cauCon?.length;
  const dsCon = khoi.cauCon ?? [];
  const loi: string[] = [];
  const loaiNgoaiMau = (loai: string, nhan: string) => {
    if (loai && !hoTro.has(loai)) loi.push(`${nhan}"${tenLoai(loai)}" không thuộc ${moTa.ten}`);
  };

  if (mau === 'khao-thi-so') {
    if (!laNhom && !khoi.maLoai) loi.push('Thiếu mã loại câu "CH-…" ở đầu câu (VD "CH-TN1") — mẫu Khảo thí số bắt buộc ghi mã');
    dsCon.forEach((c, i) => {
      if (!c.maLoai) loi.push(`Câu hỏi con thứ ${i + 1} thiếu mã "CHC-…" ở đầu câu`);
    });
  } else if (mau === 'tn-thpt') {
    if (khoi.maLoai || dsCon.some((c) => c.maLoai && c.nhan?.startsWith('CHC'))) {
      loi.push('Mẫu TN THPT không dùng mã "CH-…"/"CHC-…" — bỏ mã hoặc chọn định dạng Khảo thí số');
    } else if (!laNhom) {
      if (!khoi.phanLoai) loi.push(`Thiếu tiền tố phân loại ${TIEN_TO_TN_THPT_MAU} ở đầu câu`);
    } else {
      dsCon.forEach((c, i) => {
        if (!c.phanLoai) loi.push(`Câu hỏi con thứ ${i + 1} thiếu tiền tố phân loại ${TIEN_TO_TN_THPT_MAU}`);
      });
    }
    if (khoi.phanLoai) loi.push(...loiPhanLoai(khoi.phanLoai, 'Tiền tố'));
    dsCon.forEach((c, i) => c.phanLoai && loi.push(...loiPhanLoai(c.phanLoai, `Câu hỏi con thứ ${i + 1}`)));
    loaiNgoaiMau(cau.loaiCau, 'Loại câu ');
    (cau.cauCon ?? []).forEach((c, i) => loaiNgoaiMau(c.loaiCau, `Câu hỏi con thứ ${i + 1}: loại `));
  } else {
    if (khoi.maLoai) loi.push('Mẫu mặc định không dùng mã "CH-…" — chọn định dạng Khảo thí số');
    if (laNhom || cau.loaiCau === LOAI_CAU.CauChum) {
      loi.push('Câu hỏi nhóm / ngữ liệu dùng chung không thuộc mẫu mặc định — chọn định dạng Khảo thí số hoặc TN THPT');
    } else {
      if (!khoi.maLoai && !khoi.coSoCau) loi.push('Thiếu "Câu N." ở đầu câu');
      loaiNgoaiMau(cau.loaiCau, 'Loại câu ');
    }
  }
  if (!loi.length) return cau;
  return { ...cau, trangThai: 'loi', lyDo: [...loi, ...cau.lyDo] };
}

/**
 * IMPORT: bóc tách cả tài liệu (HTML đã chuẩn hóa từ .docx) thành danh sách câu hỏi.
 * `mau` — định dạng tệp người dùng chọn (mauImport.ts): quyết định cách chia khối và soát câu theo mẫu;
 * bỏ trống = không soát theo mẫu (tương thích chỗ gọi cũ).
 */
export function bocTachTaiLieu(html: string, mau?: MaMauImport): KetQuaTaiLieu {
  const { khoi, phanDau } = tachKhoi(html, mau);
  const ghiChu: string[] = [];
  if (!khoi.length) {
    ghiChu.push(
      mau
        ? `Không tìm thấy câu hỏi nào theo ${layMauImport(mau).ten} — đầu mỗi câu cần ${layMauImport(mau).tienTo}`
        : 'Không tìm thấy câu hỏi nào — mỗi câu cần bắt đầu bằng mã "CH-…" (VD "CH-TN1") hoặc "Câu N."',
    );
  } else if (phanTich(phanDau).goc.textContent?.trim()) {
    ghiChu.push('Phần mở đầu trước câu hỏi đầu tiên (tiêu đề, thông tin đề…) đã được bỏ qua');
  }
  const cauHoi = khoi.map((k) => {
    const cau = danhDauCongThucChuaTron(bocTachKhoiImport(k, 'tep'));
    return mau ? soatTheoMau(cau, k, mau) : cau;
  });
  const soChuaPhanLoai = cauHoi.filter((c) => !c.loaiCau).length;
  if (soChuaPhanLoai) {
    ghiChu.push(`${soChuaPhanLoai} câu chưa phân biệt được loại — cần cập nhật bổ sung loại câu trước khi lưu`);
  }
  return { cauHoi, ghiChu };
}

/**
 * DÁN: bóc tách MỘT câu hỏi dán vào màn soạn theo loại câu NGƯỜI DÙNG ĐÃ CHỌN
 * (mã "CH-…" đầu câu nếu có chỉ bị cắt bỏ, không dùng để đổi loại).
 * @returns null khi không có gì để tách (dán nguyên văn) hoặc nội dung dán có nhiều câu
 */
export function bocTachCauHoi(
  html: string,
  tuyChon: { loaiCau?: MaLoaiCau; maDinhDang?: string } = {},
): CauHoiBocTach | null {
  const { khoi, phanDau } = tachKhoi(html);
  let muc: KhoiCauHoi;
  if (tuyChon.loaiCau === LOAI_CAU.CauChum) {
    // câu chùm dán vào: phần trước câu con đầu tiên là câu dẫn/ngữ liệu, các câu là câu con
    const nhomCoSan = khoi.length === 1 && khoi[0].cauCon ? khoi[0] : null;
    if (nhomCoSan) muc = nhomCoSan;
    else if (khoi.length) {
      muc = {
        html: phanDau,
        vanBan: phanTich(phanDau).goc.textContent ?? '',
        cauCon: khoi.map((k) => ({ ...k, laCauCon: true })),
      };
    } else return null;
  } else if (khoi.length === 1 && !khoi[0].cauCon) {
    muc = { ...khoi[0], maLoai: undefined };
  } else if (!khoi.length) {
    muc = { html, vanBan: phanTich(html).goc.textContent ?? '' };
  } else {
    return null;
  }

  const dinhDangChon = tuyChon.maDinhDang ? layDinhDang(tuyChon.maDinhDang) : undefined;
  const dsDinhDang = dinhDangChon ? [dinhDangChon] : danhSachDinhDang(tuyChon.loaiCau);
  const kq = thuCacDinhDang(dsDinhDang, muc, taoNguCanh('dan', tuyChon.loaiCau));
  return kq ? ganMaCauHoi(kq, muc) : null;
}
