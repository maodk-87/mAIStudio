/**
 * Định dạng: Câu hỏi nhóm (câu chùm) — câu dẫn + ngữ liệu (đoạn văn/bảng/hình) + các câu hỏi con.
 * Mỗi câu con được bóc tách lại bằng bộ máy chung (định dạng theo loại của câu con).
 *   - Câu dẫn: "##…##" (VD "##Задания N**+1 – N**+2. …##") hoặc câu "Cho đoạn văn sau và trả
 *     lời câu N** – câu N***" → trường `cauDan` (lời dẫn chung).
 *   - Đục lỗ trong ngữ liệu: ô trống thứ k ứng với câu con thứ k → chuẩn hóa về "(N**+k)"
 *     để khi sinh đề đánh số theo vị trí thật (viTriCau.ts).
 */
import { LOAI_CAU, type DinhDangCauHoi } from '../kieu';
import {
  chuanHoaOTrongNhom,
  demOTrong,
  donPhanDoan,
  LOI_DAN_NHOM_RE,
  phanTich,
  tachCauDanThang,
} from '../tienIch';

const MA = 'cau-chum';

const MA_DAU_RE = /^((?:<[^>]+>|\s|&nbsp;)*)CH\s*[-–]\s*[A-Za-z]+\d*\s*[.:)]?\s*/;

/** Bỏ nhãn "CH-NHOM", "Ngữ liệu 2." / "Bài đọc:" ở đầu ngữ liệu */
const catNhanNguLieu = (html: string): string =>
  donPhanDoan(
    html
      .replace(MA_DAU_RE, '$1')
      .replace(/^((?:<[^>]+>|\s|&nbsp;)*)(?:ngữ\s*liệu|bài\s*đọc|đoạn\s*văn)\s*\d*\s*[.:]\s*/i, '$1'),
  );

export const dinhDangCauChum: DinhDangCauHoi = {
  ma: MA,
  ten: 'Câu hỏi nhóm (câu dẫn + đoạn văn + câu hỏi con)',
  quyUoc:
    'Câu dẫn / đoạn văn ngắn trước, các câu hỏi con bên dưới — đầu câu con ghi "CHC-<mã loại>" (VD "CHC-TN", "CHC-TLN"), hoặc "Ngữ liệu N." + "Câu N.1.", "Câu N.2."… Câu dẫn đánh dấu "##…##" kèm chỉ số câu con "N**+1", "N**+2"… hoặc "Cho đoạn văn sau và trả lời câu N** – câu N***". Ô trống trong đoạn văn: "(1)______" hoặc "(N**)" — ô thứ k ứng với câu con thứ k.',
  viDu: 'CH-NHOM ##Đọc đoạn văn và trả lời câu N**+1 – N**+2.##\nThe exhibition will showcase over 100 galleries (1)______ are derived from global art capitals alongside Vietnam’s (2)______ art institutions.\nCHC-TN Chọn đáp án cho chỗ trống (N**+1)\nA. which   B. who   C. whom   D. whose\nĐáp án: A\nCHC-TN Chọn đáp án cho chỗ trống (N**+2)\nA. lead   B. leading   C. led   D. leader\nĐáp án: B',
  loaiCau: [LOAI_CAU.CauChum],
  uuTien: 20,

  nhanDien(khoi) {
    return khoi.cauCon?.length ? 1 : 0;
  },

  bocTach(khoi, nguCanh) {
    if (!khoi.cauCon?.length) return null;
    const cauCon = khoi.cauCon.map((con) => nguCanh.bocTachKhoi({ ...con, laCauCon: true }));

    const { doc, goc } = phanTich(khoi.html.replace(MA_DAU_RE, '$1'));
    let cauDan = tachCauDanThang(doc, goc);
    if (!cauDan) {
      // câu dẫn dạng câu: "Cho đoạn văn sau và trả lời câu N** – câu N***."
      const doanDan = Array.from(goc.children).find((k) => LOI_DAN_NHOM_RE.test(k.textContent ?? ''));
      if (doanDan) {
        doanDan.remove();
        cauDan = donPhanDoan(doanDan.outerHTML);
      }
    }
    const nguLieu = chuanHoaOTrongNhom(catNhanNguLieu(goc.innerHTML));
    const soOTrong = demOTrong(nguLieu);

    const lyDo: string[] = [];
    if (!nguLieu && !cauDan) lyDo.push('Nhóm không có câu dẫn/đoạn văn chung');
    if (soOTrong && soOTrong !== cauCon.length) {
      lyDo.push(`Đoạn văn có ${soOTrong} ô trống nhưng có ${cauCon.length} câu hỏi con — kiểm tra lại tương ứng`);
    }
    cauCon.forEach((c, i) => {
      if (c.trangThai !== 'ok') lyDo.push(`Câu con ${i + 1}${c.maCauHoi ? ` (${c.maCauHoi})` : ''}: ${c.lyDo.join('; ')}`);
    });
    const coLoi = cauCon.some((c) => c.trangThai === 'loi');
    return {
      maDinhDang: MA,
      loaiCau: LOAI_CAU.CauChum,
      noiDung: cauDan ?? '',
      cauDan,
      nguLieu,
      soOTrong: soOTrong || undefined,
      phuongAn: [],
      cauCon,
      trangThai: coLoi ? 'loi' : lyDo.length ? 'canh-bao' : 'ok',
      lyDo,
    };
  },
};
