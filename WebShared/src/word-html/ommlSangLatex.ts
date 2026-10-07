/**
 * Chuyển công thức OMML (Office Math Markup Language — định dạng công thức của Word)
 * sang LaTeX để render bằng KaTeX / sửa bằng MathLive.
 *
 * OMML xuất hiện trong clipboard HTML của Word dưới dạng thẻ <m:oMath>
 * (nằm trong comment điều kiện `[if gte msEquation 12]` — đã được "mở comment"
 * ở bước tiền xử lý tại chuyenDoiWord.ts).
 *
 * Phủ các cấu trúc phổ biến: phân số, chỉ số trên/dưới, căn, tổng/tích/tích phân,
 * ngoặc, hàm, giới hạn, dấu mũ/vector, ma trận, hệ phương trình…
 * Cấu trúc không nhận diện được thì lấy phần text bên trong (không bao giờ mất nội dung).
 */

/** Bỏ tiền tố namespace: "m:omath" | "omath" → "omath" */
const tenThe = (el: Element): string => {
  const ten = el.localName.toLowerCase();
  const viTri = ten.indexOf(':');
  return viTri >= 0 ? ten.slice(viTri + 1) : ten;
};

const cacConElement = (el: Element): Element[] => Array.from(el.children);

const timCon = (el: Element, ten: string): Element | undefined =>
  cacConElement(el).find((c) => tenThe(c) === ten);

const timCacCon = (el: Element, ten: string): Element[] =>
  cacConElement(el).filter((c) => tenThe(c) === ten);

/** Đọc thuộc tính m:val (chấp nhận cả có/không tiền tố namespace) */
const layVal = (el: Element | undefined): string | undefined => {
  if (!el) return undefined;
  return el.getAttribute('m:val') ?? el.getAttribute('val') ?? undefined;
};

/** Ký tự toán tử n-ary → lệnh LaTeX */
const BANG_NARY: Record<string, string> = {
  '∑': '\\sum',
  '∏': '\\prod',
  '∐': '\\coprod',
  '∫': '\\int',
  '∬': '\\iint',
  '∭': '\\iiint',
  '∮': '\\oint',
  '⋃': '\\bigcup',
  '⋂': '\\bigcap',
  '⋁': '\\bigvee',
  '⋀': '\\bigwedge',
};

/** Ký tự ngoặc → dạng dùng sau \left / \right ('' = không có ngoặc) */
const BANG_NGOAC: Record<string, string> = {
  '(': '(',
  ')': ')',
  '[': '[',
  ']': ']',
  '{': '\\{',
  '}': '\\}',
  '|': '|',
  '‖': '\\Vert',
  '⟨': '\\langle',
  '⟩': '\\rangle',
  '⌊': '\\lfloor',
  '⌋': '\\rfloor',
  '⌈': '\\lceil',
  '⌉': '\\rceil',
  '': '.',
};

/** Dấu trên đầu (m:acc) → lệnh LaTeX */
const BANG_DAU: Record<string, string> = {
  '̂': '\\hat', // ̂
  '̌': '\\check', // ̌
  '̃': '\\tilde', // ̃
  '́': '\\acute', // ́
  '̀': '\\grave', // ̀
  '̄': '\\bar', // ̄
  '̅': '\\overline',
  '⃗': '\\vec', // ⃗
  '̇': '\\dot', // ̇
  '̈': '\\ddot', // ̈
  '̆': '\\breve', // ̆
};

const HAM_QUEN_THUOC = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth',
  'log', 'ln', 'lg', 'exp',
  'lim', 'max', 'min', 'sup', 'inf', 'det', 'gcd',
]);

