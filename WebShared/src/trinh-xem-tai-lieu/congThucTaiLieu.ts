/**
 * Xử lý công thức MathType trong tài liệu Office khi xem trên trình duyệt.
 *
 * - Word (.docx): công thức MathType là đối tượng OLE (<w:object>) mà docx-preview
 *   bỏ trống. Trước khi hiển thị, mở gói docx, giải mã ảnh WMF của từng đối tượng
 *   (MTEF → LaTeX), thay <w:object> bằng dấu đánh dấu ⟦CTn⟧; sau khi hiển thị,
 *   vẽ KaTeX vào đúng chỗ dấu đánh dấu.
 * - Word (.docx): công thức Equation gốc của Word (OMML <m:oMath>/<m:oMathPara>, docx-preview cũng bỏ qua)
 *   → LaTeX bằng ommlSangLatex, thay bằng dấu ⟦CTn⟧ như trên (nhập Word giữ được công thức Equation).
 * - Mọi loại (docx/pptx): ảnh WMF còn lại (trình duyệt không vẽ được WMF) được
 *   thay bằng công thức nếu là MathType, còn lại thay bằng khung "hình WMF".
 */
import JSZip from 'jszip';
import katex from 'katex';
import { anhKetQuaSangLatex, laEmf, laWmf } from '../mathtype/wmfMtef';
import { oleSangLatex } from '../mathtype/oleMtef';
import { ommlSangLatex } from '../word-html/ommlSangLatex';

/** Đối tượng nhúng tìm thấy trong docx */
export type DoiTuongNhung =
  | { loai: 'cong-thuc'; latex: string }
  | { loai: 'anh'; src: string }
  | { loai: 'khong-doc-duoc' };

export interface KetQuaTienXuLyDocx {
  noiDung: Blob;
  dsDoiTuong: DoiTuongNhung[];
}

const MO = '⟦CT';
const DONG = '⟧';
const DAU_RE = /⟦CT(\d+)⟧/g;
const DOI_TUONG_RE = /<w:object\b[\s\S]*?<\/w:object>/g;

const bytesSangDataUrl = (b: Uint8Array, mime: string): string => {
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, Array.from(b.subarray(i, i + 0x8000)));
  }
  return `data:${mime};base64,${btoa(s)}`;
};

const mimeAnh = (b: Uint8Array): string | null => {
  if (b[0] === 0x89 && b[1] === 0x50) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x47 && b[1] === 0x49) return 'image/gif';
  return null;
};

/**
 * Mở gói docx, giải mã các đối tượng OLE; không có gì cần đổi thì trả tệp gốc.
 * `tabThanhKyTu`: đổi `<w:tab/>` thành ký tự tab thật (docx-preview vẽ tab thành một khoảng
 * trắng, mất dấu phân tách phương án "A.⇥B.⇥…") — chỉ dùng cho import, không dùng khi xem.
 */
