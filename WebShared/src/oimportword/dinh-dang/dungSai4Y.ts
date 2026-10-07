/** Định dạng: Đúng/Sai nhiều ý — các lệnh hỏi "a)" "b)" "c)" "d)" (mẫu đề TN THPT từ 2025, Phần II) */
import { LOAI_CAU, type DinhDangCauHoi } from '../kieu';
import {
  catTheoMoc,
  catTienToCau,
  dapAnTheoY,
  DUNG_SAI_RE,
  phanTich,
  tachAnhNoi,
  tachDapAnCuoi,
  tachDongDapAn,
  tachLoiGiai,
  timMocTuanTu,
  traiPhangBangPhuongAn,
} from '../tienIch';

const MA = 'dung-sai-4-y';

/** Dòng đáp án GỘP cho cả câu: có nhắc tới các ý "a)", "b)"… hoặc liệt kê "a, c" */
const laDapAnGop = (giaTri: string) => /\b[a-h]\s*[).:\-–]?\s*(đúng|sai|đ|s)?(?=$|[\s,;.)])/i.test(giaTri) && !DUNG_SAI_RE.test(giaTri);

export const dinhDangDungSai4Y: DinhDangCauHoi = {
  ma: MA,
  ten: 'Đúng/Sai nhiều ý a) b) c) d)',
  quyUoc:
    'Lời dẫn, rồi các lệnh hỏi "a)" "b)" "c)" "d)" (in đậm hoặc thường). Đáp án (tùy chọn) đặt ở CUỐI MỖI lệnh hỏi: "Đáp án: Đúng" hoặc "Đáp án: Sai"; cũng nhận một dòng gộp cuối câu "Đáp án: a) Đ, b) S, c) Đ, d) S" hoặc gạch chân các ý đúng.',
  viDu: 'CH-DS4 Cho hàm số y = x² − 4x + 3.\na) Đồ thị cắt trục tung tại điểm (0; 3). Đáp án: Đúng\nb) Hàm số đồng biến trên ℝ. Đáp án: Sai\nc) …  Đáp án: Đúng\nd) …  Đáp án: Sai',
  loaiCau: [LOAI_CAU.DungSai4Y],
  uuTien: 9,

  nhanDien(khoi, nguCanh) {
    const { doc, goc } = phanTich(khoi.html);
    tachLoiGiai(goc);
    tachDongDapAn(goc, laDapAnGop);
    traiPhangBangPhuongAn(doc, goc);
    // có phương án A. B. … thì nhường định dạng trắc nghiệm
    if (timMocTuanTu(doc, goc, 'A').length >= 2) return 0;
    const soY = timMocTuanTu(doc, goc, 'a').length;
    if (soY < 2) return 0;
    if (nguCanh.loaiCauYeuCau === LOAI_CAU.DungSai4Y) return 0.95;
    const goiYPhan = /đúng\s*(hoặc|\/)\s*sai/i.test(khoi.phan ?? '') ? 0.05 : 0;
    return (soY === 4 ? 0.85 : 0.7) + goiYPhan;
  },

  bocTach(khoi) {
    const { doc, goc } = phanTich(khoi.html);
    const loiGiai = tachLoiGiai(goc);
    const dongGop = tachDongDapAn(goc, laDapAnGop);
    traiPhangBangPhuongAn(doc, goc);
    const cacMoc = timMocTuanTu(doc, goc, 'a');
    if (cacMoc.length < 2) return null;
    const { truoc, cacMuc } = catTheoMoc(doc, goc, cacMoc);
    // ảnh nổi Word neo ở dòng lệnh hỏi → hình minh họa của lời dẫn
    let anhNoi = '';
    for (const muc of cacMuc) {
      const t = tachAnhNoi(muc.html);
      muc.html = t.html;
      anhNoi += t.anhNoi;
    }

    // đáp án cuối MỖI lệnh hỏi: "a) … Đáp án: Đúng"
    const theoTungY = cacMuc.map((m) => {
      const t = tachDapAnCuoi(m.html);
      if (t.dapAn && DUNG_SAI_RE.test(t.dapAn)) {
        m.html = t.html;
        return /^đ/i.test(t.dapAn);
      }
      return undefined;
    });

    const lyDo: string[] = [];
    let dung: boolean[];
    if (theoTungY.some((v) => v !== undefined)) {
      dung = theoTungY.map((v) => v ?? false);
      const thieu = theoTungY
        .map((v, i) => (v === undefined ? String.fromCharCode(97 + i) : null))
        .filter(Boolean);
      if (thieu.length) lyDo.push(`Lệnh hỏi ${thieu.join(', ')}) chưa có "Đáp án: Đúng/Sai"`);
    } else if (dongGop && dapAnTheoY(dongGop, cacMuc.length)) {
      dung = dapAnTheoY(dongGop, cacMuc.length) as boolean[];
    } else if (cacMuc.some((m) => m.gachChan)) {
      dung = cacMuc.map((m) => m.gachChan);
    } else {
      dung = cacMuc.map(() => false);
      lyDo.push('Chưa có đáp án Đúng/Sai cho các lệnh hỏi — cần đánh dấu');
    }
    if (cacMuc.length !== 4) lyDo.push(`Có ${cacMuc.length} lệnh hỏi (mẫu chuẩn 4 ý)`);
    const noiDung = catTienToCau(truoc) + anhNoi;
    if (!noiDung) lyDo.unshift('Lời dẫn trống sau khi bóc tách');

    return {
      maDinhDang: MA,
      loaiCau: LOAI_CAU.DungSai4Y,
      noiDung,
      phuongAn: cacMuc.map((m, i) => ({ noiDung: m.html, dung: dung[i] })),
      loiGiai,
      trangThai: !noiDung ? 'loi' : lyDo.length ? 'canh-bao' : 'ok',
      lyDo,
    };
  },
};
