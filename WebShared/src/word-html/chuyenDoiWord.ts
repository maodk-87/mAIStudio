/**
 * Pipeline xử lý HTML dán từ Word/nguồn ngoài (ADR-09 — docs/07):
 * 1. "Mở comment" điều kiện `[if gte msEquation 12]` để lộ công thức OMML gốc.
 * 2. OMML → LaTeX (ommlSangLatex) → thẻ <span data-cong-thuc="…">.
 * 3. MathML (<math>) → LaTeX (thư viện mathml-to-latex) — trường hợp MathType
 *    được cấu hình copy MathML, hoặc dán từ web/công cụ khác.
 * 4. Ảnh nội bộ file:// của Word (không truy cập được từ trình duyệt) → chip cảnh báo,
 *    KHÔNG lặng lẽ mất nội dung.
 * 5. Làm sạch bằng DOMPurify: giữ định dạng cơ bản (đậm/nghiêng/bảng/danh sách/chỉ số
 *    trên–dưới/ảnh), loại bỏ style/class rác của Word.
 */
import DOMPurify from 'dompurify';
import { MathMLToLaTeX } from 'mathml-to-latex';
import { DAU_CHUA_NHAN_DIEN } from '../mathtype';
import { ommlSangLatex } from './ommlSangLatex';

export interface KetQuaChuyenDoi {
  html: string;
  /** Số công thức chuyển đổi thành công (OMML + MathML) */
  soCongThuc: number;
  /** Số công thức MathType dạng OLE — clipboard không có dữ liệu gốc, đã thay bằng Ô CÔNG THỨC TRỐNG (bấm để nhập lại) */
  soCongThucOle: number;
  /** Số hình ảnh dán thành công (lấy dữ liệu PNG/JPEG gốc từ bản RTF của clipboard) */
  soAnhDan: number;
  /** Số ảnh/đối tượng không chuyển được */
  soKhongChuyenDuoc: number;
  /** Trong đó: số ảnh VECTOR / hình vẽ Word (WMF, EMF, Shapes) — clipboard không có bản PNG/JPEG để dán */
  soAnhVector: number;
  /** Số công thức MathType chỉ giải mã được một phần / có ký hiệu lạ — có ô "?" cần kiểm tra */
  soCongThucChuaTron: number;
  /** Có phải nội dung dán từ Word không (nhận diện qua markup đặc trưng) */
  tuWord: boolean;
}

const taoSpanCongThuc = (doc: Document, latex: string): HTMLElement => {
  const span = doc.createElement('span');
  span.setAttribute('data-cong-thuc', latex);
  span.textContent = latex;
  return span;
};

// dùng thẻ <code> để dấu hiệu cảnh báo sống sót qua schema của editor (span trần bị lột thẻ)
const taoChipCanhBao = (doc: Document, noiDung: string): HTMLElement => {
  const code = doc.createElement('code');
  code.setAttribute('data-khong-chuyen', '1');
  code.textContent = noiDung;
  return code;
};

/** Bước 1: tiền xử lý chuỗi — lộ OMML khỏi comment điều kiện, dọn token downlevel */
const tienXuLy = (html: string): string =>
  html
    // lộ công thức OMML: <!--[if gte msEquation 12]> … <![endif]-->
    .replace(/<!--\[if gte msEquation \d+\]>([\s\S]*?)<!\[endif\]-->/gi, '$1')
    // thẻ OMML tự đóng (<m:begChr m:val="["/>): parser text/html không hiểu "/>" với thẻ lạ
    // → các thẻ phía sau thành con của nó (ngoặc, loại phân số… bị đọc sai) — mở thành cặp thẻ
    .replace(/<(m:[a-z]+)\b([^<>]*?)\s*\/>/gi, '<$1$2></$1>')
    // bỏ khối fallback ảnh của công thức (ảnh file:// không dùng được)
    .replace(/<!\[if !msEquation\]>[\s\S]*?<!\[endif\]>/gi, '')
    // các token điều kiện còn lại (VD quanh ảnh VML) — bỏ token, giữ nội dung
    .replace(/<!\[(?:if [^\]]*|endif)\]>/gi, '');

type KichThuoc = { rong: number; cao: number };

/**
 * Kích thước HIỂN THỊ (px) Word đặt trong style của v:shape (pt/px/cm…) hoặc width/height
 * của <img> — dùng để chèn ảnh đúng cỡ và để ghép công thức OLE HTML ↔ RTF.
 */