export async function tienXuLyCongThucDocx(
  tep: Blob,
  tuyChon: { tabThanhKyTu?: boolean } = {},
): Promise<KetQuaTienXuLyDocx> {
  const zip = await JSZip.loadAsync(tep);
  const tepNoiDung = zip.file('word/document.xml');
  const tepQuanHe = zip.file('word/_rels/document.xml.rels');
  if (!tepNoiDung || !tepQuanHe) return { noiDung: tep, dsDoiTuong: [] };

  let xml = await tepNoiDung.async('string');
  const coTab = tuyChon.tabThanhKyTu && /<w:tab\s*\/>/.test(xml);
  if (coTab) xml = xml.replace(/<w:tab\s*\/>/g, '<w:t xml:space="preserve">\t</w:t>');
  const coOmml = xml.includes('<m:oMath');
  if (!xml.includes('<w:object') && !coOmml) {
    if (!coTab) return { noiDung: tep, dsDoiTuong: [] };
    zip.file('word/document.xml', xml);
    return { noiDung: await zip.generateAsync({ type: 'blob' }), dsDoiTuong: [] };
  }
  if (!xml.includes('<w:object')) {
    // Chỉ có công thức Equation gốc của Word (OMML) — docx-preview bỏ qua, phải đổi thành dấu ⟦CTn⟧
    const dsDoiTuong: DoiTuongNhung[] = [];
    zip.file('word/document.xml', thayCongThucOmml(xml, dsDoiTuong));
    return { noiDung: await zip.generateAsync({ type: 'blob' }), dsDoiTuong };
  }

  const bangQuanHe = new Map<string, string>();
  for (const khop of (await tepQuanHe.async('string')).matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(khop[0])?.[1];
    const dich = /\bTarget="([^"]+)"/.exec(khop[0])?.[1];
    if (id && dich) bangQuanHe.set(id, dich);
  }

  const docTep = async (rId: string | undefined): Promise<Uint8Array | null> => {
    const dich = rId ? bangQuanHe.get(rId) : undefined;
    if (!dich) return null;
    const tep = zip.file(dich.startsWith('/') ? dich.slice(1) : `word/${dich}`);
    return tep ? tep.async('uint8array') : null;
  };
  const cacKhoi = Array.from(xml.matchAll(DOI_TUONG_RE), (k) => k[0]);
  const dsDoiTuong = await Promise.all(
    cacKhoi.map(async (khoi): Promise<DoiTuongNhung> => {
      const bytes = await docTep(/<v:imagedata\b[^>]*\br:id="([^"]+)"/.exec(khoi)?.[1]);
      const theOle = /<o:OLEObject\b[^>]*>/.exec(khoi)?.[0] ?? '';
      const laCongThuc = /ProgID="[^"]*(?:equation|mathtype)/i.test(theOle);
      // ảnh kết quả WMF/EMF mang MTEF → dự phòng: đối tượng OLE gốc (embeddings/oleObject*.bin,
      // luồng "Equation Native") — nguồn duy nhất của Equation 3.0 và của ảnh không mang MTEF
      let latex = bytes && (laWmf(bytes) || laEmf(bytes)) ? anhKetQuaSangLatex(bytes) : null;
      if (!latex && (laCongThuc || (bytes && (laWmf(bytes) || laEmf(bytes))))) {
        const ole = await docTep(/\br:id="([^"]+)"/.exec(theOle)?.[1]);
        if (ole) latex = oleSangLatex(ole);
      }
      if (latex) return { loai: 'cong-thuc', latex };
      // không giải mã được nhưng ảnh kết quả là PNG/JPEG → hiện ảnh còn hơn mất nội dung
      const mime = bytes ? mimeAnh(bytes) : null;
      return mime && bytes ? { loai: 'anh', src: bytesSangDataUrl(bytes, mime) } : { loai: 'khong-doc-duoc' };
    }),
  );

  let chiSo = 0;
  let xmlMoi = xml.replace(DOI_TUONG_RE, () => {
    const i = chiSo++;
    return `<w:t xml:space="preserve">${MO}${i}${DONG}</w:t>`;
  });
  if (coOmml) xmlMoi = thayCongThucOmml(xmlMoi, dsDoiTuong);
  zip.file('word/document.xml', xmlMoi);
  return { noiDung: await zip.generateAsync({ type: 'blob' }), dsDoiTuong };
}

// ————— Công thức Equation gốc của Word (OMML) —————

const KHOI_OMML_RE = /<m:oMathPara\b[\s\S]*?<\/m:oMathPara>|<m:oMath(?:\s[^>]*)?>[\s\S]*?<\/m:oMath>/g;
const NS_OMML =
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';

/** Một khối <m:oMath>/<m:oMathPara> (chuỗi XML) → LaTeX; không đọc được → null */
function ommlKhoiSangLatex(khoi: string): string | null {
  const d = new DOMParser().parseFromString(`<goc ${NS_OMML}>${khoi}</goc>`, 'application/xml');
  if (d.getElementsByTagName('parsererror').length) return null;
  const goc = d.documentElement.firstElementChild;
  if (!goc) return null;
  const cacMath = goc.localName === 'oMathPara' ? Array.from(goc.children).filter((c) => c.localName === 'oMath') : [goc];
  const latex = cacMath.map((m) => ommlSangLatex(m)).filter(Boolean).join(' \\quad ');
  return latex || null;
}

/**
 * Thay mỗi khối công thức OMML (nằm trực tiếp trong <w:p>) bằng một run chứa dấu ⟦CTn⟧, nối tiếp
 * `dsDoiTuong` (chỉ số tiếp theo sau các đối tượng OLE) — docxSangHtml / trình xem đổi dấu thành công thức.
 */
function thayCongThucOmml(xml: string, dsDoiTuong: DoiTuongNhung[]): string {
  return xml.replace(KHOI_OMML_RE, (khoi) => {
    const latex = ommlKhoiSangLatex(khoi);
    const i = dsDoiTuong.length;
    dsDoiTuong.push(latex ? { loai: 'cong-thuc', latex } : { loai: 'khong-doc-duoc' });
    return `<w:r><w:t xml:space="preserve">${MO}${i}${DONG}</w:t></w:r>`;
  });
}

