/**
 * Định dạng: Điền khuyết (câu đục lỗ đứng riêng) — nội dung có ô trống "(1)______", "(2)______"
 * hoặc "(N**)"; đáp án tùy chọn "Đáp án: (1) …; (2) …".
 * Đục lỗ trong NGỮ LIỆU của câu hỏi nhóm (mỗi ô trống là một câu hỏi con) do định dạng
 * câu chùm xử lý — xem cauChum.ts.
 */
import { LOAI_CAU, type DinhDangCauHoi } from '../kieu';
import { catTienToCau, demOTrong, phanTich, tachDongDapAn, tachLoiGiai, timMocTuanTu } from '../tienIch';

const MA = 'dien-khuyet';

export const dinhDangDienKhuyet: DinhDangCauHoi = {
  ma: MA,
  ten: 'Điền khuyết (đục lỗ)',
  quyUoc:
    'Vị trí trống ghi "(1)______", "(2)______" (có gạch chân) hoặc "(N**)" (không gạch chân) — hệ thống tự điền số thứ tự phù hợp khi sinh đề. Đáp án (tùy chọn): "Đáp án: (1) …; (2) …".',
  viDu: 'CH-DK The exhibition will showcase over 100 galleries (1)______ are derived from global art capitals alongside Vietnam’s (2)______ art institutions.\nĐáp án: (1) which; (2) leading',
  loaiCau: [LOAI_CAU.DienKhuyet],
  uuTien: 8,

  nhanDien(khoi, nguCanh) {
    if (khoi.cauCon?.length) return 0;
    const { doc, goc } = phanTich(khoi.html);
    tachLoiGiai(goc);
    tachDongDapAn(goc);
    if (timMocTuanTu(doc, goc, 'A').length >= 2) return 0; // ô trống kèm phương án → trắc nghiệm
    const soO = demOTrong(goc.innerHTML);
    if (nguCanh.loaiCauYeuCau === LOAI_CAU.DienKhuyet) return soO ? 0.95 : 0.6;
    return soO ? 0.8 : 0;
  },

  bocTach(khoi, nguCanh) {
    const { goc } = phanTich(khoi.html);
    const loiGiai = tachLoiGiai(goc);
    const dapAn = tachDongDapAn(goc);
    const noiDung = catTienToCau(goc.innerHTML);
    const soOTrong = demOTrong(noiDung);
    if (!soOTrong && nguCanh.nguon === 'dan') return null;
    const lyDo: string[] = [];
    if (!soOTrong) lyDo.push('Không tìm thấy ô trống "(1)______" hoặc "(N**)" trong nội dung');
    if (!dapAn) lyDo.push('Chưa có "Đáp án:" cho các ô trống — cần nhập đáp án chấp nhận');
    return {
      maDinhDang: MA,
      loaiCau: LOAI_CAU.DienKhuyet,
      noiDung,
      phuongAn: [],
      dapAn: dapAn || undefined,
      loiGiai,
      soOTrong,
      trangThai: !noiDung ? 'loi' : lyDo.length ? 'canh-bao' : 'ok',
      lyDo,
    };
  },
};
