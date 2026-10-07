/**
 * DỮ LIỆU GIẢ LẬP để người quản lý hình dung tệp Word/PDF xuất ra theo mẫu đề: sinh một đề mẫu ĐÚNG cấu hình
 * đang khai báo trên form (các phần, loại câu từng phần, số câu, điểm mỗi câu / tỷ lệ điểm) + giá trị ví dụ
 * cho mọi trường nội tuyến. Nội dung câu hỏi là câu minh họa (không lấy từ ngân hàng) — độ dài phương án được
 * xoay vòng ngắn/vừa/dài để thấy cách hệ thống tự xếp 4 cột / 2 cột / 1 cột.
 */
import { khoiBangDapAn, khoiNoiDungDe, type CauDe, type DapAnCau, type DeChuan, type PhanDe } from '../xuat-tep/coBan';
import { DANH_MUC_TRUONG_TRON } from './truongTron';
import type { DuLieuTron } from './tronMauWord';

export interface PhanGiaLap {
  ma?: string;
  ten?: string;
  huongDan?: string;
  /** Mã loại câu (trac-nghiem-1, dung-sai-4-y, tu-luan…) */
  loaiCau: string[];
  soCau?: number | null;
  diemMoiCau?: number | null;
  tyLeDiem?: number | null;
}

/** Cấu hình mẫu đề đang khai báo trên form */
export interface CauHinhGiaLap {
  tenMau?: string;
  mucDich?: string;
  /** Tên môn đầu tiên trong phạm vi (trống = mọi môn → dùng môn ví dụ) */
  monHoc?: string;
  khoi?: string;
  coPhanPhan: boolean;
  cacPhan: PhanGiaLap[];
  /** Nhãn loại câu theo mã */
  nhanLoaiCau?: Record<string, string>;
}

export interface TuyChonGiaLap {
  kemDapAn: boolean;
  /** Đề hoán vị (có mã đề) hay đề gốc */
  coMaDe: boolean;
  tongDiem: number;
}

export const TUY_CHON_GIA_LAP_MAC_DINH: TuyChonGiaLap = { kemDapAn: true, coMaDe: true, tongDiem: 10 };

/** Giới hạn số câu sinh ra để xem trước nhanh */
const TOI_DA_CAU = 60;
const SO_CAU_MAC_DINH_MOI_LOAI = 2;

const soVn = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const lamTron025 = (n: number) => Math.round(n * 4) / 4;

const ngayHienTai = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/** Giá trị mặc định các trường nội tuyến (ví dụ trong danh mục + thông tin mẫu đang khai báo) */
export function giaTriGiaLapMacDinh(cauHinh: CauHinhGiaLap): Record<string, string> {
  const gt: Record<string, string> = {};
  for (const t of DANH_MUC_TRUONG_TRON) if (t.kieu === 'noi-tuyen') gt[t.ma] = t.viDu;
  if (cauHinh.monHoc) gt.MON_HOC = cauHinh.monHoc;
  if (cauHinh.khoi) gt.KHOI = cauHinh.khoi;
  if (cauHinh.tenMau?.trim()) gt.TEN_MAU_DE = cauHinh.tenMau.trim();
  if (cauHinh.mucDich) gt.MUC_DICH = cauHinh.mucDich;
  gt.TEN_DE = `Đề ${gt.TEN_KY.toLowerCase()} ${gt.MON_HOC} ${gt.KHOI.replace(/^Khối\s*/i, '')} — số 1`;
  gt.NGAY_XUAT = ngayHienTai();
  // Để trống = tự tính theo đề sinh ra
  gt.SO_CAU = '';
  gt.TONG_DIEM = '';
  return gt;
}

// ————— Câu hỏi minh họa theo loại câu —————

const BO_PHUONG_AN = [
  ['12', '15', '18', '21'],
  ['Tăng dần theo thời gian', 'Giảm dần rồi ổn định', 'Không thay đổi', 'Thay đổi liên tục'],
  [
    'Phương án thứ nhất trình bày một nhận định đầy đủ, có độ dài tương đương một câu văn hoàn chỉnh',
    'Phương án thứ hai là nhận định gần đúng nhưng thiếu một điều kiện quan trọng của vấn đề',
    'Phương án thứ ba đưa ra kết luận ngược với dữ kiện đã cho trong phần dẫn của câu hỏi',
    'Phương án thứ tư chỉ đúng trong một trường hợp riêng, không đúng trong trường hợp tổng quát',
  ],
];
const CHU_CAI = ['A', 'B', 'C', 'D'];

interface CauSinh {
  cau: CauDe;
  dapAn: Omit<DapAnCau, 'cau' | 'diem'>;
}

