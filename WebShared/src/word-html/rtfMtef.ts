/**
 * Trích dữ liệu công thức MathType (MTEF) từ clipboard khi copy từ Word.
 *
 * Word đưa vào clipboard bản RTF, trong đó mỗi công thức MathType OLE có kèm
 * ảnh WMF kết quả ({\result{\pict\wmetafile8 <hex>}}). MathType luôn nhúng
 * MTEF gốc vào WMF qua comment "AppsMFCC" + chữ ký "Design Science, Inc." —
 * nhờ đó chuyển được công thức MathType cũ thành LaTeX ngay trên trình duyệt,
 * điều mà bản HTML của clipboard (chỉ tham chiếu ảnh file://) không làm được.
 */
import {
  mtefSangLatexChiTiet, trichMtefTuEmf, trichMtefTuOle, trichMtefTuWmf, type KetQuaMtef,
} from '../mathtype';

/** hex (cho phép xen kẽ khoảng trắng/xuống dòng) → bytes */
const hexSangBytes = (hex: string): Uint8Array => {
  const sach = hex.replace(/[^0-9a-fA-F]/g, '');
  const n = sach.length >> 1;
  const ra = new Uint8Array(n);
  for (let i = 0; i < n; i++) ra[i] = parseInt(sach.substr(i * 2, 2), 16);
  return ra;
};

/** Tìm nhóm RTF đóng đúng ngoặc bắt đầu tại viTriMo ('{') */
const timDongNhom = (rtf: string, viTriMo: number): number => {
  let sau = 0;
  for (let i = viTriMo; i < rtf.length; i++) {
    const c = rtf[i];
    if (c === '\\') { i += 1; continue; } // ký tự escape \{ \} \\
    if (c === '{') sau += 1;
    else if (c === '}') {
      sau -= 1;
      if (sau === 0) return i;
    }
  }
  return -1;
};

export interface DuLieuRtfClipboard {
  /** LaTeX cho từng đối tượng OLE công thức, theo thứ tự (null = không giải mã được) */
  dsCongThuc: (string | null)[];
  /** data URL cho từng hình ảnh, theo thứ tự (null = định dạng không hiển thị được) */
  dsAnh: (string | null)[];
  /** định dạng dữ liệu gốc của từng ảnh, khớp chỉ số với dsAnh — chẩn đoán vì sao ảnh không dán được */
  dsDinhDangAnh: string[];
  /** kích thước hiển thị (px) của từng công thức, khớp chỉ số với dsCongThuc — dùng để ghép với HTML */
  dsKichThuocCongThuc: ({ rong: number; cao: number } | null)[];
}

/** Kích thước hiển thị của {\object}: \objw/\objh (twip) × \objscalex/\objscaley (%) → px */
const kichThuocObject = (nhom: string): { rong: number; cao: number } | null => {
  const so = (re: RegExp) => Number(re.exec(nhom)?.[1] ?? NaN);
  const rong = so(/\\objw(\d+)/);
  const cao = so(/\\objh(\d+)/);
  if (!(rong > 0 && cao > 0)) return null;
  const tiLeX = so(/\\objscalex(\d+)/) || 100;
  const tiLeY = so(/\\objscaley(\d+)/) || 100;
  // 1 twip = 1/20 pt = 1/15 px
  return { rong: ((rong / 15) * tiLeX) / 100, cao: ((cao / 15) * tiLeY) / 100 };
};

const base64TuBytes = (b: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + 0x8000)));
  }
  return btoa(s);
};

/** Trích hex ảnh trong một nhóm {\pict ...} kể từ vị trí control word định dạng */
const trichHexPict = (nhom: string, tuViTri: number): Uint8Array | null => {
  const sau = nhom.slice(tuViTri);
  const khop = /(?:\\[a-z]+-?\d*\s*)*([0-9a-fA-F][0-9a-fA-F\s\r\n]{40,}?)\}/.exec(sau);
  return khop ? hexSangBytes(khop[1]) : null;
};

