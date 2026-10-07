/**
 * Tiện ích DOM dùng chung cho các định dạng câu hỏi.
 * Đầu vào là HTML đã chuẩn hóa từ Word (../word-html): công thức là
 * <span data-cong-thuc="LaTeX">, ảnh là <img>, định dạng là <b>/<i>/<u>/<sup>/<sub>.
 */
import { MA_CAU_HOI_RE } from './maLoaiCau';

const KHOANG_TRANG = /[\s ]/;
const CON_CHU = /[^\s ]/;

export const DAP_AN_RE = /^\s*(?:đáp\s*án(?:\s*đúng)?|dap\s*an)\s*[:.]?\s*(.*)$/i;
export const LOI_GIAI_RE =
  /^\s*(?:lời\s*giải(?:\s*chi\s*tiết)?|hướng\s*dẫn(?:\s*giải|\s*chấm)?|giải)\s*[:.]/i;
/** Giá trị đáp án Đúng/Sai */
export const DUNG_SAI_RE = /^(đúng|sai|đ|s)\.?$/i;

export function phanTich(html: string): { doc: Document; goc: HTMLElement } {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return { doc, goc: doc.body };
}

export const vanBanCuaHtml = (html: string): string =>
  (phanTich(html).goc.textContent ?? '').replace(/\s+/g, ' ').trim();

/** node nằm trong công thức/chip/ảnh — không dò mốc bên trong */
const trongDoiTuong = (nut: Node, goc: Element): boolean => {
  for (let p = nut.parentElement; p && p !== goc; p = p.parentElement) {
    if (p.hasAttribute('data-cong-thuc') || p.hasAttribute('data-khong-chuyen')) return true;
    const ten = p.tagName.toLowerCase();
    if (ten === 'code' || ten === 'img') return true;
  }
  return false;
};

/**
 * Làm sạch HTML một phân đoạn: xóa thẻ inline RỖNG (tàn dư sau khi cắt Range) rồi
 * bỏ dòng/khối trống ở đầu và cuối.
 */
export function donPhanDoan(html: string): string {
  const { goc } = phanTich(html);
  for (;;) {
    let daXoa = false;
    for (const el of Array.from(goc.querySelectorAll('b, strong, i, em, u, s, span, sub, sup'))) {
      if (el.hasAttribute('data-cong-thuc') || el.hasAttribute('data-khong-chuyen')) continue;
      if (el.querySelector('img, [data-cong-thuc]')) continue;
      if (!CON_CHU.test(el.textContent ?? '')) {
        el.remove();
        daXoa = true;
      }
    }
    if (!daXoa) break;
  }
  const rong = (nut: Node): boolean => {
    if (nut.nodeType === Node.TEXT_NODE) return !CON_CHU.test(nut.textContent ?? '');
    if (nut.nodeType !== Node.ELEMENT_NODE) return true;
    const el = nut as Element;
    const ten = el.tagName.toLowerCase();
    if (ten === 'br') return true;
    if (ten === 'img' || el.querySelector('img, [data-cong-thuc], table')) return false;
    return !CON_CHU.test(el.textContent ?? '');
  };
  while (goc.firstChild && rong(goc.firstChild)) (goc.firstChild as ChildNode).remove();
  while (goc.lastChild && rong(goc.lastChild)) (goc.lastChild as ChildNode).remove();
  return goc.innerHTML.trim();
}

/**
 * Cắt phần nhận dạng đầu câu (hệ thống tự đánh số): mã "CH-TN"/"CHC-TLN", "Câu 12.",
 * "Câu 3.1:", "Câu 5)" — có thể đi cùng nhau ("CH-TN Câu 3. …").
 */