function sinhCau(loai: string, so: number, mon: string, nhanLoai: string): CauSinh {
  const dan = `<p>[${nhanLoai}] Nội dung câu hỏi minh họa của môn ${mon}: chữ, công thức, hình ảnh sẽ hiển thị như khi soạn câu.</p>`;
  const chon = so % 4;
  switch (loai) {
    case 'trac-nghiem-1': {
      const bo = BO_PHUONG_AN[so % BO_PHUONG_AN.length];
      return {
        cau: { so, noiDungHtml: dan, phuongAn: bo.map((html, i) => ({ nhan: CHU_CAI[i], html })), loaiCau: nhanLoai },
        dapAn: { dapAn: CHU_CAI[chon], loaiCau: nhanLoai },
      };
    }
    case 'trac-nghiem-nhieu': {
      const bo = BO_PHUONG_AN[(so + 1) % BO_PHUONG_AN.length];
      return {
        cau: { so, noiDungHtml: `${dan}<p><i>(Chọn tất cả các phương án đúng)</i></p>`, phuongAn: bo.map((html, i) => ({ nhan: CHU_CAI[i], html })), loaiCau: nhanLoai },
        dapAn: { dapAn: `${CHU_CAI[chon]}, ${CHU_CAI[(chon + 2) % 4]}`, loaiCau: nhanLoai },
      };
    }
    case 'dung-sai':
      return {
        cau: { so, noiDungHtml: `${dan}<p>Nhận định trên đúng hay sai?</p>`, phuongAn: [{ nhan: 'A', html: 'Đúng' }, { nhan: 'B', html: 'Sai' }], loaiCau: nhanLoai },
        dapAn: { dapAn: so % 2 ? 'A' : 'B', loaiCau: nhanLoai },
      };
    case 'dung-sai-4-y':
      return {
        cau: {
          so,
          noiDungHtml: `${dan}<p>Trong mỗi ý a), b), c), d) sau, thí sinh chọn đúng hoặc sai.</p>`,
          phuongAn: ['a', 'b', 'c', 'd'].map((nhan, i) => ({ nhan, html: `Nhận định thứ ${i + 1} liên quan đến dữ kiện của câu hỏi.` })),
          laYDungSai: true,
          loaiCau: nhanLoai,
        },
        dapAn: { dapAn: 'a) Đ   b) S   c) Đ   d) S', loaiCau: nhanLoai },
      };
    case 'ghep-doi':
    case 'noi-day':
      return {
        cau: {
          so,
          noiDungHtml: `${dan}<p>Ghép mỗi mục ở cột A với một mục phù hợp ở cột B.</p><table><tr><th>Cột A</th><th>Cột B</th></tr><tr><td>1. Khái niệm thứ nhất</td><td>a. Mô tả tương ứng thứ nhất</td></tr><tr><td>2. Khái niệm thứ hai</td><td>b. Mô tả tương ứng thứ hai</td></tr><tr><td>3. Khái niệm thứ ba</td><td>c. Mô tả tương ứng thứ ba</td></tr></table>`,
          loaiCau: nhanLoai,
        },
        dapAn: { dapAn: '1 – b, 2 – c, 3 – a', loaiCau: nhanLoai },
      };
    case 'sap-xep':
    case 'keo-tha':
      return {
        cau: { so, noiDungHtml: `${dan}<p>Sắp xếp các bước sau theo đúng thứ tự: (1) Bước thu thập; (2) Bước phân tích; (3) Bước kết luận; (4) Bước kiểm tra.</p>`, soDongTraLoi: 1, loaiCau: nhanLoai },
        dapAn: { dapAn: '1 – 2 – 4 – 3', loaiCau: nhanLoai },
      };
    case 'dien-khuyet':
      return {
        cau: { so, noiDungHtml: `<p>[${nhanLoai}] Điền vào chỗ trống: Nội dung minh họa của môn ${mon} gồm (1) ………… và (2) ………… ở vị trí phù hợp.</p>`, loaiCau: nhanLoai },
        dapAn: { dapAn: '(1) từ khóa thứ nhất; (2) từ khóa thứ hai', loaiCau: nhanLoai },
      };
    case 'tra-loi-ngan':
      return {
        cau: { so, noiDungHtml: `${dan}<p>Viết đáp số/câu trả lời ngắn vào chỗ trống.</p>`, soDongTraLoi: 1, loaiCau: nhanLoai },
        dapAn: { dapAn: 'Đáp số: 24', loaiCau: nhanLoai },
      };
    case 'tu-luan':
      return {
        cau: { so, noiDungHtml: `${dan}<p>a) Trình bày ý thứ nhất của vấn đề.</p><p>b) Vận dụng để giải quyết tình huống đã cho.</p>`, soDongTraLoi: 4, loaiCau: nhanLoai },
        dapAn: {
          dapAn: 'Hướng dẫn chấm',
          huongDanHtml: '<p>a) Nêu đúng ý chính — 50% số điểm của câu.</p><p>b) Vận dụng đúng, lập luận chặt chẽ — 50% số điểm của câu.</p>',
          loaiCau: nhanLoai,
        },
      };
    default:
      return {
        cau: { so, noiDungHtml: `${dan}<p>(Câu dẫn chung và các câu hỏi con theo nội dung câu hỏi đã soạn.)</p>`, soDongTraLoi: 2, loaiCau: nhanLoai },
        dapAn: { dapAn: 'Theo đáp án từng câu hỏi con', loaiCau: nhanLoai },
      };
  }
}

