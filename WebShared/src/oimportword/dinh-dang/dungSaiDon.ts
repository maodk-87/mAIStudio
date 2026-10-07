/** Định dạng: Đúng/Sai MỘT nhận định — nội dung + "Đáp án: Đúng" / "Đáp án: Sai" */
import { LOAI_CAU, type DinhDangCauHoi } from '../kieu';
import {
  catTienToCau,
  DUNG_SAI_RE,
  phanTich,
  tachDapAnCuoi,
  tachDongDapAn,
  tachLoiGiai,
  timMocTuanTu,
} from '../tienIch';

const MA = 'dung-sai-don';

const coLenhHoi = (html: string) => {
  const { doc, goc } = phanTich(html);
  return timMocTuanTu(doc, goc, 'A').length >= 2 || timMocTuanTu(doc, goc, 'a').length >= 2;
};

export const dinhDangDungSaiDon: DinhDangCauHoi = {
  ma: MA,
  ten: 'Đúng/Sai một nhận định',
  quyUoc: 'Một nhận định, cuối câu ghi "Đáp án: Đúng" hoặc "Đáp án: Sai" (không có lệnh hỏi a), b)…).',
  viDu: 'CH-DS Số 2 là số nguyên tố chẵn duy nhất.\nĐáp án: Đúng',
  loaiCau: [LOAI_CAU.DungSai],
  uuTien: 7,

  nhanDien(khoi, nguCanh) {
    if (coLenhHoi(khoi.html)) return 0;
    if (nguCanh.loaiCauYeuCau === LOAI_CAU.DungSai) return 0.9;
    const { goc } = phanTich(khoi.html);
    tachLoiGiai(goc);
    const dapAn = tachDongDapAn(goc) ?? tachDapAnCuoi(goc.innerHTML).dapAn;
    return dapAn && DUNG_SAI_RE.test(dapAn) ? 0.85 : 0;
  },

  bocTach(khoi, nguCanh) {
    const { goc } = phanTich(khoi.html);
    const loiGiai = tachLoiGiai(goc);
    let dapAn = tachDongDapAn(goc, (v) => DUNG_SAI_RE.test(v));
    let html = goc.innerHTML;
    if (!dapAn) {
      const cuoi = tachDapAnCuoi(html);
      if (cuoi.dapAn && DUNG_SAI_RE.test(cuoi.dapAn)) {
        dapAn = cuoi.dapAn;
        html = cuoi.html;
      }
    }
    if (!dapAn && nguCanh.nguon === 'dan') return null;
    const noiDung = catTienToCau(html);
    const lyDo: string[] = [];
    if (!noiDung) lyDo.push('Nội dung nhận định trống');
    if (!dapAn) lyDo.push('Chưa có "Đáp án: Đúng/Sai" — cần chọn đáp án');
    return {
      maDinhDang: MA,
      loaiCau: LOAI_CAU.DungSai,
      noiDung,
      phuongAn: [],
      dapAn: dapAn ? (/^đ/i.test(dapAn) ? 'Đúng' : 'Sai') : undefined,
      loiGiai,
      trangThai: !noiDung ? 'loi' : lyDo.length ? 'canh-bao' : 'ok',
      lyDo,
    };
  },
};
