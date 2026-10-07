/** Nhãn nghiệp vụ dùng chung cho bộ màn hình NHCH */
import { CapDoTuDuy, CheDoDaoCauHoi, LoaiCauHoi } from './hang';
import type { LuaChon } from '../giao-dien/FormSelect';

/** Tên hiển thị 13 loại câu hỏi */
export const nhanLoaiCau: Record<string, string> = {
  [LoaiCauHoi.TracNghiem1DapAn]: 'Trắc nghiệm 1 đáp án',
  [LoaiCauHoi.TracNghiemNhieuDapAn]: 'Trắc nghiệm nhiều đáp án',
  [LoaiCauHoi.DungSai]: 'Đúng / Sai',
  [LoaiCauHoi.DungSai4Y]: 'Đúng / Sai 4 ý',
  [LoaiCauHoi.GhepDoi]: 'Ghép đôi',
  [LoaiCauHoi.SapXep]: 'Sắp xếp thứ tự',
  [LoaiCauHoi.DienKhuyet]: 'Điền khuyết',
  [LoaiCauHoi.TraLoiNgan]: 'Trả lời ngắn',
  [LoaiCauHoi.TuLuan]: 'Tự luận',
  [LoaiCauHoi.CauChum]: 'Câu chùm (nhiều câu con)',
  [LoaiCauHoi.KeoTha]: 'Kéo thả',
  [LoaiCauHoi.ToMau]: 'Tô màu vùng hình',
  [LoaiCauHoi.NoiDay]: 'Nối dây',
};

/** Mô tả ngắn từng loại câu — dòng diễn giải của option 2 dòng */
export const moTaLoaiCau: Record<string, string> = {
  [LoaiCauHoi.TracNghiem1DapAn]: 'Chọn 1 phương án đúng trong các phương án A, B, C, D',
  [LoaiCauHoi.TracNghiemNhieuDapAn]: 'Chọn nhiều phương án đúng cùng lúc',
  [LoaiCauHoi.DungSai]: 'Khẳng định 1 nhận định là Đúng hoặc Sai',
  [LoaiCauHoi.DungSai4Y]: '4 ý nhỏ, mỗi ý chọn Đúng hoặc Sai',
  [LoaiCauHoi.GhepDoi]: 'Ghép từng mục ở cột trái với mục tương ứng ở cột phải',
  [LoaiCauHoi.SapXep]: 'Sắp xếp các mục theo đúng thứ tự',
  [LoaiCauHoi.DienKhuyet]: 'Điền từ/cụm từ vào chỗ trống trong câu',
  [LoaiCauHoi.TraLoiNgan]: 'Nhập câu trả lời ngắn — chấm theo đáp án chấp nhận',
  [LoaiCauHoi.TuLuan]: 'Viết bài trả lời dài — chấm tay theo rubric',
  [LoaiCauHoi.CauChum]: 'Một ngữ liệu chung kèm nhiều câu hỏi con',
  [LoaiCauHoi.KeoTha]: 'Kéo các thẻ thả vào đúng vị trí',
  [LoaiCauHoi.ToMau]: 'Tô màu/đánh dấu vùng trên hình vẽ',
  [LoaiCauHoi.NoiDay]: 'Nối các điểm hai bên bằng đường thẳng',
};

/** Lựa chọn loại câu cho FormSelect (option 2 dòng: tên + mô tả) */
export const luaChonLoaiCau: LuaChon[] = Object.values(LoaiCauHoi).map((lc) => ({
  value: lc,
  label: nhanLoaiCau[lc],
  moTa: moTaLoaiCau[lc],
}));

/** Nhãn cấp độ tư duy */
export const nhanCdtd: Record<string, string> = {
  [CapDoTuDuy.NhanBiet]: 'Nhận biết',
  [CapDoTuDuy.ThongHieu]: 'Thông hiểu',
  [CapDoTuDuy.VanDung]: 'Vận dụng',
};

/** Nhãn 4 chế độ đảo câu hỏi khi hoán vị đề */
export const nhanCheDoDao: Record<string, string> = {
  [CheDoDaoCauHoi.DaoLenhHoiVaDapAn]: 'Đảo lệnh hỏi & đảo đáp án',
  [CheDoDaoCauHoi.ChiDaoLenhHoi]: 'Chỉ đảo lệnh hỏi',
  [CheDoDaoCauHoi.ChiDaoDapAn]: 'Chỉ đảo đáp án',
  [CheDoDaoCauHoi.KhongDao]: 'Không đảo',
};