/** Phần mặc định khi mẫu không phân phần (đề trình bày một mạch) */
const PHAN_MOT_MACH: PhanGiaLap[] = [
  { loaiCau: ['trac-nghiem-1'], soCau: 8, tyLeDiem: 40 },
  { loaiCau: ['tra-loi-ngan'], soCau: 2, tyLeDiem: 20 },
  { loaiCau: ['tu-luan'], soCau: 2, tyLeDiem: 40 },
];

const LA_MA = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function tenPhan(p: PhanGiaLap, i: number): string {
  const ten = (p.ten ?? '').trim();
  if (/^phần\b/i.test(ten)) return ten.toUpperCase();
  const ma = (p.ma ?? '').trim() || LA_MA[i] || String(i + 1);
  return `PHẦN ${ma}. ${ten || 'Tên phần'}`.toUpperCase();
}

/** Sinh đề giả lập đúng cấu hình mẫu đề */
export function taoDeGiaLap(cauHinh: CauHinhGiaLap, giaTri: Record<string, string>, tuyChon: TuyChonGiaLap): DeChuan {
  const nhan = cauHinh.nhanLoaiCau ?? {};
  const mon = giaTri.MON_HOC || 'Toán';
  const dsPhan = cauHinh.coPhanPhan && cauHinh.cacPhan.length ? cauHinh.cacPhan : PHAN_MOT_MACH;
  const tongTyLe = dsPhan.reduce((t, p) => t + (Number(p.tyLeDiem) || 0), 0) || 100;
  let so = 0;
  const phan: PhanDe[] = [];
  const dapAn: DapAnCau[] = [];
  dsPhan.forEach((p, i) => {
    const loai = p.loaiCau.length ? p.loaiCau : ['trac-nghiem-1'];
    const soCau = Math.max(1, Math.min(p.soCau || loai.length * SO_CAU_MAC_DINH_MOI_LOAI, TOI_DA_CAU - so));
    if (so >= TOI_DA_CAU) return;
    const diemPhan = ((Number(p.tyLeDiem) || 100 / dsPhan.length) / tongTyLe) * tuyChon.tongDiem;
    const diemCau = p.diemMoiCau ?? lamTron025(diemPhan / soCau);
    const cau: CauDe[] = [];
    for (let k = 0; k < soCau; k++) {
      so++;
      const lc = loai[k % loai.length];
      const s = sinhCau(lc, so, mon, nhan[lc] ?? lc);
      cau.push({ ...s.cau, diem: diemCau });
      dapAn.push({ cau: so, ...s.dapAn, diem: diemCau });
    }
    const coTuLuan = loai.includes('tu-luan');
    phan.push({
      ten: cauHinh.coPhanPhan ? tenPhan(p, i) : undefined,
      moTa: cauHinh.coPhanPhan ? [p.huongDan?.trim(), `(${soCau} câu — ${soVn(diemCau * soCau)} điểm)`].filter(Boolean).join(' ') : undefined,
      hienDiem: coTuLuan,
      cau,
    });
  });
  return {
    tieuDe: giaTri.TIEU_DE_DE ?? '',
    donViCapTren: giaTri.DON_VI_CAP_TREN,
    donVi: giaTri.TEN_DON_VI ?? '',
    kyThi: giaTri.TEN_KY,
    mon,
    khoi: giaTri.KHOI,
    thoiGian: Number(giaTri.THOI_GIAN) || 45,
    maDe: tuyChon.coMaDe ? giaTri.MA_DE : undefined,
    loaiBan: giaTri.LOAI_BAN,
    phan,
    dapAn,
  };
}

/** Ghép dữ liệu trộn: trường nội tuyến (tự tính Số câu/Tổng điểm theo đề sinh ra) + khối nội dung + điều kiện */
export function taoDuLieuTronGiaLap(cauHinh: CauHinhGiaLap, giaTri: Record<string, string>, tuyChon: TuyChonGiaLap): { duLieu: DuLieuTron; de: DeChuan } {
  const de = taoDeGiaLap(cauHinh, giaTri, tuyChon);
  const soCau = de.phan.reduce((t, p) => t + p.cau.length, 0);
  const tongDiem = (de.dapAn ?? []).reduce((t, d) => t + (d.diem ?? 0), 0);
  return {
    de,
    duLieu: {
      giaTri: {
        ...giaTri,
        MA_DE: tuyChon.coMaDe ? (giaTri.MA_DE ?? '') : '',
        SO_CAU: giaTri.SO_CAU?.trim() ? giaTri.SO_CAU : String(soCau),
        TONG_DIEM: giaTri.TONG_DIEM?.trim() ? giaTri.TONG_DIEM : soVn(tongDiem),
      },
      khoi: {
        NOI_DUNG_DE: khoiNoiDungDe(de),
        DAP_AN: tuyChon.kemDapAn ? khoiBangDapAn(de) : undefined,
      },
      dieuKien: { KEM_DAP_AN: tuyChon.kemDapAn, CO_MA_DE: tuyChon.coMaDe },
    },
  };
}
