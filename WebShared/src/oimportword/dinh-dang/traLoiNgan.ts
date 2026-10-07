/** Định dạng: Trả lời ngắn / Điền số — đề bài + "Đáp án: …" ở cuối câu (mẫu đề TN THPT từ 2025, Phần III) */
import { LOAI_CAU, type DinhDangCauHoi } from '../kieu';
import {
  catTienToCau,
  demOTrong,
  DUNG_SAI_RE,
  kiemTraDapAnSo,
  phanTich,
  tachDapAnCuoi,
  tachDongDapAn,
  tachLoiGiai,
  timMocTuanTu,
} from '../tienIch';

const MA = 'tra-loi-ngan';

/** Cách hỏi đặc trưng câu trả lời ngắn (đáp số) — VD mẫu đề TN THPT Phần III không ghi "trả lời ngắn" */
const CACH_HOI_DAP_SO_RE =
  /bằng\s*bao\s*nhiêu|là\s*bao\s*nhiêu|có\s*bao\s*nhiêu|làm\s*tròn|viết\s*kết\s*quả|kết\s*quả\s*(?:là|bằng)|đáp\s*số/i;

const coPhuongAn = (html: string): boolean => {
  const { doc, goc } = phanTich(html);
  tachLoiGiai(goc);
  return timMocTuanTu(doc, goc, 'A').length >= 2 || timMocTuanTu(doc, goc, 'a').length >= 2;
};

const laDapAnKhongPhaiDungSai = (v: string) => !!v && !DUNG_SAI_RE.test(v);

/** Lấy "Đáp án: …" (đoạn riêng hoặc cuối dòng) — bỏ qua "Đáp án: Đúng/Sai" */
function layDapAn(html: string): { html: string; dapAn: string | null } {
  const { goc } = phanTich(html);
  const dong = tachDongDapAn(goc, laDapAnKhongPhaiDungSai);
  if (dong) return { html: goc.innerHTML, dapAn: dong };
  const cuoi = tachDapAnCuoi(html);
  return cuoi.dapAn && laDapAnKhongPhaiDungSai(cuoi.dapAn) ? cuoi : { html, dapAn: null };
}

export const dinhDangTraLoiNgan: DinhDangCauHoi = {
  ma: MA,
  ten: 'Trả lời ngắn / Điền số',
  quyUoc:
    'Đề bài, đáp án (tùy chọn) ở cuối câu: "Đáp án: 12,5" hoặc "Đáp án: 0,25" — quy chuẩn tối đa 4 ký tự, dấu phẩy phân cách thập phân ở vị trí thứ 2 hoặc 3. Không có dòng đáp án thì nhận theo phần "trả lời ngắn" hoặc cách hỏi ("bằng bao nhiêu", "làm tròn…").',
  viDu: 'CH-TLN Tìm x biết 2x − 8 = 0.\nĐáp án: 4',
  loaiCau: [LOAI_CAU.TraLoiNgan],
  uuTien: 5,

  nhanDien(khoi, nguCanh) {
    if (coPhuongAn(khoi.html) || demOTrong(khoi.html) > 0) return 0;
    if (nguCanh.loaiCauYeuCau === LOAI_CAU.TraLoiNgan) return 0.9;
    const { goc } = phanTich(khoi.html);
    tachLoiGiai(goc);
    if (layDapAn(goc.innerHTML).dapAn) return 0.8;
    if (/trả\s*lời\s*ngắn|điền\s*số/i.test(khoi.phan ?? '')) return 0.75;
    if (nguCanh.nguon === 'tep' && CACH_HOI_DAP_SO_RE.test(khoi.vanBan)) return 0.45;
    return 0;
  },

  bocTach(khoi, nguCanh) {
    const { goc } = phanTich(khoi.html);
    const loiGiai = tachLoiGiai(goc);
    const { html, dapAn } = layDapAn(goc.innerHTML);
    // dán vào editor mà không có gì để tách → để dán nguyên văn
    if (!dapAn && nguCanh.nguon === 'dan') return null;
    const noiDung = catTienToCau(html);
    const lyDo: string[] = [];
    if (!noiDung) lyDo.push('Đề bài trống sau khi bóc tách');
    if (!dapAn) lyDo.push('Chưa có "Đáp án:" — cần nhập đáp án đúng');
    else {
      const viPham = kiemTraDapAnSo(dapAn);
      if (viPham) lyDo.push(`Đáp án chưa đúng quy chuẩn trả lời ngắn: ${viPham}`);
    }
    return {
      maDinhDang: MA,
      loaiCau: LOAI_CAU.TraLoiNgan,
      noiDung,
      phuongAn: [],
      dapAn: dapAn || undefined,
      loiGiai,
      trangThai: !noiDung ? 'loi' : lyDo.length ? 'canh-bao' : 'ok',
      lyDo,
    };
  },
};
