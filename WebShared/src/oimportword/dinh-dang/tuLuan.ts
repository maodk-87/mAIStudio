/** Định dạng: Tự luận — đề bài (+ "Lời giải:"/"Hướng dẫn chấm:" làm đáp án gợi ý) */
import { LOAI_CAU, type DinhDangCauHoi } from '../kieu';
import { catTienToCau, demOTrong, phanTich, tachDongDapAn, tachLoiGiai, timMocTuanTu } from '../tienIch';

const MA = 'tu-luan';

/** Cách hỏi đặc trưng câu tự luận (yêu cầu trình bày, lập luận) */
const CACH_HOI_TU_LUAN_RE =
  /chứng\s*minh|giải\s*thích|trình\s*bày|lập\s*luận|phân\s*tích|hãy\s*(?:viết|nêu|so\s*sánh)|nêu\s*(?:ý\s*kiến|cảm\s*nhận)/i;

export const dinhDangTuLuan: DinhDangCauHoi = {
  ma: MA,
  ten: 'Tự luận',
  quyUoc:
    'Đề bài không có phương án; đoạn bắt đầu bằng "Lời giải:", "Hướng dẫn giải:" hoặc "Hướng dẫn chấm:" được lấy làm đáp án gợi ý cho người chấm. Nhận là tự luận khi có mã CH-TL, câu thuộc phần "tự luận", có lời giải, hoặc cách hỏi yêu cầu trình bày ("chứng minh", "giải thích"…).',
  viDu: 'CH-TL Giải phương trình x² − 5x + 6 = 0.\nLời giải: Δ = 1, x = 2 hoặc x = 3.',
  loaiCau: [LOAI_CAU.TuLuan],
  uuTien: 1,

  nhanDien(khoi, nguCanh) {
    const { doc, goc } = phanTich(khoi.html);
    const coLoiGiai = tachLoiGiai(goc) !== undefined;
    if (timMocTuanTu(doc, goc, 'A').length >= 2 || timMocTuanTu(doc, goc, 'a').length >= 2) return 0;
    if (nguCanh.loaiCauYeuCau === LOAI_CAU.TuLuan) return 0.9;
    if (tachDongDapAn(goc) !== null || demOTrong(goc.innerHTML) > 0) return 0;
    if (/tự\s*luận/i.test(khoi.phan ?? '')) return 0.6;
    if (coLoiGiai) return 0.5;
    if (nguCanh.nguon === 'tep' && CACH_HOI_TU_LUAN_RE.test(khoi.vanBan)) return 0.45;
    // không có tín hiệu nào → KHÔNG đoán: câu sẽ được đánh dấu cần cập nhật loại câu
    return 0;
  },

  bocTach(khoi, nguCanh) {
    const { goc } = phanTich(khoi.html);
    const loiGiai = tachLoiGiai(goc);
    if (!loiGiai && nguCanh.nguon === 'dan') return null;
    const noiDung = catTienToCau(goc.innerHTML);
    return {
      maDinhDang: MA,
      loaiCau: LOAI_CAU.TuLuan,
      noiDung,
      phuongAn: [],
      loiGiai,
      trangThai: noiDung ? 'ok' : 'loi',
      lyDo: noiDung ? [] : ['Đề bài trống sau khi bóc tách'],
    };
  },
};