function kichThuocHienThiPx(el: Element): KichThuoc | null {
  const sangPx = (giaTri: number, donVi: string): number => {
    if (donVi === 'pt') return (giaTri * 96) / 72;
    if (donVi === 'in') return giaTri * 96;
    if (donVi === 'cm') return (giaTri * 96) / 2.54;
    if (donVi === 'mm') return (giaTri * 96) / 25.4;
    return giaTri; // px
  };
  const style = el.getAttribute('style') ?? '';
  const khopRong = /(?:^|[^-])width:\s*([\d.]+)(pt|px|in|cm|mm)/i.exec(style);
  const khopCao = /(?:^|[^-])height:\s*([\d.]+)(pt|px|in|cm|mm)/i.exec(style);
  if (khopRong && khopCao) {
    return {
      rong: sangPx(parseFloat(khopRong[1]), khopRong[2].toLowerCase()),
      cao: sangPx(parseFloat(khopCao[1]), khopCao[2].toLowerCase()),
    };
  }
  const rongAttr = parseFloat(el.getAttribute('width') ?? '');
  const caoAttr = parseFloat(el.getAttribute('height') ?? '');
  if (rongAttr > 0 && caoAttr > 0) return { rong: rongAttr, cao: caoAttr };
  return null;
}

/**
 * Ghép n công thức OLE bên HTML với m công thức bên RTF của clipboard.
 * n = m → theo thứ tự (Word giữ thứ tự tài liệu ở cả hai bản). Lệch → căn dãy bằng quy hoạch
 * động (kiểu edit distance): chi phí ghép = độ lệch kích thước tương đối (rộng + cao), bỏ qua
 * một phần tử = 0,6 → cặp lệch kích thước quá nhiều bị bỏ qua thay vì ghép nhầm công thức.
 * @returns chiSo[i] = chỉ số RTF ghép với công thức HTML thứ i (null = không có → ô trống)
 */
export function ghepCongThucOle(
  html: (KichThuoc | null)[],
  rtf: (KichThuoc | null)[] | undefined,
  m: number,
): (number | null)[] {
  const n = html.length;
  if (n === m) return html.map((_, i) => i);
  if (!m) return html.map(() => null);
  const BO_QUA = 0.6;
  const lech = (x: number, y: number) => Math.abs(x - y) / Math.max(x, y, 1);
  const chiPhi = (i: number, j: number): number => {
    const a = html[i];
    const b = rtf?.[j];
    return a && b ? lech(a.rong, b.rong) + lech(a.cao, b.cao) : 0.3; // thiếu kích thước: ghép dè dặt
  };
  const dp = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => 0));
  for (let i = 1; i <= n; i++) dp[i][0] = i * BO_QUA;
  for (let j = 1; j <= m; j++) dp[0][j] = j * BO_QUA;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(dp[i - 1][j - 1] + chiPhi(i - 1, j - 1), dp[i - 1][j] + BO_QUA, dp[i][j - 1] + BO_QUA);
    }
  }
  const kq: (number | null)[] = html.map(() => null);
  for (let i = n, j = m; i > 0 && j > 0; ) {
    if (dp[i][j] === dp[i - 1][j - 1] + chiPhi(i - 1, j - 1)) {
      kq[i - 1] = j - 1;
      i -= 1;
      j -= 1;
    } else if (dp[i][j] === dp[i - 1][j] + BO_QUA) i -= 1;
    else j -= 1;
  }
  return kq;
}

/**
 * @param tuRtf dữ liệu giải mã từ bản RTF của clipboard (rtfMtef.ts): LaTeX + kích thước của
 *   từng công thức MathType OLE (ghép với HTML — ghepCongThucOle), dữ liệu ảnh gốc theo thứ tự.
 */