/** Nhóm {\pict} → data URL (PNG/JPEG) hoặc null (WMF/EMF trình duyệt không vẽ được) */
const pictSangDataUrl = (nhomPict: string): string | null => {
  const png = nhomPict.search(/\\pngblip/);
  if (png >= 0) {
    const b = trichHexPict(nhomPict, png);
    return b ? `data:image/png;base64,${base64TuBytes(b)}` : null;
  }
  const jpg = nhomPict.search(/\\jpegblip/);
  if (jpg >= 0) {
    const b = trichHexPict(nhomPict, jpg);
    return b ? `data:image/jpeg;base64,${base64TuBytes(b)}` : null;
  }
  return null;
};

/** Định dạng dữ liệu của nhóm ảnh — 'wmf'/'emf' (vector) và 'khong-co-anh' (hình vẽ không kèm ảnh) không dán được */
const dinhDangPict = (nhom: string): string => {
  if (/\\pngblip/.test(nhom)) return 'png';
  if (/\\jpegblip/.test(nhom)) return 'jpeg';
  if (/\\emfblip/.test(nhom)) return 'emf';
  if (/\\wmetafile/.test(nhom)) return 'wmf';
  return 'khong-co-anh';
};

/**
 * Duyệt RTF clipboard MỘT LƯỢT theo thứ tự tài liệu:
 * - {\object} công thức (Equation/MathType) → giải mã MTEF từ ảnh WMF kết quả → LaTeX;
 * - {\*\shppict{\pict…}} → hình ảnh (Word luôn kèm bản PNG/JPEG tại đây) → data URL;
 * - {\nonshppict} là bản dự phòng metafile trùng lặp → bỏ qua;
 * Hai danh sách khớp 1-1 với các v:shape công thức / hình ảnh trong bản HTML.
 */
