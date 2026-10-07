/** Định dạng: Trắc nghiệm 1 hoặc nhiều đáp án — phương án "A." "B." "C." "D." */
import { LOAI_CAU, type CauHoiBocTach, type DinhDangCauHoi } from '../kieu';
import {
  catTheoMoc,
  catTienToCau,
  chuCaiDapAn,
  phanTich,
  tachAnhNoi,
  tachDapAnCuoi,
  tachDongDapAn,
  tachLoiGiai,
  timMocTuanTu,
  traiPhangBangPhuongAn,
} from '../tienIch';

const MA = 'trac-nghiem-abcd';
const LOAI_TN: string[] = [LOAI_CAU.TracNghiem1DapAn, LOAI_CAU.TracNghiemNhieuDapAn];

export const dinhDangTracNghiemAbcd: DinhDangCauHoi = {
  ma: MA,
  ten: 'Trắc nghiệm A. B. C. D.',
  quyUoc:
    'Đề bài, rồi các phương án "A." "B." "C." "D." (in đậm hoặc thường) phân tách bằng Tab, Enter hoặc từ 5 dấu cách trở lên (cũng nhận phương án trong bảng). Đáp án (tùy chọn) ở cuối câu: "Đáp án: B" (nhiều đáp án: "Đáp án: A, C"), hoặc gạch chân phương án đúng.',
  viDu: 'Câu 1. Kết quả của 2 + 2 là\nA. 3.    B. 4.    C. 5.    D. 22.\nĐáp án: B',
  loaiCau: LOAI_TN,
  uuTien: 10,

  nhanDien(khoi) {
    const { doc, goc } = phanTich(khoi.html);
    tachLoiGiai(goc);
    tachDongDapAn(goc);
    traiPhangBangPhuongAn(doc, goc);
    const soMoc = timMocTuanTu(doc, goc, 'A').length;
    if (soMoc >= 4) return 0.9;
    return soMoc >= 2 ? 0.7 : 0;
  },

  bocTach(khoi, nguCanh) {
    const { doc, goc } = phanTich(khoi.html);
    const loiGiai = tachLoiGiai(goc);
    const dongDapAn = tachDongDapAn(goc);
    traiPhangBangPhuongAn(doc, goc);
    const cacMoc = timMocTuanTu(doc, goc, 'A');
    if (cacMoc.length < 2) return null;
    const { truoc, cacMuc } = catTheoMoc(doc, goc, cacMoc);
    // ảnh nổi Word neo ở dòng phương án → hình minh họa của đề bài
    let anhNoi = '';
    for (const muc of cacMuc) {
      const t = tachAnhNoi(muc.html);
      muc.html = t.html;
      anhNoi += t.anhNoi;
    }

    // "Đáp án: B" viết cuối dòng phương án cuối cùng (cùng đoạn)
    let giaTriDapAn = dongDapAn;
    if (!giaTriDapAn && cacMuc.length) {
      const cuoi = tachDapAnCuoi(cacMuc[cacMuc.length - 1].html);
      if (cuoi.dapAn && chuCaiDapAn(cuoi.dapAn).length) {
        giaTriDapAn = cuoi.dapAn;
        cacMuc[cacMuc.length - 1].html = cuoi.html;
      }
    }

    const lyDo: string[] = [];
    const chuDung = giaTriDapAn ? chuCaiDapAn(giaTriDapAn) : [];
    let dung: boolean[];
    if (chuDung.length) {
      dung = cacMuc.map((_, i) => chuDung.includes(String.fromCharCode(65 + i)));
    } else if (cacMuc.some((m) => m.gachChan)) {
      dung = cacMuc.map((m) => m.gachChan);
    } else if (cacMuc.some((m) => m.inDam) && !cacMuc.every((m) => m.inDam)) {
      dung = cacMuc.map((m) => m.inDam);
    } else {
      dung = cacMuc.map(() => false);
    }

    const soDung = dung.filter(Boolean).length;
    let loaiCau: string =
      nguCanh.loaiCauYeuCau && LOAI_TN.includes(nguCanh.loaiCauYeuCau)
        ? nguCanh.loaiCauYeuCau
        : soDung > 1
          ? LOAI_CAU.TracNghiemNhieuDapAn
          : LOAI_CAU.TracNghiem1DapAn;
    if (loaiCau === LOAI_CAU.TracNghiem1DapAn && soDung > 1) {
      if (nguCanh.loaiCauYeuCau) {
        const dauTien = dung.indexOf(true);
        dung = dung.map((_, i) => i === dauTien);
        lyDo.push('Tài liệu đánh dấu nhiều đáp án đúng nhưng loại câu là 1 đáp án — chỉ giữ đáp án đầu tiên');
      } else {
        loaiCau = LOAI_CAU.TracNghiemNhieuDapAn;
      }
    }
    if (!dung.some(Boolean)) {
      lyDo.push('Chưa nhận diện được đáp án đúng (thiếu dòng "Đáp án:" hoặc gạch chân) — cần đánh dấu');
    }
    const noiDung = catTienToCau(truoc) + anhNoi;
    const trong = cacMuc
      .map((m, i) => (m.html ? null : String.fromCharCode(65 + i)))
      .filter(Boolean);
    if (trong.length) lyDo.push(`Phương án ${trong.join(', ')} trống sau khi bóc tách`);
    if (cacMuc.length < 4) lyDo.push(`Chỉ tách được ${cacMuc.length} phương án`);

    // câu con của nhóm (VD ô trống của đoạn văn đục lỗ) được phép chỉ có phương án, không có đề
    const thieuDe = !noiDung && !khoi.laCauCon;
    const ketQua: CauHoiBocTach = {
      maDinhDang: MA,
      loaiCau,
      noiDung,
      phuongAn: cacMuc.map((m, i) => ({ noiDung: m.html, dung: dung[i] })),
      loiGiai,
      trangThai: thieuDe ? 'loi' : lyDo.length ? 'canh-bao' : 'ok',
      lyDo: thieuDe ? ['Đề bài trống sau khi bóc tách', ...lyDo] : lyDo,
    };
    return ketQua;
  },
};