/** Mô tả chi tiết 4 chế độ đảo — dòng diễn giải của option 2 dòng */
export const moTaCheDoDao: Record<string, string> = {
  [CheDoDaoCauHoi.DaoLenhHoiVaDapAn]:
    'Đảo lệnh hỏi trong câu chùm/Đúng-Sai; và đảo đáp án của mỗi lệnh hỏi (câu chùm/Đúng-Sai/trắc nghiệm đơn)',
  [CheDoDaoCauHoi.ChiDaoLenhHoi]:
    'Đảo vị trí lệnh hỏi trong câu chùm/nhóm, nhưng KHÔNG đảo vị trí đáp án của mỗi lệnh hỏi',
  [CheDoDaoCauHoi.ChiDaoDapAn]:
    'KHÔNG đảo vị trí lệnh hỏi (câu hỏi con) trong câu chùm/Đúng-Sai; chỉ đảo đáp án mỗi lệnh hỏi (chùm/Đúng-Sai/trắc nghiệm)',
  [CheDoDaoCauHoi.KhongDao]:
    'Giữ nguyên vị trí lệnh hỏi và đáp án — dùng khi thứ tự cố định (VD: phương án "Cả A và B đúng")',
};

/** Lựa chọn chế độ đảo cho FormSelect (option 2 dòng: tên + mô tả) */
export const luaChonCheDoDao: LuaChon[] = Object.values(CheDoDaoCauHoi).map((cd) => ({
  value: cd,
  label: nhanCheDoDao[cd],
  moTa: moTaCheDoDao[cd],
}));

/** Nhãn kiểu hiển thị khi làm bài */
export const nhanKieuHienThi: Record<string, string> = {
  'tren-duoi': 'Trên – Dưới (mặc định)',
  'trai-40': 'Trái 40% – Phải 60%',
  'trai-50': 'Trái 50% – Phải 50%',
  'trai-60': 'Trái 60% – Phải 40%',
};

/** Bỏ thẻ HTML, lấy chuỗi thuần để hiển thị tóm tắt 1 dòng */
export function tomTatNoiDung(html: string, doDai = 120): string {
  const thuan = (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return thuan.length > doDai ? `${thuan.slice(0, doDai)}…` : thuan;
}

/**
 * Sinh nội dung "bản cũ" mock cho câu có phienBan > 1
 * (đủ khác biệt để khối so sánh highlight được).
 */
export function taoNoiDungCu(noiDungMoi: string): string {
  const thuan = tomTatNoiDung(noiDungMoi, 500);
  const tu = thuan.split(' ');
  if (tu.length > 4) {
    tu.splice(Math.floor(tu.length / 2), 1, 'các', 'giá', 'trị');
  }
  return `${tu.join(' ')} (cách diễn đạt của phiên bản trước)`;
}

/** Công thức toán do OEditor/MathType tạo: <span data-cong-thuc="LaTeX">…</span> */
const CONG_THUC_RE = /<span[^>]*data-cong-thuc="[^"]*"[^>]*>.*?<\/span>/g;

/**
 * Tóm tắt nội dung nhưng GIỮ công thức toán (render bằng KaTeX qua NoiDungHtml);
 * phần chữ bỏ thẻ HTML, cắt theo độ dài (mỗi công thức tính ~6 ký tự).
 */
export function tomTatNoiDungHtml(html: string, doDai = 120): string {
  const cacCongThuc = (html || '').match(CONG_THUC_RE) ?? [];
  const cacDoanChu = (html || '').split(CONG_THUC_RE);
  let ketQua = '';
  let conLai = doDai;
  for (let i = 0; i < cacDoanChu.length && conLai > 0; i++) {
    const chu = cacDoanChu[i].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    if (chu.length > conLai) return `${ketQua}${chu.slice(0, conLai)}…`;
    ketQua += chu;
    conLai -= chu.length;
    if (cacCongThuc[i]) {
      ketQua += cacCongThuc[i];
      conLai -= 6;
    }
  }
  return conLai <= 0 ? `${ketQua.trim()}…` : ketQua.trim();
}

/**
 * Nội dung HTML câu hỏi → CHỮ THUẦN để xuất Excel/CSV: bỏ thẻ HTML, công thức giữ LaTeX dạng $…$,
 * ảnh → [Hình ảnh], âm thanh/video → [Tệp đa phương tiện], mỗi đoạn một dòng.
 */
export function noiDungSangChu(html: string): string {
  if (!html) return '';
  const tl = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const goc = tl.body;
  const doiThanh = (chon: string, chu: (el: Element) => string) =>
    goc.querySelectorAll(chon).forEach((el) => el.replaceWith(tl.createTextNode(chu(el))));
  doiThanh('[data-cong-thuc]', (el) => ` $${el.getAttribute('data-cong-thuc') ?? ''}$ `);
  doiThanh('img', () => ' [Hình ảnh] ');
  doiThanh('audio,video', () => ' [Tệp đa phương tiện] ');
  doiThanh('br', () => '\n');
  goc.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,h5,h6').forEach((el) => el.append(tl.createTextNode('\n')));
  return (goc.textContent ?? '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