export function catTienToCau(html: string): string {
  const tienTo = (s: string) => s.replace(/^((?:<[^>]+>|\s|&nbsp;)*)/, '');
  const dauThe = (s: string) => /^((?:<[^>]+>|\s|&nbsp;)*)/.exec(s)?.[1] ?? '';
  let kq = html;
  const phanDau = dauThe(kq);
  let than = tienTo(kq);
  const khopMa = MA_CAU_HOI_RE.exec(than);
  if (khopMa) than = than.slice(khopMa[0].length);
  than = than.replace(/^((?:<[^>]+>|\s|&nbsp;)*)Câu\s*\d+(?:\.\d+)?\s*[.:)]?\s*/i, '$1');
  kq = phanDau + than;
  return donPhanDoan(kq);
}

/**
 * Ảnh NỔI của Word (img[data-anh-noi] — ../word-html đặt thành khối riêng sau đoạn neo) là hình minh họa
 * của ĐỀ BÀI; Word neo nó vào dòng phương án thì sau khi cắt theo mốc nó rơi vào phương án cuối cùng →
 * rút ra để ghép về đề. @returns html mục đã bỏ ảnh nổi + các ảnh nổi (mỗi ảnh một đoạn <p>)
 */
export function tachAnhNoi(html: string): { html: string; anhNoi: string } {
  if (!html.includes('data-anh-noi')) return { html, anhNoi: '' };
  const { goc } = phanTich(html);
  const ds: string[] = [];
  for (const img of Array.from(goc.querySelectorAll('img[data-anh-noi]'))) {
    ds.push(`<p>${img.outerHTML}</p>`);
    // bỏ cả khối bao nếu khối chỉ còn ảnh này (không chữ, không công thức/ảnh khác)
    const khoi = img.parentElement;
    const khoiChiCoAnh =
      khoi && khoi !== goc && !CON_CHU.test(khoi.textContent ?? '') &&
      khoi.querySelectorAll('img, [data-cong-thuc], table').length === 1;
    (khoiChiCoAnh ? khoi : img).remove();
  }
  return { html: donPhanDoan(goc.innerHTML), anhNoi: ds.join('') };
}

/**
 * Tách dòng "Đáp án: …" (đoạn con trực tiếp của gốc) ra khỏi nội dung.
 * @param loc chỉ nhận dòng có giá trị thỏa điều kiện (mặc định: mọi dòng)
 * @returns phần văn bản sau "Đáp án:" hoặc null nếu không có
 */
export function tachDongDapAn(goc: HTMLElement, loc?: (giaTri: string) => boolean): string | null {
  for (const khoi of Array.from(goc.children)) {
    const khop = DAP_AN_RE.exec((khoi.textContent ?? '').trim());
    if (khop && (!loc || loc(khop[1].trim()))) {
      khoi.remove();
      return khop[1].trim();
    }
  }
  return null;
}

/**
 * Tách "Đáp án: …" ở CUỐI một đoạn nội dung (VD cuối mỗi lệnh hỏi a), b)… của câu Đúng/Sai):
 * dạng đoạn riêng hoặc nằm cuối dòng. @returns html đã bỏ phần đáp án + giá trị đáp án
 */
export function tachDapAnCuoi(html: string): { html: string; dapAn: string | null } {
  const { doc, goc } = phanTich(html);
  const cacNut: Text[] = [];
  const duyet = doc.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
  for (let n = duyet.nextNode(); n; n = duyet.nextNode()) {
    if (!trongDoiTuong(n, goc)) cacNut.push(n as Text);
  }
  for (let i = cacNut.length - 1; i >= 0; i -= 1) {
    const nut = cacNut[i];
    const viTri = nut.data.search(/đáp\s*án\s*[:.]?/i);
    if (viTri < 0) continue;
    const r = doc.createRange();
    r.setStart(nut, viTri);
    r.setEnd(goc, goc.childNodes.length);
    const giaTri = DAP_AN_RE.exec(r.toString().replace(/\s+/g, ' ').trim())?.[1]?.trim() ?? '';
    if (!giaTri || giaTri.length > 30) return { html, dapAn: null };
    r.deleteContents();
    return { html: donPhanDoan(goc.innerHTML), dapAn: giaTri };
  }
  return { html, dapAn: null };
}