export function chuyenDoiHtmlDan(
  htmlGoc: string,
  tuRtf?: {
    dsCongThuc?: (string | null)[];
    dsAnh?: (string | null)[];
    dsDinhDangAnh?: string[];
    dsKichThuocCongThuc?: (KichThuoc | null)[];
  },
): KetQuaChuyenDoi {
  const dsLatexOle = tuRtf?.dsCongThuc;
  const tuWord =
    /urn:schemas-microsoft-com|class="?Mso|<w:WordDocument|<m:oMath|msEquation/i.test(htmlGoc);

  const doc = new DOMParser().parseFromString(tienXuLy(htmlGoc), 'text/html');
  let soCongThuc = 0;
  let soCongThucOle = 0;
  let soAnhDan = 0;
  let soKhongChuyenDuoc = 0;
  let soAnhVector = 0;
  let soCongThucChuaTron = 0;

  // ===== OMML → LaTeX =====
  // (parser text/html giữ nguyên tên thẻ "m:omath" trong localName)
  const dsOmath = Array.from(doc.body.querySelectorAll('*')).filter((el) => {
    const ten = el.localName.toLowerCase();
    return ten === 'm:omath' || ten === 'omath';
  });
  for (const oMath of dsOmath) {
    // bỏ oMath lồng trong oMath khác (đã xử lý qua cha)
    if (dsOmath.some((khac) => khac !== oMath && khac.contains(oMath))) continue;
    const latex = ommlSangLatex(oMath);
    if (latex) {
      oMath.replaceWith(taoSpanCongThuc(doc, latex));
      soCongThuc += 1;
    } else {
      oMath.replaceWith(taoChipCanhBao(doc, '[Công thức không đọc được — chèn lại bằng nút Σ]'));
      soKhongChuyenDuoc += 1;
    }
  }

  // ===== MathML → LaTeX =====
  for (const math of Array.from(doc.body.querySelectorAll('math'))) {
    try {
      const latex = MathMLToLaTeX.convert(math.outerHTML).trim();
      if (latex) {
        math.replaceWith(taoSpanCongThuc(doc, latex));
        soCongThuc += 1;
        continue;
      }
    } catch {
      // rơi xuống nhánh cảnh báo
    }
    const textGoc = (math.textContent ?? '').trim();
    math.replaceWith(
      textGoc ? doc.createTextNode(textGoc) : taoChipCanhBao(doc, '[Công thức không đọc được]'),
    );
    if (!textGoc) soKhongChuyenDuoc += 1;
  }

  // ===== Đối tượng OLE/VML (công thức MathType nhúng, WordArt…) =====
  // MathType cũ là OLE object: Word có thể đưa vào clipboard dạng <v:shape>/<v:imagedata>
  // hoặc <o:OLEObject>/<object>/<embed> mà KHÔNG có <img> fallback — nếu không xử lý
  // sẽ bị lột thẻ và mất lặng lẽ.
  // <o:OLEObject> là metadata đi kèm <v:shape>: ghi nhận ShapeID của các object
  // CÔNG THỨC (ProgID Equation.*) để phân biệt với v:shape là HÌNH ẢNH thường.
  // Đọc từ CHUỖI GỐC (regex) vì Word thường đặt OLEObject trong comment điều kiện
  // `[if gte mso 9]` — DOM sau parse không nhìn thấy.
  const shapeIdCongThuc = new Set<string>();
  let coOleObject = false;
  for (const khop of htmlGoc.matchAll(/<o:OLEObject\b[^>]*>/gi)) {
    coOleObject = true;
    const the = khop[0];
    const progId = /ProgID\s*=\s*"?([^"\s>]+)/i.exec(the)?.[1] ?? '';
    const shapeId = /ShapeID\s*=\s*"?([^"\s>]+)/i.exec(the)?.[1] ?? '';
    if (/equation|mathtype/i.test(progId) && shapeId) shapeIdCongThuc.add(shapeId);
  }
  // xóa các OLEObject còn sót trong DOM (biến thể không nằm trong comment)
  for (const meta of Array.from(doc.body.querySelectorAll('*'))) {
    const ten = meta.localName.toLowerCase();
    if (ten === 'o:oleobject' || ten === 'oleobject') meta.remove();
  }
  // ảnh fallback <img v:shapes="…"> của công thức MathType: v:shape gốc nằm trong comment
  // `[if gte vml 1]` nên DOM chỉ thấy <img file://> — không nhận ra thì nó bị coi là HÌNH ẢNH,
  // vừa mất công thức vừa làm lệch hàng đợi ảnh (ảnh thật nhận nhầm dữ liệu của ảnh khác)
  const laAnhFallbackCongThuc = (el: Element): boolean => {
    if (el.localName.toLowerCase() !== 'img') return false;
    const id = el.getAttribute('v:shapes') ?? '';
    // v:shape gốc cũng có mặt trong DOM → nó đã đại diện công thức, ảnh này chỉ là bản trùng
    return shapeIdCongThuc.has(id) && !doc.getElementById(id);
  };
  const dsShape = Array.from(doc.body.querySelectorAll('*')).filter((el) => {
    const ten = el.localName.toLowerCase();
    return (
      ten === 'v:shape' || ten === 'shape' ||
      ten === 'v:imagedata' || ten === 'imagedata' ||
      ten === 'object' || ten === 'embed' ||
      laAnhFallbackCongThuc(el)
    );
  });
  // shape là công thức khi có OLEObject Equation trỏ tới. Clipboard KHÔNG có thông tin OLEObject
  // (biến thể Word cũ, hoặc tài liệu chỉ có HÌNH): trước đây coi mọi shape là ứng viên công thức →
  // ảnh thường (<v:shape id="Picture_x0020_1">) bị thay bằng ô công thức trống, MẤT ẢNH khi dán.
  // Nay chỉ coi là công thức khi bản RTF có công thức (hoặc không có RTF để đối chiếu) VÀ mã shape
  // có dạng mã đối tượng OLE nội tuyến của Word (`_x0000_i1025`); hình ảnh (Picture_…, Hình_…) đi nhánh ảnh.
  const rtfCoCongThuc = !tuRtf || (dsLatexOle?.length ?? 0) > 0;
  const MA_SHAPE_OLE = /^_x0000_[is]\d+$/i;
  const maShape = (el: Element): string =>
    el.getAttribute('id') || el.getAttribute('v:shapes') || el.closest('[id]')?.getAttribute('id') || '';
  const laShapeCongThuc = (el: Element): boolean => {
    if (!coOleObject) {
      const ten = el.localName.toLowerCase();
      if (!rtfCoCongThuc) return false;
      if (ten === 'object' || ten === 'embed') return true;
      return MA_SHAPE_OLE.test(maShape(el));
    }
    if (laAnhFallbackCongThuc(el)) return true;
    const id = el.getAttribute('id') ?? '';
    if (shapeIdCongThuc.has(id)) return true;
    // v:imagedata nằm trong v:shape cha
    const cha = el.closest('[id]');
    return !!cha && shapeIdCongThuc.has(cha.getAttribute('id') ?? '');
  };
  const dsOle = dsShape.filter(laShapeCongThuc);

  /**
   * Phần tử bị ẨN trong Word (text ẩn, ảnh ẩn): display:none / visibility:hidden /
   * mso-hide:all trên chính nó hoặc cha. Phải phát hiện TRƯỚC khi lột style —
   * không thì nội dung ẩn "lộ" ra sau khi dán.
   */
  const AN_RE = /display\s*:\s*none|visibility\s*:\s*hidden|mso-hide\s*:\s*all/i;
  const biAn = (el: Element): boolean => {
    for (let nut: Element | null = el; nut && nut !== doc.body; nut = nut.parentElement) {
      if (AN_RE.test(nut.getAttribute('style') ?? '')) return true;
    }
    return false;
  };

  // công thức OLE cấp ngoài cùng (v:imagedata nằm trong v:shape đã tính qua cha)
  const cacOle = dsOle.filter((ole) => !dsOle.some((khac) => khac !== ole && khac.contains(ole)));
  // ghép công thức HTML ↔ RTF: số lượng bằng nhau → theo thứ tự; lệch (công thức trong
  // textbox/header, đối tượng chỉ có ở một phía…) → ghép theo KÍCH THƯỚC hiển thị
  const kichThuocHtml = cacOle.map(
    (ole) => kichThuocHienThiPx(ole) ?? (ole.parentElement ? kichThuocHienThiPx(ole.parentElement) : null),
  );
  const chiSoRtf = ghepCongThucOle(kichThuocHtml, tuRtf?.dsKichThuocCongThuc, dsLatexOle?.length ?? 0);
  if (import.meta.env.DEV && cacOle.length) {
    // chẩn đoán khớp công thức OLE: HTML ↔ RTF của clipboard (chỉ ở dev)
    console.warn('[OEditor] khớp công thức OLE', {
      coRtf: !!tuRtf,
      soOleTrongHtml: cacOle.length,
      soCongThucTrongRtf: dsLatexOle?.length ?? 0,
      cachGhep: cacOle.length === (dsLatexOle?.length ?? 0) ? 'theo thứ tự' : 'theo kích thước',
      chiSoRtf,
      latexTuRtf: dsLatexOle,
      cacDiemHtml: cacOle.map((el) => `${el.localName}#${el.getAttribute('id') ?? el.getAttribute('v:shapes') ?? ''}`),
    });
  }

  cacOle.forEach((ole, i) => {
    const j = chiSoRtf[i];
    const latexTuMtef = j != null ? (dsLatexOle?.[j] ?? null) : null;
    if (biAn(ole)) {
      ole.remove(); // công thức ẩn trong Word: không chèn
      return;
    }
    if (latexTuMtef) {
      // giải mã được MTEF từ RTF → công thức sống luôn
      ole.replaceWith(taoSpanCongThuc(doc, latexTuMtef));
      soCongThuc += 1;
      if (latexTuMtef.includes(DAU_CHUA_NHAN_DIEN)) soCongThucChuaTron += 1;
    } else {
      // thay bằng Ô CÔNG THỨC TRỐNG (latex rỗng) — trong editor bấm vào là mở bảng nhập MathLive
      ole.replaceWith(taoSpanCongThuc(doc, ''));
      soCongThucOle += 1;
    }
  });

  // ===== Hình ảnh: v:shape ảnh thường + <img> file:// cục bộ, theo THỨ TỰ tài liệu =====
  // Bản RTF của clipboard chứa dữ liệu ảnh gốc (PNG/JPEG) — khớp hàng đợi theo thứ tự
  // để dán ảnh THẬT (data URL); thiếu dữ liệu thì mới rơi về chip cảnh báo.
  const hangDoiAnh = tuRtf?.dsAnh ?? null;
  let iAnhRtf = 0;
  const dsAnhLoi: { diem: string; dinhDangRtf: string }[] = [];
  // gồm cả các HÌNH VẼ Word Shapes/Drawing (v:rect, v:oval, v:group, v:line…) —
  // Word kèm ảnh kết xuất trong RTF ({\shp{\shprslt{\pict}}}) nên xử lý như ảnh
  const TEN_VML_VE = new Set([
    'v:rect', 'v:roundrect', 'roundrect', 'v:oval', 'oval', 'v:line', 'v:polyline',
    'polyline', 'v:curve', 'curve', 'v:arc', 'arc', 'v:group', 'v:image',
  ]);
  const cacDiemAnh = Array.from(doc.body.querySelectorAll('*')).filter((el) => {
    const ten = el.localName.toLowerCase();
    if (
      ten === 'v:shape' || ten === 'shape' ||
      ten === 'v:imagedata' || ten === 'imagedata' ||
      ten === 'object' || ten === 'embed' ||
      TEN_VML_VE.has(ten)
    ) {
      return el.isConnected; // shape công thức đã bị thay ở trên
    }
    if (ten === 'img') {
      const src = el.getAttribute('src') ?? '';
      return !src || /^file:/i.test(src);
    }
    return false;
  });
  // Ảnh NỔI (Word "Wrap text" khác In line: v:shape có style position:absolute): Word đặt điểm ảnh ở
  // NEO — thường là đầu đoạn (trước "Câu 1. …") hoặc đầu dòng phương án, không phải chỗ ảnh hiện trên trang.
  // Dán nguyên chỗ đó thì ảnh chen trước số câu / dính vào phương án → đưa ảnh thành khối riêng ngay SAU
  // đoạn neo (đề bài → ảnh → phương án), đánh dấu data-anh-noi để bộ bóc tách biết đây là ảnh minh họa
  // của đề. VML nằm trong comment `[if gte vml 1]` nên đọc từ CHUỖI GỐC.
  const maShapeNoi = new Set<string>();
  for (const khop of htmlGoc.matchAll(/<v:(?:shape|rect|roundrect|oval|line|polyline|curve|arc|group|image)\b[^>]*>/gi)) {
    const the = khop[0];
    if (!/position\s*:\s*absolute/i.test(the)) continue;
    const id = /\sid=["']?([^"'\s>]+)/i.exec(the)?.[1];
    if (id) maShapeNoi.add(id);
  }
  const THE_KHOI_NEO = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote']);
  const THE_O = new Set(['td', 'th']);
  /** Đưa phần tử thay thế ảnh nổi ra khỏi dòng chữ: khối riêng sau đoạn neo (trong ô bảng thì cuối ô) */
  const datAnhNoi = (diem: Element, thayThe: Element): void => {
    let khoi: Element | null = diem.parentElement;
    while (khoi && khoi !== doc.body && !THE_KHOI_NEO.has(khoi.localName) && !THE_O.has(khoi.localName)) {
      khoi = khoi.parentElement;
    }
    const p = doc.createElement('p');
    p.appendChild(thayThe);
    if (!khoi || khoi === doc.body) diem.replaceWith(p);
    else if (THE_O.has(khoi.localName)) {
      diem.remove();
      khoi.appendChild(p);
    } else {
      diem.remove();
      khoi.after(p);
    }
  };
  for (const diem of cacDiemAnh) {
    if (!diem.isConnected) continue;
    if (cacDiemAnh.some((khac) => khac !== diem && khac.isConnected && khac.contains(diem))) continue;
    const dinhDangRtf = !hangDoiAnh
      ? 'khong-co-rtf'
      : iAnhRtf < hangDoiAnh.length ? (tuRtf?.dsDinhDangAnh?.[iAnhRtf] ?? '?') : 'het-anh-trong-rtf';
    const dataUrl = hangDoiAnh?.[iAnhRtf] ?? null;
    iAnhRtf += 1;
    if (biAn(diem)) {
      // ảnh ẩn: tiêu thụ hàng đợi để giữ khớp thứ tự, nhưng không chèn gì
      diem.remove();
      continue;
    }
    const laAnhNoi =
      maShapeNoi.has(maShape(diem)) || /position\s*:\s*absolute/i.test(diem.getAttribute('style') ?? '');
    if (dataUrl) {
      const img = doc.createElement('img');
      img.setAttribute('src', dataUrl);
      const kichThuoc = kichThuocHienThiPx(diem);
      if (kichThuoc) {
        img.setAttribute('width', String(Math.round(kichThuoc.rong)));
        img.setAttribute('height', String(Math.round(kichThuoc.cao)));
      }
      if (laAnhNoi) {
        img.setAttribute('data-anh-noi', '1');
        datAnhNoi(diem, img);
      } else diem.replaceWith(img);
      soAnhDan += 1;
    } else {
      const chip = taoChipCanhBao(doc, '[Ảnh từ Word không dán trực tiếp được — hãy chèn lại bằng nút Ảnh]');
      if (laAnhNoi) datAnhNoi(diem, chip);
      else diem.replaceWith(chip);
      soKhongChuyenDuoc += 1;
      if (dinhDangRtf === 'wmf' || dinhDangRtf === 'emf' || dinhDangRtf === 'khong-co-anh') soAnhVector += 1;
      dsAnhLoi.push({ diem: `${diem.localName}#${maShape(diem)}`, dinhDangRtf });
    }
  }
  if (import.meta.env.DEV && dsAnhLoi.length) {
    // chẩn đoán ảnh không dán được: điểm ảnh bên HTML ↔ dữ liệu ảnh bên RTF của clipboard (chỉ ở dev)
    console.warn('[OEditor] ảnh từ Word không dán được', {
      coRtf: !!tuRtf,
      soDiemAnhTrongHtml: cacDiemAnh.length,
      soAnhTrongRtf: hangDoiAnh?.length ?? 0,
      dinhDangAnhTrongRtf: tuRtf?.dsDinhDangAnh,
      dsAnhLoi,
    });
  }

  // ===== Nội dung ẨN còn lại (text ẩn, đoạn ẩn) — xóa TRƯỚC khi lột style =====
  for (const an of Array.from(doc.body.querySelectorAll('[style]'))) {
    if (!an.isConnected) continue;
    if (AN_RE.test(an.getAttribute('style') ?? '')) an.remove();
  }

  // ===== Bỏ dòng trống ĐẦU/CUỐI nội dung dán (để không phải xóa tay) =====
  const laNutRong = (nut: Node): boolean => {
    if (nut.nodeType === Node.TEXT_NODE) {
      return !(nut.textContent ?? '').replace(/[\s ]/g, '');
    }
    if (nut.nodeType !== Node.ELEMENT_NODE) return true; // comment…
    const el = nut as Element;
    const ten = el.tagName.toLowerCase();
    if (ten === 'br') return true;
    // khối chứa ảnh/công thức/bảng thì KHÔNG rỗng dù không có chữ
    if (ten === 'img' || el.querySelector('img, [data-cong-thuc], table, code')) return false;
    return !(el.textContent ?? '').replace(/[\s ]/g, '');
  };
  while (doc.body.firstChild && laNutRong(doc.body.firstChild)) {
    (doc.body.firstChild as ChildNode).remove();
  }
  while (doc.body.lastChild && laNutRong(doc.body.lastChild)) {
    (doc.body.lastChild as ChildNode).remove();
  }
  // <br>/khoảng trắng thừa ngay đầu khối đầu tiên và cuối khối cuối cùng
  const khoiDau = doc.body.firstElementChild;
  while (khoiDau?.firstChild && laNutRong(khoiDau.firstChild)) {
    (khoiDau.firstChild as ChildNode).remove();
  }
  const khoiCuoi = doc.body.lastElementChild;
  while (khoiCuoi?.lastChild && laNutRong(khoiCuoi.lastChild)) {
    (khoiCuoi.lastChild as ChildNode).remove();
  }

  const html = lamSachHtml(doc.body);
  return {
    html, soCongThuc, soCongThucOle, soAnhDan, soKhongChuyenDuoc, soAnhVector, soCongThucChuaTron, tuWord,
  };
}