/** Làm sạch + escape text trong run toán học */
const xuLyTextRun = (text: string): string =>
  text
    // ký tự điều khiển vô hình của Word (function application, invisible times…)
    .replace(/[⁡-⁤​﻿]/g, '')
    .replace(/ /g, ' ')
    .replace(/\\/g, '\\backslash ')
    .replace(/([%#&])/g, '\\$1')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');

/** Bọc ngoặc nhọn nếu chuỗi dài hơn 1 ký tự (giữ LaTeX gọn) */
const boc = (s: string): string => {
  const gon = s.trim();
  if (gon.length <= 1) return gon || '{}';
  return `{${gon}}`;
};

/**
 * Duyệt cả NÚT CHỮ lẫn phần tử con: trong clipboard HTML của Word, OMML bị xen các thẻ
 * định dạng (<i>, <span style="font-family:Cambria Math">…) và chữ nằm trực tiếp trong
 * <m:r> (không có <m:t> như trong tệp .docx) — chỉ duyệt phần tử con sẽ mất hết chữ,
 * công thức "y=f(x)" chỉ còn "\left(\right)".
 */
const chuyenCacCon = (el: Element): string =>
  Array.from(el.childNodes)
    .map((nut) => {
      if (nut.nodeType === Node.TEXT_NODE) return xuLyTextRun(nut.nodeValue ?? '');
      if (nut.nodeType === Node.ELEMENT_NODE) return chuyenPhanTu(nut as Element);
      return '';
    })
    .join('');

/** Chữ trong một run không có <m:t> (dạng HTML) — bỏ qua thẻ thuộc tính *Pr */
const vanBanRun = (el: Element): string =>
  Array.from(el.childNodes)
    .map((nut) => {
      if (nut.nodeType === Node.TEXT_NODE) return nut.nodeValue ?? '';
      if (nut.nodeType !== Node.ELEMENT_NODE) return '';
      return tenThe(nut as Element).endsWith('pr') ? '' : vanBanRun(nut as Element);
    })
    .join('');

/** Chuyển một phần tử OMML bất kỳ → LaTeX */
function chuyenPhanTu(el: Element): string {
  switch (tenThe(el)) {
    case 'omath':
    case 'omathpara':
    case 'e':
    case 'num':
    case 'den':
    case 'deg':
    case 'fname':
    case 'lim':
    case 'sub':
    case 'sup':
    case 'box':
    case 'borderbox':
    case 'phant':
    case 'smallfrac':
      return chuyenCacCon(el);

    case 'r': {
      // run văn bản; m:nor trong rPr = "normal text" → \text{}
      const rPr = timCon(el, 'rpr');
      const laVanBanThuong = rPr ? !!timCon(rPr, 'nor') : false;
      const dsT = timCacCon(el, 't');
      // .docx: chữ trong <m:t> · clipboard HTML của Word: chữ nằm thẳng trong <m:r>/<span>
      const text = dsT.length ? dsT.map((t) => t.textContent ?? '').join('') : vanBanRun(el);
      const daXuLy = xuLyTextRun(text);
      return laVanBanThuong ? `\\text{${daXuLy}}` : daXuLy;
    }

    case 't':
      return xuLyTextRun(el.textContent ?? '');

    case 'f': {
      // phân số
      const fPr = timCon(el, 'fpr');
      const kieu = layVal(fPr ? timCon(fPr, 'type') : undefined);
      const tu = chuyenCacCon(timCon(el, 'num') ?? el.ownerDocument.createElement('x'));
      const mau = chuyenCacCon(timCon(el, 'den') ?? el.ownerDocument.createElement('x'));
      if (kieu === 'noBar') return `\\binom{${tu}}{${mau}}`;
      if (kieu === 'lin' || kieu === 'skw') return `${boc(tu)}/${boc(mau)}`;
      return `\\frac{${tu}}{${mau}}`;
    }

    case 'ssup': {
      const e = timCon(el, 'e');
      const sup = timCon(el, 'sup');
      return `${boc(e ? chuyenCacCon(e) : '')}^{${sup ? chuyenCacCon(sup) : ''}}`;
    }

    case 'ssub': {
      const e = timCon(el, 'e');
      const sub = timCon(el, 'sub');
      return `${boc(e ? chuyenCacCon(e) : '')}_{${sub ? chuyenCacCon(sub) : ''}}`;
    }

    case 'ssubsup': {
      const e = timCon(el, 'e');
      const sub = timCon(el, 'sub');
      const sup = timCon(el, 'sup');
      return `${boc(e ? chuyenCacCon(e) : '')}_{${sub ? chuyenCacCon(sub) : ''}}^{${sup ? chuyenCacCon(sup) : ''}}`;
    }

    case 'spre': {
      // chỉ số đứng TRƯỚC (VD ₙCₖ)
      const e = timCon(el, 'e');
      const sub = timCon(el, 'sub');
      const sup = timCon(el, 'sup');
      return `{}_{${sub ? chuyenCacCon(sub) : ''}}^{${sup ? chuyenCacCon(sup) : ''}}${boc(e ? chuyenCacCon(e) : '')}`;
    }

    case 'rad': {
      // căn thức
      const radPr = timCon(el, 'radpr');
      const anBac = layVal(radPr ? timCon(radPr, 'deghide') : undefined);
      const bac = timCon(el, 'deg');
      const e = timCon(el, 'e');
      const ruot = e ? chuyenCacCon(e) : '';
      const bacText = bac ? chuyenCacCon(bac).trim() : '';
      if (anBac === '1' || anBac === 'on' || !bacText) return `\\sqrt{${ruot}}`;
      return `\\sqrt[${bacText}]{${ruot}}`;
    }

    case 'nary': {
      // tổng / tích / tích phân…
      const naryPr = timCon(el, 'narypr');
      const kyTu = layVal(naryPr ? timCon(naryPr, 'chr') : undefined) || '∫';
      const anDuoi = layVal(naryPr ? timCon(naryPr, 'subhide') : undefined);
      const anTren = layVal(naryPr ? timCon(naryPr, 'suphide') : undefined);
      const toanTu = BANG_NARY[kyTu] ?? `\\operatorname{${kyTu}}`;
      const sub = timCon(el, 'sub');
      const sup = timCon(el, 'sup');
      const e = timCon(el, 'e');
      let kq = toanTu;
      const duoi = sub ? chuyenCacCon(sub).trim() : '';
      const tren = sup ? chuyenCacCon(sup).trim() : '';
      if (duoi && anDuoi !== '1' && anDuoi !== 'on') kq += `_{${duoi}}`;
      if (tren && anTren !== '1' && anTren !== 'on') kq += `^{${tren}}`;
      return `${kq} ${e ? chuyenCacCon(e) : ''}`;
    }

    case 'd': {
      // ngoặc (delimiter)
      const dPr = timCon(el, 'dpr');
      const moRaw = dPr && timCon(dPr, 'begchr') ? (layVal(timCon(dPr, 'begchr')) ?? '') : '(';
      const dongRaw = dPr && timCon(dPr, 'endchr') ? (layVal(timCon(dPr, 'endchr')) ?? '') : ')';
      const phanCach = dPr && timCon(dPr, 'sepchr') ? (layVal(timCon(dPr, 'sepchr')) ?? '|') : '|';
      const mo = BANG_NGOAC[moRaw] ?? moRaw;
      const dong = BANG_NGOAC[dongRaw] ?? dongRaw;
      const ruot = timCacCon(el, 'e')
        .map(chuyenCacCon)
        .join(` \\middle${BANG_NGOAC[phanCach] ?? '|'} `);
      return `\\left${mo}${ruot}\\right${dong}`;
    }

    case 'func': {
      // hàm: sin, cos, log…
      const fName = timCon(el, 'fname');
      const e = timCon(el, 'e');
      const tenHam = fName ? chuyenCacCon(fName).trim() : '';
      const doiSo = e ? chuyenCacCon(e) : '';
      if (HAM_QUEN_THUOC.has(tenHam)) return `\\${tenHam} ${doiSo}`;
      // fName có thể là cấu trúc phức (VD log có chỉ số dưới) → giữ nguyên
      if (/^\\|[_^{]/.test(tenHam)) return `${tenHam} ${doiSo}`;
      return tenHam ? `\\operatorname{${tenHam}} ${doiSo}` : doiSo;
    }

    case 'limlow': {
      // giới hạn dưới: lim, max… với biểu thức bên dưới
      const e = timCon(el, 'e');
      const lim = timCon(el, 'lim');
      const than = e ? chuyenCacCon(e).trim() : '';
      const duoi = lim ? chuyenCacCon(lim) : '';
      if (HAM_QUEN_THUOC.has(than)) return `\\${than}_{${duoi}}`;
      return `\\underset{${duoi}}{${boc(than)}}`;
    }

    case 'limupp': {
      const e = timCon(el, 'e');
      const lim = timCon(el, 'lim');
      return `\\overset{${lim ? chuyenCacCon(lim) : ''}}{${boc(e ? chuyenCacCon(e) : '')}}`;
    }

    case 'bar': {
      const barPr = timCon(el, 'barpr');
      const viTri = layVal(barPr ? timCon(barPr, 'pos') : undefined);
      const e = timCon(el, 'e');
      const ruot = e ? chuyenCacCon(e) : '';
      return viTri === 'top' ? `\\overline{${ruot}}` : `\\underline{${ruot}}`;
    }

    case 'acc': {
      // dấu trên đầu: mũ, vector, chấm…
      const accPr = timCon(el, 'accpr');
      const kyTu = layVal(accPr ? timCon(accPr, 'chr') : undefined) ?? '̂';
      const e = timCon(el, 'e');
      const lenh = BANG_DAU[kyTu] ?? '\\hat';
      return `${lenh}{${e ? chuyenCacCon(e) : ''}}`;
    }

    case 'groupchr': {
      const grPr = timCon(el, 'groupchrpr');
      const kyTu = layVal(grPr ? timCon(grPr, 'chr') : undefined) ?? '⏟';
      const e = timCon(el, 'e');
      const ruot = e ? chuyenCacCon(e) : '';
      if (kyTu === '⏟') return `\\underbrace{${ruot}}`; // ⏟
      if (kyTu === '⏞') return `\\overbrace{${ruot}}`; // ⏞
      return ruot;
    }

    case 'm': {
      // ma trận
      const hang = timCacCon(el, 'mr')
        .map((mr) => timCacCon(mr, 'e').map(chuyenCacCon).join(' & '))
        .join(' \\\\ ');
      return `\\begin{matrix}${hang}\\end{matrix}`;
    }

    case 'eqarr': {
      // hệ / dãy phương trình xếp dòng
      const dong = timCacCon(el, 'e').map(chuyenCacCon).join(' \\\\ ');
      return `\\begin{gathered}${dong}\\end{gathered}`;
    }

    default:
      // thẻ thuộc tính (rpr, ctrlpr, *pr…) không sinh nội dung
      if (tenThe(el).endsWith('pr')) return '';
      return chuyenCacCon(el);
  }
}

/**
 * Chuyển một phần tử <m:oMath> → chuỗi LaTeX.
 * Trả về chuỗi rỗng nếu không trích xuất được gì.
 */
export function ommlSangLatex(oMath: Element): string {
  try {
    const latex = chuyenPhanTu(oMath).replace(/\s+/g, ' ').trim();
    if (latex) return latex;
  } catch {
    // rơi xuống fallback text
  }
  return (oMath.textContent ?? '').replace(/[⁡-⁤​]/g, '').trim();
}