/**
 * Tách đoạn lời giải/hướng dẫn: từ đoạn bắt đầu bằng "Lời giải:", "Hướng dẫn giải:",
 * "Hướng dẫn chấm:", "Giải:" tới hết khối. @returns HTML lời giải (đã bỏ nhãn) hoặc undefined
 */
export function tachLoiGiai(goc: HTMLElement): string | undefined {
  const cacKhoi = Array.from(goc.children);
  const viTri = cacKhoi.findIndex((k) => LOI_GIAI_RE.test(k.textContent ?? ''));
  if (viTri < 0) return undefined;
  const phan = cacKhoi.slice(viTri);
  phan.forEach((k) => k.remove());
  const html = phan.map((k) => k.outerHTML).join('');
  return donPhanDoan(html.replace(LOI_GIAI_RE_TRONG_HTML, '$1')) || undefined;
}
const LOI_GIAI_RE_TRONG_HTML =
  /^((?:<[^>]+>|\s|&nbsp;)*)(?:lời\s*giải(?:\s*chi\s*tiết)?|hướng\s*dẫn(?:\s*giải|\s*chấm)?|giải)\s*[:.]\s*/i;

export interface MocPhuongAn {
  nut: Text;
  /** offset trước chữ cái mốc */
  batDau: number;
  /** offset sau dấu chấm/ngoặc + khoảng trắng liền sau */
  ketThuc: number;
}

const THE_KHOI = new Set(['p', 'div', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'body']);
const khoiChua = (nut: Node): Element | null => {
  for (let p = nut.parentElement; p; p = p.parentElement) {
    if (THE_KHOI.has(p.tagName.toLowerCase())) return p;
  }
  return null;
};

/**
 * Khoảng phân tách TRƯỚC một mốc phương án (quy ước: Tab, Enter, hoặc nhiều dấu cách).
 * Duyệt ngược qua các text node cùng khối; công thức/chữ thường thì dừng.
 */
function phanTachTruoc(
  cacNut: Text[],
  chiSo: number,
  offset: number,
): { dauKhoi: boolean; coTab: boolean; soKhoangTrang: number; kyTuTruoc: string } {
  const khoi = khoiChua(cacNut[chiSo]);
  let soKhoangTrang = 0;
  let coTab = false;
  for (let i = chiSo; i >= 0; i -= 1) {
    const nut = cacNut[i];
    if (i !== chiSo && khoiChua(nut) !== khoi) break;
    const chuoi = i === chiSo ? nut.data.slice(0, offset) : nut.data;
    for (let j = chuoi.length - 1; j >= 0; j -= 1) {
      const c = chuoi[j];
      if (c === '\t') coTab = true;
      if (KHOANG_TRANG.test(c)) soKhoangTrang += 1;
      else return { dauKhoi: false, coTab, soKhoangTrang, kyTuTruoc: c };
    }
  }
  return { dauKhoi: true, coTab, soKhoangTrang, kyTuTruoc: '' };
}

/**
 * Dò các mốc phương án TUẦN TỰ ("A." "B." … hoặc "a)" "b)" …), theo quy ước phân tách:
 * mỗi mốc phải đứng ĐẦU DÒNG (Enter), sau TAB, hoặc sau ≥ 2 khoảng trắng (quy chuẩn ≥ 5
 * dấu cách; dung sai 2 vì Tab của Word khi dán thường thành vài dấu cách). Riêng mốc đầu
 * tiên còn được đứng sau dấu kết câu hỏi ("?", ":") + khoảng trắng. Bỏ qua chữ trong công thức.
 */