/**
 * Đậm/nghiêng/gạch chân/chỉ số biểu diễn bằng inline style (docx-preview, một số
 * trình duyệt/Word) → thẻ ngữ nghĩa <b>/<i>/<u>/<sup>/<sub>, để giữ được sau khi lọc
 * bỏ style. Gạch chân còn là tín hiệu đáp án đúng khi bóc tách câu hỏi.
 */
export function chuyenStyleSangThe(goc: HTMLElement): void {
  const doc = goc.ownerDocument;
  for (const el of Array.from(goc.querySelectorAll<HTMLElement>('span[style], font[style]'))) {
    const s = el.style;
    const bocThe: string[] = [];
    if (s.fontWeight === 'bold' || Number(s.fontWeight) >= 600) bocThe.push('b');
    if (s.fontStyle === 'italic') bocThe.push('i');
    if (/underline/.test(`${s.textDecoration} ${s.textDecorationLine}`)) bocThe.push('u');
    if (/line-through/.test(`${s.textDecoration} ${s.textDecorationLine}`)) bocThe.push('s');
    if (s.verticalAlign === 'super') bocThe.push('sup');
    if (s.verticalAlign === 'sub') bocThe.push('sub');
    for (const ten of bocThe) {
      const the = doc.createElement(ten);
      while (el.firstChild) the.appendChild(el.firstChild);
      el.appendChild(the);
    }
  }
}