const taoCongThuc = (latex: string): HTMLElement => {
  const span = document.createElement('span');
  span.className = 'txtl-cong-thuc';
  span.setAttribute('data-latex', latex);
  try {
    katex.render(latex, span, { throwOnError: false });
  } catch {
    span.textContent = latex;
  }
  return span;
};

const taoKhungKhongDocDuoc = (nhan: string): HTMLElement => {
  const span = document.createElement('span');
  span.className = 'txtl-khong-doc-duoc';
  span.textContent = nhan;
  return span;
};

/** Vẽ các đối tượng đã giải mã vào đúng vị trí dấu đánh dấu ⟦CTn⟧; trả về số công thức */
export function veDoiTuongVaoDom(goc: HTMLElement, ds: DoiTuongNhung[]): number {
  const cacNut: Text[] = [];
  const duyet = document.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
  while (duyet.nextNode()) {
    const nut = duyet.currentNode as Text;
    if (nut.data.includes(MO)) cacNut.push(nut);
  }
  let soCongThuc = 0;
  for (const nut of cacNut) {
    // run chứa đối tượng OLE thường mang w:position (hạ baseline cho ẢNH công thức) →
    // docx-preview đặt vertical-align âm; KaTeX tự căn baseline nên bỏ độ hạ đó
    const cha = nut.parentElement;
    if (cha?.style.verticalAlign && !nut.data.replace(DAU_RE, '').trim()) {
      cha.style.verticalAlign = 'baseline';
    }
    const manh = document.createDocumentFragment();
    let tu = 0;
    for (const khop of nut.data.matchAll(DAU_RE)) {
      const i = khop.index ?? 0;
      if (i > tu) manh.append(nut.data.slice(tu, i));
      const dt = ds[Number(khop[1])];
      if (dt?.loai === 'cong-thuc') {
        manh.append(taoCongThuc(dt.latex));
        soCongThuc += 1;
      } else if (dt?.loai === 'anh') {
        const img = document.createElement('img');
        img.src = dt.src;
        img.className = 'txtl-anh-nhung';
        manh.append(img);
      } else {
        manh.append(taoKhungKhongDocDuoc('[đối tượng nhúng]'));
      }
      tu = i + khop[0].length;
    }
    if (tu < nut.data.length) manh.append(nut.data.slice(tu));
    nut.replaceWith(manh);
  }
  return soCongThuc;
}

/**
 * Thay các ảnh WMF (trình duyệt không vẽ được) trong vùng hiển thị: WMF của
 * MathType → công thức KaTeX co giãn vừa khung ảnh; WMF khác → khung chữ.
 * Trả về số công thức đã thay.
 */
export async function thayAnhWmf(goc: HTMLElement): Promise<number> {
  let soCongThuc = 0;
  for (const img of Array.from(goc.querySelectorAll('img'))) {
    const src = img.getAttribute('src') ?? '';
    if (!src.startsWith('data:') && !src.startsWith('blob:')) continue;
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
    } catch {
      continue;
    }
    if (!laWmf(bytes) && !laEmf(bytes)) continue;

    const rong = img.offsetWidth || parseFloat(img.style.width) || 0;
    const cao = img.offsetHeight || parseFloat(img.style.height) || 0;
    const latex = anhKetQuaSangLatex(bytes);
    const khung = document.createElement('span');
    khung.className = 'txtl-khung-wmf';
    khung.style.cssText = img.style.cssText;
    if (rong) khung.style.width = `${rong}px`;
    if (cao) khung.style.height = `${cao}px`;
    if (!latex) {
      khung.append(taoKhungKhongDocDuoc('[hình WMF]'));
      img.replaceWith(khung);
      continue;
    }
    const congThuc = taoCongThuc(latex);
    khung.append(congThuc);
    img.replaceWith(khung);
    soCongThuc += 1;
    // co giãn công thức vừa khung ảnh gốc (ảnh WMF có kích thước theo cỡ chữ trong slide)
    if (rong && cao && congThuc.offsetWidth && congThuc.offsetHeight) {
      const tiLe = Math.min(rong / congThuc.offsetWidth, cao / congThuc.offsetHeight, 4);
      congThuc.style.transform = `scale(${tiLe})`;
    }
  }
  return soCongThuc;
}