export function timMocTuanTu(doc: Document, goc: HTMLElement, chuDau: 'A' | 'a'): MocPhuongAn[] {
  const maDau = chuDau.charCodeAt(0);
  const cacNut: Text[] = [];
  const duyet = doc.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
  for (let n = duyet.nextNode(); n; n = duyet.nextNode()) cacNut.push(n as Text);

  const cacMoc: MocPhuongAn[] = [];
  cacNut.forEach((nut, chiSo) => {
    if (trongDoiTuong(nut, goc)) return;
    const chuoi = nut.data;
    const re = /([A-Ha-h])\s*[.)]/g;
    for (let khop = re.exec(chuoi); khop; khop = re.exec(chuoi)) {
      if (khop[1] !== String.fromCharCode(maDau + cacMoc.length)) continue;
      const sau = chuoi[re.lastIndex] ?? '';
      if (sau && !KHOANG_TRANG.test(sau)) continue;
      const pt = phanTachTruoc(cacNut, chiSo, khop.index);
      // mốc in đậm đứng riêng một đoạn chữ ("<b>B.</b>") là dấu phân tách rõ ràng dù dính liền
      // chữ trước (VD tiếng Nhật/Trung không dùng dấu cách)
      const mocInDamRieng =
        coToTien(nut, goc, ['b', 'strong']) && !chuoi.slice(0, khop.index).trim();
      const hopLe =
        mocInDamRieng ||
        pt.dauKhoi ||
        pt.coTab ||
        pt.soKhoangTrang >= 2 ||
        (cacMoc.length === 0 && pt.soKhoangTrang >= 1 && /[?:]/.test(pt.kyTuTruoc));
      if (!hopLe) continue;
      let ketThuc = re.lastIndex;
      while (KHOANG_TRANG.test(chuoi[ketThuc] ?? '')) ketThuc += 1;
      cacMoc.push({ nut, batDau: khop.index, ketThuc });
    }
  });
  return cacMoc;
}

export interface MucCatDuoc {
  html: string;
  /** Toàn bộ chữ của mục (hoặc chữ cái mốc) được gạch chân */
  gachChan: boolean;
  /** Toàn bộ chữ của nội dung mục in đậm */
  inDam: boolean;
}

const coToTien = (nut: Node, goc: Element, the: string[]): boolean => {
  for (let p = nut.parentElement; p && p !== goc; p = p.parentElement) {
    if (the.includes(p.tagName.toLowerCase())) return true;
  }
  return false;
};

/** Mọi chữ (ngoài công thức) trong html đều nằm trong một trong các thẻ cho trước */
const toanBoTrongThe = (html: string, the: string[]): boolean => {
  const { doc, goc } = phanTich(html);
  const duyet = doc.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
  let coChu = false;
  for (let nut = duyet.nextNode(); nut; nut = duyet.nextNode()) {
    if (!CON_CHU.test(nut.textContent ?? '') || trongDoiTuong(nut, goc)) continue;
    coChu = true;
    if (!coToTien(nut, goc, the)) return false;
  }
  return coChu;
};

/** Cắt khối theo các mốc bằng Range — giữ nguyên công thức/ảnh/định dạng */
export function catTheoMoc(
  doc: Document,
  goc: HTMLElement,
  cacMoc: MocPhuongAn[],
): { truoc: string; cacMuc: MucCatDuoc[] } {
  const htmlCuaRange = (r: Range) => {
    const div = doc.createElement('div');
    div.appendChild(r.cloneContents());
    return donPhanDoan(div.innerHTML);
  };
  const rTruoc = doc.createRange();
  rTruoc.setStart(goc, 0);
  rTruoc.setEnd(cacMoc[0].nut, cacMoc[0].batDau);
  const cacMuc = cacMoc.map((moc, i) => {
    const r = doc.createRange();
    r.setStart(moc.nut, moc.ketThuc);
    const mocSau = cacMoc[i + 1];
    if (mocSau) r.setEnd(mocSau.nut, mocSau.batDau);
    else r.setEnd(goc, goc.childNodes.length);
    const html = htmlCuaRange(r);
    return {
      html,
      gachChan: coToTien(moc.nut, goc, ['u']) || toanBoTrongThe(html, ['u']),
      inDam: toanBoTrongThe(html, ['b', 'strong']),
    };
  });
  return { truoc: htmlCuaRange(rTruoc), cacMuc };
}