/**
 * Làm sạch HTML nguồn Word (dán hoặc import tệp — CÙNG một cấu hình để hai đường vào
 * cho ra HTML giống nhau): giữ định dạng cơ bản, công thức, ảnh, bảng; bỏ style/class rác.
 */
export function lamSachHtml(goc: HTMLElement): string {
  chuyenStyleSangThe(goc);
  // kích thước ảnh ghi bằng style (docx-preview: pt) → thuộc tính width/height (style bị lọc bỏ)
  const sangPx: Record<string, number> = { pt: 96 / 72, px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 };
  for (const img of Array.from(goc.querySelectorAll<HTMLImageElement>('img[style]'))) {
    for (const chieu of ['width', 'height'] as const) {
      const khop = /^([\d.]+)(pt|px|in|cm|mm)$/.exec(img.style[chieu]);
      if (khop && !img.getAttribute(chieu)) {
        img.setAttribute(chieu, String(Math.round(parseFloat(khop[1]) * sangPx[khop[2]])));
      }
    }
  }
  // ký tự vô hình MathType/Word hay chèn cạnh công thức (zero-width space, BOM)
  const duyet = goc.ownerDocument.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
  for (let nut = duyet.nextNode(); nut; nut = duyet.nextNode()) {
    if (/[​﻿]/.test(nut.nodeValue ?? '')) nut.nodeValue = (nut.nodeValue ?? '').replace(/[​﻿]/g, '');
  }
  return DOMPurify.sanitize(goc.innerHTML, {
    ALLOWED_TAGS: [
      'p', 'div', 'br', 'span', 'a',
      'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'code', 'pre',
      'ul', 'ol', 'li', 'blockquote', 'hr',
      'h1', 'h2', 'h3', 'h4',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
      'img',
    ],
    ALLOWED_ATTR: [
      'data-cong-thuc', 'data-khong-chuyen', 'data-anh-noi', 'src', 'alt', 'width', 'height',
      'colspan', 'rowspan', 'href',
    ],
  });
}