export function phanTichRtfClipboard(rtf: string): DuLieuRtfClipboard {
  const kq: DuLieuRtfClipboard = { dsCongThuc: [], dsAnh: [], dsDinhDangAnh: [], dsKichThuocCongThuc: [] };
  const themAnh = (nhom: string) => {
    kq.dsAnh.push(pictSangDataUrl(nhom));
    kq.dsDinhDangAnh.push(dinhDangPict(nhom));
  };
  if (!rtf) return kq;

  // '{\\shp' bắt cả {\shp...} lẫn {\shpgrp...} (nhóm hình vẽ = MỘT ảnh kết xuất,
  // khớp với một <v:group>/<v:rect>… bên HTML); các {\pict} bên trong được nhảy qua
  // '{\\*\\mmathPict' / '{\\mmathPict': ảnh dự phòng của công thức OMML (Word equation) —
  // bên HTML công thức OMML không sinh điểm ảnh, nên phải nhảy qua; nếu không mỗi công thức
  // đẩy thêm 1 phần tử vào dsAnh → ảnh thật nhận nhầm dữ liệu (ảnh công thức / null)
  // '{\\*\\background' (nền trang — là một {\shp} KHÔNG có ảnh) và '{\\*\\listpicture' (ảnh bullet)
  // cũng không có điểm ảnh bên HTML: không nhảy qua thì chúng chiếm chỗ đầu hàng đợi, ảnh thật
  // đầu tiên nhận null → báo "không dán trực tiếp được" dù RTF có đủ dữ liệu PNG/JPEG
  const CAC_MOC = [
    '{\\*\\background', '{\\*\\listpicture', '{\\object', '{\\*\\mmathPict', '{\\mmathPict', '{\\*\\shppict', '{\\nonshppict', '{\\shp', '{\\pict',
  ] as const;
  let viTri = 0;
  for (;;) {
    let iMoc = -1;
    let loaiMoc = '';
    for (const moc of CAC_MOC) {
      const i = rtf.indexOf(moc, viTri);
      if (i >= 0 && (iMoc < 0 || i < iMoc)) { iMoc = i; loaiMoc = moc; }
    }
    if (iMoc < 0) break;
    const iDong = timDongNhom(rtf, iMoc);
    if (iDong < 0) break;
    const nhom = rtf.slice(iMoc, iDong + 1);
    viTri = iDong + 1;

    if (loaiMoc === '{\\*\\mmathPict' || loaiMoc === '{\\mmathPict') {
      continue; // ảnh dự phòng của công thức OMML — công thức đã lấy từ OMML bên HTML
    }
    if (loaiMoc === '{\\*\\background' || loaiMoc === '{\\*\\listpicture') {
      continue; // nền trang / ảnh bullet — không có điểm ảnh bên HTML
    }
    if (loaiMoc === '{\\object') {
      const khopClass = /\\objclass\s+([^{}\\]+)/.exec(nhom);
      const laCongThuc = !khopClass || /equation|mathtype/i.test(khopClass[1]);
      if (laCongThuc) {
        // lần lượt thử các nguồn MTEF: ảnh kết quả WMF → ảnh kết quả EMF (MathType 7 /
        // Office 365) → đối tượng OLE gốc \objdata (luồng "Equation Native" — nguồn duy nhất
        // của Microsoft Equation 3.0, và dự phòng khi ảnh kết quả không mang MTEF)
        const iWmf = nhom.search(/\\wmetafile\d*/);
        const iEmf = nhom.search(/\\emfblip/);
        const wmf = iWmf >= 0 ? trichHexPict(nhom, iWmf) : null;
        const emf = iEmf >= 0 ? trichHexPict(nhom, iEmf) : null;
        const hexOle = /\{\\\*\\objdata\s*([0-9a-fA-F\s]+)\}/.exec(nhom)?.[1];
        const ole = hexOle ? hexSangBytes(hexOle) : null;
        const dsMtef = [
          wmf ? trichMtefTuWmf(wmf) : null,
          emf ? trichMtefTuEmf(emf) : null,
          ole ? trichMtefTuOle(ole) : null,
        ].filter((m): m is Uint8Array => !!m);
        // ưu tiên kết quả trọn vẹn (không ô "?"); không có thì lấy kết quả một phần đầu tiên
        let tot: KetQuaMtef | null = null;
        for (const mtef of dsMtef) {
          const kqMtef = mtefSangLatexChiTiet(mtef);
          if (!kqMtef.latex) continue;
          if (!kqMtef.motPhan && !kqMtef.kyTuLa.length) { tot = kqMtef; break; }
          tot ??= kqMtef;
        }
        const latex = tot?.latex ?? null;
        if ((!latex || tot?.motPhan || tot?.kyTuLa.length) && import.meta.env.DEV) {
          // chẩn đoán công thức MathType chưa giải mã trọn vẹn (chỉ ở dev) — gửi mtefHex để bổ sung
          console.warn(`[OEditor] công thức OLE ${latex ? 'giải mã chưa trọn vẹn' : 'không giải mã được'}`, {
            thuTu: kq.dsCongThuc.length + 1,
            objclass: khopClass?.[1]?.trim(),
            coWmf: !!wmf,
            coEmf: !!emf,
            coObjdata: !!ole,
            soNguonMtef: dsMtef.length,
            latex,
            kyTuLa: tot?.kyTuLa,
            mtefHex: dsMtef[0] ? Array.from(dsMtef[0], (b) => b.toString(16).padStart(2, '0')).join('') : null,
          });
        }
        kq.dsCongThuc.push(latex);
        kq.dsKichThuocCongThuc.push(kichThuocObject(nhom));
      } else {
        // object khác (chart, ảnh OLE…) — phía HTML sẽ hiện như hình ảnh
        themAnh(nhom);
      }
    } else if (loaiMoc === '{\\*\\shppict' || loaiMoc === '{\\shp') {
      // shppict: ảnh thường (Word luôn kèm PNG/JPEG) · shp: hình VẼ (Shapes/Drawing) —
      // lấy ảnh kết xuất trong {\shprslt{\pict…}} nếu có (không có → null → chip cảnh báo)
      themAnh(nhom);
    } else if (loaiMoc === '{\\nonshppict') {
      // bản dự phòng metafile của shppict ngay trước — nếu shppict không cho ảnh
      // (VD emfblip) thử vớt từ bản này; không thì bỏ qua để khỏi trùng
      if (kq.dsAnh.length && kq.dsAnh[kq.dsAnh.length - 1] === null) {
        const vot = pictSangDataUrl(nhom);
        if (vot) {
          kq.dsAnh[kq.dsAnh.length - 1] = vot;
          kq.dsDinhDangAnh[kq.dsDinhDangAnh.length - 1] = dinhDangPict(nhom);
        }
      }
    } else {
      // {\pict trần (không nằm trong shppict/nonshppict/object)
      themAnh(nhom);
    }
  }
  return kq;
}