/**
 * Bảng dùng để xếp phương án (VD bảng 2×2 "A. … | B. …") → trải thành các đoạn,
 * để mốc phương án cắt được gọn theo từng ô.
 */
export function traiPhangBangPhuongAn(doc: Document, goc: HTMLElement): void {
  for (const bang of Array.from(goc.querySelectorAll('table'))) {
    const cacO = Array.from(bang.querySelectorAll('td, th'));
    const oCoMoc = cacO.filter((o) => /^\s*[A-Ha-h]\s*[.)]\s/.test(o.textContent ?? ''));
    if (oCoMoc.length < 2) continue;
    const manh = doc.createDocumentFragment();
    for (const o of cacO) {
      if (!CON_CHU.test(o.textContent ?? '') && !o.querySelector('img, [data-cong-thuc]')) continue;
      const p = doc.createElement('p');
      p.innerHTML = o.innerHTML;
      manh.append(p);
    }
    bang.replaceWith(manh);
  }
}

/** Chữ cái đáp án trong chuỗi "Đáp án: B" / "Đáp án: A, C" (viết hoa) */
export const chuCaiDapAn = (vanBan: string): string[] =>
  Array.from(new Set((vanBan.match(/\b[A-Ha-h]\b/g) ?? []).map((c) => c.toUpperCase())));

/**
 * Đáp án Đúng/Sai theo ý (GỘP ở cuối câu): "a) Đ, b) S, c) Đ, d) S" hoặc "a-Đúng; b-Sai";
 * dạng liệt kê "a, c" (các ý ĐÚNG) → các ý có mặt là đúng, còn lại sai.
 */
export function dapAnTheoY(vanBan: string, soY: number): boolean[] | null {
  const ketQua: (boolean | undefined)[] = Array(soY).fill(undefined);
  // không dùng \b sau "Đ": \b của JS chỉ hiểu chữ ASCII
  const capRe = /\b([a-h])\s*[).:\-–]?\s*(đúng|sai|đ|s)(?=$|[\s,;.)])/gi;
  let coCap = false;
  for (let k = capRe.exec(vanBan); k; k = capRe.exec(vanBan)) {
    const i = k[1].toLowerCase().charCodeAt(0) - 97;
    if (i < soY) {
      ketQua[i] = /^đ/i.test(k[2]);
      coCap = true;
    }
  }
  if (coCap) return ketQua.map((v) => v ?? false);
  const cacChu = (vanBan.match(/\b[a-h]\b/gi) ?? []).map((c) => c.toLowerCase().charCodeAt(0) - 97);
  if (!cacChu.length) return null;
  return ketQua.map((_, i) => cacChu.includes(i));
}

/**
 * Kiểm tra quy chuẩn đáp án TRẢ LỜI NGẮN / ĐIỀN SỐ: tối đa 4 ký tự (kể cả dấu trừ, dấu phẩy),
 * chỉ gồm chữ số, dấu "-" đầu, dấu phẩy thập phân ở vị trí thứ 2 hoặc 3. VD hợp lệ: 12,5 · 0,25 · -1,5 · 2025.
 * @returns mô tả vi phạm hoặc null nếu hợp lệ
 */
export function kiemTraDapAnSo(dapAn: string): string | null {
  const s = dapAn.trim();
  if (/^-?\d+\.\d+$/.test(s)) return `dùng dấu phẩy (không dùng dấu chấm) phân cách thập phân: "${s}"`;
  if (!/^-?\d+(,\d+)?$/.test(s)) return `đáp án "${s}" không phải số theo quy chuẩn`;
  if (s.length > 4) return `đáp án "${s}" dài ${s.length} ký tự (tối đa 4)`;
  const viTriPhay = s.indexOf(',') + 1;
  if (viTriPhay && viTriPhay !== 2 && viTriPhay !== 3) {
    return `dấu phẩy của "${s}" ở vị trí thứ ${viTriPhay} (quy chuẩn: vị trí 2 hoặc 3)`;
  }
  return null;
}

