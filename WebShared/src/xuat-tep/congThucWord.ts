/**
 * Công thức LaTeX → phương trình Word (OMML) để tệp .docx xuất ra có công thức THẬT (sửa được trong Word):
 * LaTeX → MathML (KaTeX, output 'mathml') → OMML (ánh xạ phần tử MathML thường gặp trong đề thi:
 * phân số, mũ/chỉ số, căn, tổng/tích phân, giới hạn, dấu mũ/gạch trên, ngoặc co giãn, ma trận/hệ phương trình).
 * Phần tử lạ → giữ nội dung dạng chữ (không làm hỏng tài liệu).
 */
import katex from 'katex';

// eslint-disable-next-line no-control-regex
const xml = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const chu = (s: string, thang = false) =>
  s ? `<m:r>${thang ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : ''}<w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/></w:rPr><m:t xml:space="preserve">${xml(s)}</m:t></m:r>` : '';

const TOAN_TU_LON = new Set(['∑', '∏', '∐', '∫', '∬', '∭', '∮', '⋃', '⋂', '⋁', '⋀', '⨁', '⨂']);
const DAU_MU: Record<string, string> = { '^': '̂', ˆ: '̂', '~': '̃', '˜': '̃', '→': '⃗', '⃗': '⃗', '˙': '̇', '¨': '̈', 'ˇ': '̌', '´': '́', '`': '̀', '˘': '̆' };

const con = (el: Element) => Array.from(el.children);
const ten = (el: Element) => el.localName.toLowerCase();

function chuyenNhieu(ds: Element[]): string {
  return ds.map(chuyen).join('');
}

function laFence(el: Element | undefined) {
  return !!el && ten(el) === 'mo' && el.getAttribute('fence') === 'true';
}

function chuyen(el: Element): string {
  const c = con(el);
  switch (ten(el)) {
    case 'math':
    case 'mrow':
    case 'mstyle':
    case 'mpadded':
    case 'menclose':
    case 'merror': {
      // Ngoặc co giãn \left( … \right) → m:d
      if (c.length >= 2 && laFence(c[0])) {
        const cuoiLaFence = laFence(c[c.length - 1]);
        const trong = c.slice(1, cuoiLaFence ? -1 : undefined);
        const mo = c[0].textContent ?? '';
        const dong = cuoiLaFence ? (c[c.length - 1].textContent ?? '') : '';
        return `<m:d><m:dPr><m:begChr m:val="${xml(mo)}"/><m:endChr m:val="${xml(dong)}"/></m:dPr><m:e>${chuyenNhieu(trong)}</m:e></m:d>`;
      }
      return chuyenNhieu(c);
    }
    case 'semantics':
      return c[0] ? chuyen(c[0]) : '';
    case 'annotation':
    case 'annotation-xml':
    case 'mphantom':
      return '';
    case 'mi': {
      const t = el.textContent ?? '';
      return chu(t, el.getAttribute('mathvariant') === 'normal' || t.length > 1);
    }
    case 'mn':
      return chu(el.textContent ?? '');
    case 'mo':
      return chu(el.textContent ?? '', true);
    case 'mtext':
      return chu(el.textContent ?? '', true);
    case 'mspace':
      return chu(' ', true);
    case 'mfrac':
      return `<m:f>${el.getAttribute('linethickness') === '0px' || el.getAttribute('linethickness') === '0' ? '<m:fPr><m:type m:val="noBar"/></m:fPr>' : ''}<m:num>${c[0] ? chuyen(c[0]) : ''}</m:num><m:den>${c[1] ? chuyen(c[1]) : ''}</m:den></m:f>`;
    case 'msup':
      return `<m:sSup><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e><m:sup>${c[1] ? chuyen(c[1]) : ''}</m:sup></m:sSup>`;
    case 'msub':
      return `<m:sSub><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e><m:sub>${c[1] ? chuyen(c[1]) : ''}</m:sub></m:sSub>`;
    case 'msubsup':
      return `<m:sSubSup><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e><m:sub>${c[1] ? chuyen(c[1]) : ''}</m:sub><m:sup>${c[2] ? chuyen(c[2]) : ''}</m:sup></m:sSubSup>`;
    case 'msqrt':
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${chuyenNhieu(c)}</m:e></m:rad>`;
    case 'mroot':
      return `<m:rad><m:deg>${c[1] ? chuyen(c[1]) : ''}</m:deg><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e></m:rad>`;
    case 'mover': {
      const tren = (c[1]?.textContent ?? '').trim();
      if (['‾', '¯', '_', '―', '─'].includes(tren))
        return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e></m:bar>`;
      if (el.getAttribute('accent') === 'true' || DAU_MU[tren])
        return `<m:acc><m:accPr><m:chr m:val="${xml(DAU_MU[tren] ?? tren)}"/></m:accPr><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e></m:acc>`;
      return `<m:limUpp><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e><m:lim>${c[1] ? chuyen(c[1]) : ''}</m:lim></m:limUpp>`;
    }
    case 'munder':
      if (['_', '‾', '¯', '―'].includes((c[1]?.textContent ?? '').trim()))
        return `<m:bar><m:barPr><m:pos m:val="bot"/></m:barPr><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e></m:bar>`;
      return `<m:limLow><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e><m:lim>${c[1] ? chuyen(c[1]) : ''}</m:lim></m:limLow>`;
    case 'munderover': {
      const goc = c[0]?.textContent?.trim() ?? '';
      if (TOAN_TU_LON.has(goc))
        return `<m:limUpp><m:e><m:limLow><m:e>${chu(goc, true)}</m:e><m:lim>${c[1] ? chuyen(c[1]) : ''}</m:lim></m:limLow></m:e><m:lim>${c[2] ? chuyen(c[2]) : ''}</m:lim></m:limUpp>`;
      return `<m:limUpp><m:e><m:limLow><m:e>${c[0] ? chuyen(c[0]) : ''}</m:e><m:lim>${c[1] ? chuyen(c[1]) : ''}</m:lim></m:limLow></m:e><m:lim>${c[2] ? chuyen(c[2]) : ''}</m:lim></m:limUpp>`;
    }
    case 'mtable':
      return `<m:m>${c
        .filter((r) => ten(r) === 'mtr' || ten(r) === 'mlabeledtr')
        .map((r) => `<m:mr>${con(r).filter((o) => ten(o) === 'mtd').map((o) => `<m:e>${chuyenNhieu(con(o))}</m:e>`).join('')}</m:mr>`)
        .join('')}</m:m>`;
    default:
      return c.length ? chuyenNhieu(c) : chu(el.textContent ?? '');
  }
}

/** LaTeX → một khối <m:oMath> (đặt trong <w:p>); lỗi cú pháp → giữ LaTeX dạng chữ */
export function latexSangOmml(latex: string): string {
  try {
    const html = katex.renderToString(latex, { output: 'mathml', throwOnError: true, displayMode: false });
    const d = new DOMParser().parseFromString(html, 'text/html');
    const math = d.querySelector('math');
    if (!math) throw new Error('không có MathML');
    return `<m:oMath>${chuyen(math)}</m:oMath>`;
  } catch {
    return `<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${xml(latex)}</w:t></w:r>`;
  }
}