// ================= ĐỤC LỖ (ô trống) =================

/** Ô trống: "(1)______" (có gạch chân, đánh số) hoặc "(N**)" (không gạch chân, số vị trí khi sinh đề) */
const O_TRONG_RE = /\((?:\d+|N\*\*(?:\s*\+\s*\d+)?)\)(?:\s*_{2,})?/g;

export const demOTrong = (html: string): number =>
  (vanBanCuaHtml(html).match(O_TRONG_RE) ?? []).length;

/**
 * Chuẩn hóa ô trống trong NGỮ LIỆU câu hỏi nhóm: ô trống thứ k ứng với câu hỏi con thứ k,
 * nên "(1)______" và "(N**)" (lần xuất hiện thứ k) đều quy về "(N**+k)" (giữ "______" nếu có).
 * Khi sinh đề, bộ đánh số (viTriCau.ts) thay "N**+k" bằng số thứ tự thật của câu con thứ k.
 */
export function chuanHoaOTrongNhom(html: string): string {
  const { doc, goc } = phanTich(html);
  let thuTu = 0;
  const duyet = doc.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
  for (let n = duyet.nextNode(); n; n = duyet.nextNode()) {
    if (trongDoiTuong(n, goc) || !/\(/.test(n.nodeValue ?? '')) continue;
    n.nodeValue = (n.nodeValue ?? '').replace(/\((\d+|N\*\*)\)(\s*_{2,})?/g, (_t, so: string, gach?: string) => {
      thuTu += 1;
      const k = /^\d+$/.test(so) ? Number(so) : thuTu;
      return `(N**+${k})${gach ? gach.trim() : ''}`;
    });
  }
  return goc.innerHTML;
}

// ================= CÂU DẪN (lead-in) =================

/**
 * Tách câu dẫn "##…##" (có thể nằm trong một đoạn hoặc nhiều đoạn liền nhau) khỏi gốc.
 * @returns HTML câu dẫn (đã bỏ "##") hoặc undefined
 */
export function tachCauDanThang(doc: Document, goc: HTMLElement): string | undefined {
  const cacKhoi = Array.from(goc.children);
  const dau = cacKhoi.findIndex((k) => /^\s*##/.test(k.textContent ?? ''));
  if (dau < 0) return undefined;
  let cuoi = dau;
  while (cuoi < cacKhoi.length && !/##\s*$/.test((cacKhoi[cuoi].textContent ?? '').replace(/^\s*##/, ''))) {
    cuoi += 1;
  }
  if (cuoi >= cacKhoi.length) cuoi = dau; // thiếu "##" đóng — lấy riêng đoạn mở
  const phan = cacKhoi.slice(dau, cuoi + 1);
  phan.forEach((k) => k.remove());
  const tam = doc.createElement('div');
  phan.forEach((k) => tam.append(k));
  const duyet = doc.createTreeWalker(tam, NodeFilter.SHOW_TEXT);
  for (let n = duyet.nextNode(); n; n = duyet.nextNode()) {
    n.nodeValue = (n.nodeValue ?? '').replace(/##/g, '');
  }
  return donPhanDoan(tam.innerHTML) || undefined;
}

/** Lời dẫn nhóm dạng câu: "Cho/Đọc đoạn văn sau và trả lời câu N** – câu N***" / "…từ câu 1 đến câu 5" */
export const LOI_DAN_NHOM_RE =
  /^\s*(?:cho|đọc|dựa\s*vào|sử\s*dụng)\b[^]*?\bcâu(?:\s*hỏi)?\s*(?:từ\s*)?(?:câu\s*)?(?:N\*+|\d+)\s*(?:[-–]|đến|tới)\s*(?:câu\s*)?(?:N\*+|\d+)/i;
