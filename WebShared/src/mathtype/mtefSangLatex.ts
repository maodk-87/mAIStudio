/**
 * Giải mã MTEF v5 (định dạng nhị phân của MathType 4+, gồm MathType 7) và MTEF v3
 * (Microsoft Equation 3.0) → LaTeX.
 *
 * MTEF là dữ liệu công thức GỐC mà MathType nhúng vào WMF/OLE — giải mã được
 * thì chuyển công thức MathType cũ thành công thức sống, không cần MathType.
 * Đặc tả: MathType SDK — MTEF v5 (rtf2latex2e.sourceforge.net/MTEF5.html).
 *
 * Phạm vi: các cấu trúc gặp trong đề thi (phân số, căn, chỉ số, ngoặc, tổng/
 * tích phân/giới hạn, mũ/vector, hệ phương trình, ma trận, trang trí ký tự…).
 * Gặp dữ liệu lạ/cụt → giữ phần đã giải mã + ô "?" (DAU_CHUA_NHAN_DIEN); ký hiệu không nhận diện
 * được cũng hiện ô "?" — không bao giờ mất nội dung lặng lẽ.
 */

// ===== các hằng record =====
const REC_END = 0;
const REC_LINE = 1;
const REC_CHAR = 2;
const REC_TMPL = 3;
const REC_PILE = 4;
const REC_MATRIX = 5;
const REC_EMBELL = 6;
const REC_RULER = 7;
const REC_FONT_STYLE_DEF = 8;
const REC_SIZE = 9;
const REC_COLOR = 15;
const REC_COLOR_DEF = 16;
const REC_FONT_DEF = 17;
const REC_EQN_PREFS = 18;
const REC_ENCODING_DEF = 19;

// typeface (style) trong CHAR
const FN_TEXT = 1;
const FN_FUNCTION = 2;

interface NutLine { kieu: 'line'; trong: boolean; ds: Nut[] }
interface NutChar {
  kieu: 'char';
  typeface: number;
  ma: number | null; // MTCode (Unicode 16-bit)
  /** vị trí ký tự trong PHÔNG (8/16 bit) — dùng khi MTCode thiếu hoặc nằm trong vùng PUA */
  viTriPhong: number | null;
  /** tên phông của ký tự (theo FONT_DEF/FONT_STYLE_DEF/EQN_PREFS), '' nếu không rõ */
  tenPhong: string;
  batDauHam: boolean;
  trangTri: number[]; // các embellishment type
}
interface NutTmpl { kieu: 'tmpl'; selector: number; bienThe: number; ds: Nut[] }
interface NutPile { kieu: 'pile'; ds: Nut[] }
interface NutMatrix { kieu: 'matrix'; hang: number; cot: number; ds: Nut[] }
type Nut = NutLine | NutChar | NutTmpl | NutPile | NutMatrix;

class BoDoc {
  private i = 0;
  private b: Uint8Array;
  /** tên phông theo FONT_DEF (chỉ số từ 1) */
  dsPhong: string[] = [];
  /** typeface → chỉ số FONT_DEF: typeface dương theo EQN_PREFS, âm theo thứ tự FONT_STYLE_DEF */
  phongCuaTypeface = new Map<number, number>();
  soFontStyleDef = 0;
  /** MTEF v3: typeface → tên phông (record FONT) */
  phongV3 = new Map<number, string>();
  constructor(b: Uint8Array) {
    this.b = b;
  }

  tenPhong(typeface: number): string {
    const v3 = this.phongV3.get(typeface);
    if (v3) return v3;
    const idx = this.phongCuaTypeface.get(typeface);
    return idx ? (this.dsPhong[idx - 1] ?? '') : '';
  }

  get het(): boolean { return this.i >= this.b.length; }
  u8(): number {
    if (this.i >= this.b.length) throw new Error('MTEF: het du lieu');
    return this.b[this.i++];
  }
  u16(): number { return this.u8() | (this.u8() << 8); }
  /** signed int: 1 byte biased 128, hoặc 255 + 2 byte */
  soCoDau(): number {
    const b = this.u8();
    if (b === 255) { const v = this.u16(); return v >= 0x8000 ? v - 0x10000 : v; }
    return b - 128;
  }
  /** unsigned int: 1 byte, hoặc 255 + 2 byte */
  soKhongDau(): number {
    const b = this.u8();
    return b === 255 ? this.u16() : b;
  }
  chuoiNull(): string {
    let s = '';
    for (;;) { const c = this.u8(); if (!c) break; s += String.fromCharCode(c); }
    return s;
  }
  nhay(n: number): void { this.i += n; }

  nudge(): void {
    const dx = this.u8();
    const dy = this.u8();
    if (dx === 128 && dy === 128) this.nhay(4);
  }

  /** mảng kích thước nibble trong EQN_PREFS: [count][nibble stream, mỗi mục kết thúc 0xF] */
  boQuaMangKichThuoc(): void {
    const soMuc = this.u8();
    let daXong = 0;
    let nuaSau = false;
    let byteHienTai = 0;
    let batDauMuc = true;
    while (daXong < soMuc) {
      let nib: number;
      if (!nuaSau) { byteHienTai = this.u8(); nib = byteHienTai >> 4; nuaSau = true; }
      else { nib = byteHienTai & 0x0f; nuaSau = false; }
      if (batDauMuc) { batDauMuc = false; continue; } // nibble đơn vị
      if (nib === 0x0f) { daXong += 1; batDauMuc = true; }
    }
  }
}

/**
 * Bỏ qua một bản ghi THUỘC TÍNH (không sinh nội dung): màu, cỡ chữ, kiểu chữ.
 * @returns false nếu `tag` không phải bản ghi thuộc tính
 */
function boQuaThuocTinh(r: BoDoc, tag: number): boolean {
  if (tag === REC_COLOR) r.soKhongDau();
  else if (tag === REC_SIZE) {
    const b = r.u8();
    if (b === 101) r.nhay(2);
    else if (b === 100) { r.u8(); r.nhay(2); }
    else r.u8();
  } else if (tag >= 10 && tag <= 14) {
    // FULL/SUB/SUB2/SYM/SUBSYM — đổi cỡ chữ, không có dữ liệu
  } else if (tag === REC_FONT_STYLE_DEF) {
    // FONT_STYLE_DEF thứ k định nghĩa typeface -k (phông tường minh)
    const idxPhong = r.soKhongDau();
    r.u8(); // char style
    r.soFontStyleDef += 1;
    r.phongCuaTypeface.set(-r.soFontStyleDef, idxPhong);
  } else return false;
  return true;
}

/**
 * Parse danh sách record đến END/EOF, ghi THẲNG vào `ds`. Nút được đưa vào cây TRƯỚC khi đọc
 * phần con — gặp dữ liệu lạ/cụt giữa chừng thì phần đã đọc vẫn nằm trong cây (giải mã một phần).
 */
function docDanhSach(r: BoDoc, ds: Nut[], capNgoai = false): void {
  for (;;) {
    // danh sách lồng phải kết thúc bằng END — hết dữ liệu trước đó là dữ liệu bị cắt
    if (r.het) {
      if (capNgoai) return;
      throw new Error('MTEF: het du lieu giua danh sach');
    }
    const tag = r.u8();
    if (tag === REC_END) return;

    if (tag === REC_LINE) {
      const opt = r.u8();
      if (opt & 0x08) r.nudge();
      if (opt & 0x04) r.u16(); // line spacing
      if (opt & 0x02) { const n = r.u8() === REC_RULER ? r.u8() : 0; r.nhay(n * 3); } // RULER
      const nut: NutLine = { kieu: 'line', trong: !!(opt & 0x01), ds: [] };
      ds.push(nut);
      if (!nut.trong) docDanhSach(r, nut.ds);
    } else if (tag === REC_CHAR) {
      const opt = r.u8();
      if (opt & 0x08) r.nudge();
      const typeface = r.soCoDau();
      let ma: number | null = null;
      let viTriPhong: number | null = null;
      if (!(opt & 0x20)) ma = r.u16(); // MTCode 16-bit
      if (opt & 0x04) viTriPhong = r.u8(); // font position 8-bit
      if (opt & 0x10) viTriPhong = r.u16(); // font position 16-bit
      const nut: NutChar = {
        kieu: 'char', typeface, ma, viTriPhong, tenPhong: r.tenPhong(typeface),
        batDauHam: !!(opt & 0x02), trangTri: [],
      };
      ds.push(nut);
      if (opt & 0x01) {
        // danh sách embellishment đến END
        while (!r.het) {
          const t2 = r.u8();
          if (t2 === REC_END) break;
          if (t2 === REC_EMBELL) {
            const o2 = r.u8();
            if (o2 & 0x08) r.nudge();
            nut.trangTri.push(r.u8());
          } else if (!boQuaThuocTinh(r, t2)) {
            // MathType 7 xen bản ghi thuộc tính (COLOR, SIZE…) vào danh sách trang trí —
            // VD vectơ n⃗ tô màu: [CHAR 'n'][COLOR][EMBELL mũi tên][END]
            throw new Error('MTEF: embell list chua record la ' + t2);
          }
        }
      }
    } else if (tag === REC_TMPL) {
      const opt = r.u8();
      if (opt & 0x08) r.nudge();
      const selector = r.u8();
      let bienThe = r.u8();
      if (bienThe & 0x80) bienThe = (bienThe & 0x7f) | (r.u8() << 8);
      r.u8(); // template-specific options — không cần cho LaTeX
      const nut: NutTmpl = { kieu: 'tmpl', selector, bienThe, ds: [] };
      ds.push(nut);
      docDanhSach(r, nut.ds);
    } else if (tag === REC_PILE) {
      const opt = r.u8();
      if (opt & 0x08) r.nudge();
      r.u8(); // halign
      r.u8(); // valign
      if (opt & 0x02) { const t2 = r.u8(); const n = t2 === REC_RULER ? r.u8() : 0; r.nhay(n * 3); }
      const nut: NutPile = { kieu: 'pile', ds: [] };
      ds.push(nut);
      docDanhSach(r, nut.ds);
    } else if (tag === REC_MATRIX) {
      const opt = r.u8();
      if (opt & 0x08) r.nudge();
      r.u8(); r.u8(); r.u8(); // valign, h_just, v_just
      const hang = r.u8();
      const cot = r.u8();
      r.nhay(Math.ceil(((hang + 1) * 2) / 8)); // đường kẻ ngang
      r.nhay(Math.ceil(((cot + 1) * 2) / 8)); // đường kẻ dọc
      const nut: NutMatrix = { kieu: 'matrix', hang, cot, ds: [] };
      ds.push(nut);
      docDanhSach(r, nut.ds);
    } else if (tag === REC_EMBELL) {
      const opt = r.u8();
      if (opt & 0x08) r.nudge();
      r.u8(); // loại — embell rời ngoài char: bỏ qua
    } else if (tag === REC_RULER) {
      const n = r.u8();
      r.nhay(n * 3);
    } else if (boQuaThuocTinh(r, tag)) {
      // COLOR / SIZE / FULL…SUBSYM / FONT_STYLE_DEF
    } else if (tag === REC_COLOR_DEF) {
      const o = r.u8();
      r.nhay((o & 0x01 ? 4 : 3) * 2);
      if (o & 0x04) r.chuoiNull();
    } else if (tag === REC_FONT_DEF) {
      r.soKhongDau(); // encoding def index
      r.dsPhong.push(r.chuoiNull());
    } else if (tag === REC_EQN_PREFS) {
      r.u8(); // options
      r.boQuaMangKichThuoc(); // sizes
      r.boQuaMangKichThuoc(); // spacing
      // styles: mục thứ s (từ 1) = phông của typeface s (0 = không định nghĩa)
      const soStyle = r.u8();
      for (let s = 1; s <= soStyle; s++) {
        const idx = r.soKhongDau();
        if (idx !== 0) {
          r.u8(); // char style
          r.phongCuaTypeface.set(s, idx);
        }
      }
    } else if (tag === REC_ENCODING_DEF) {
      r.chuoiNull();
    } else if (tag >= 100) {
      r.nhay(r.soKhongDau()); // record tương lai có độ dài đi kèm
    } else {
      throw new Error('MTEF: record khong biet ' + tag);
    }
  }
}

/**
 * MTEF v3 (Microsoft Equation 3.0 — "Equation.3", MathType 3): byte tag = [tùy chọn:4 bit cao]
 * [loại record:4 bit thấp]; không có header app key/options, không có record định nghĩa
 * màu/phông mã hóa. Cây sinh ra dùng chung phần phát LaTeX với v5.
 */
function docDanhSachV3(r: BoDoc, ds: Nut[], capNgoai = false): void {
  for (;;) {
    // danh sách lồng phải kết thúc bằng END — hết dữ liệu trước đó là dữ liệu bị cắt
    if (r.het) {
      if (capNgoai) return;
      throw new Error('MTEF: het du lieu giua danh sach');
    }
    const the = r.u8();
    const loai = the & 0x0f;
    const opt = the >> 4;
    if (loai === REC_END) return;
    // xfLMOVE: LINE/CHAR/TMPL/PILE/MATRIX/EMBELL có nudge ngay sau tag
    if (loai >= REC_LINE && loai <= REC_EMBELL && opt & 0x08) r.nudge();
    if (loai === REC_LINE) {
      if (opt & 0x04) r.u16(); // xfLSPACE
      if (opt & 0x02) { const n = r.u8() === REC_RULER ? r.u8() : 0; r.nhay(n * 3); } // xfRULER
      const nut: NutLine = { kieu: 'line', trong: !!(opt & 0x01), ds: [] };
      ds.push(nut);
      if (!nut.trong) docDanhSachV3(r, nut.ds);
    } else if (loai === REC_CHAR) {
      const typeface = r.soCoDau();
      const ma = r.u16();
      const nut: NutChar = {
        kieu: 'char', typeface, ma, viTriPhong: null, tenPhong: r.tenPhong(typeface),
        batDauHam: !!(opt & 0x01), trangTri: [],
      };
      ds.push(nut);
      if (opt & 0x02) {
        // xfEMBELL: danh sách EMBELL đến END
        while (!r.het) {
          const t2 = r.u8();
          if ((t2 & 0x0f) === REC_END) break;
          if ((t2 & 0x0f) !== REC_EMBELL) throw new Error('MTEF3: embell list chua record la ' + t2);
          if ((t2 >> 4) & 0x08) r.nudge();
          nut.trangTri.push(r.u8());
        }
      }
    } else if (loai === REC_TMPL) {
      const selector = r.u8();
      const bienThe = r.u8();
      r.u8(); // template options
      const nut: NutTmpl = { kieu: 'tmpl', selector, bienThe, ds: [] };
      ds.push(nut);
      docDanhSachV3(r, nut.ds);
    } else if (loai === REC_PILE) {
      r.u8(); // halign
      r.u8(); // valign
      if (opt & 0x02) { const n = r.u8() === REC_RULER ? r.u8() : 0; r.nhay(n * 3); }
      const nut: NutPile = { kieu: 'pile', ds: [] };
      ds.push(nut);
      docDanhSachV3(r, nut.ds);
    } else if (loai === REC_MATRIX) {
      r.u8(); r.u8(); r.u8(); // valign, h_just, v_just
      const hang = r.u8();
      const cot = r.u8();
      r.nhay(Math.ceil(((hang + 1) * 2) / 8));
      r.nhay(Math.ceil(((cot + 1) * 2) / 8));
      const nut: NutMatrix = { kieu: 'matrix', hang, cot, ds: [] };
      ds.push(nut);
      docDanhSachV3(r, nut.ds);
    } else if (loai === REC_EMBELL) {
      r.u8();
    } else if (loai === REC_RULER) {
      r.nhay(r.u8() * 3);
    } else if (loai === 8) {
      // FONT: [typeface][style][tên phông \0]
      const typeface = r.u8() - 128;
      r.u8();
      r.phongV3.set(typeface, r.chuoiNull());
    } else if (loai === REC_SIZE) {
      const b = r.u8();
      if (b === 101) r.nhay(2);
      else if (b === 100) { r.u8(); r.nhay(2); }
      else r.u8();
    } else if (loai >= 10 && loai <= 14) {
      // FULL/SUB/SUB2/SYM/SUBSYM
    } else {
      throw new Error('MTEF3: record khong biet ' + the);
    }
  }
}

// ===== ánh xạ ký tự Unicode/MTCode → LaTeX =====
const BANG_KY_TU: Record<number, string> = {
  0x00b0: '{}^{\\circ}', 0x00b1: '\\pm ', 0x00d7: '\\times ', 0x00f7: '\\div ',
  0x2013: '-', 0x2014: '-', 0x2018: "'", 0x2019: "'", 0x201c: '``', 0x201d: "''",
  0x2026: '\\ldots ', 0x2032: "'", 0x2033: "''", 0x2034: "'''",
  0x2190: '\\leftarrow ', 0x2192: '\\to ', 0x2194: '\\leftrightarrow ',
  0x21d0: '\\Leftarrow ', 0x21d2: '\\Rightarrow ', 0x21d4: '\\Leftrightarrow ',
  0x2200: '\\forall ', 0x2202: '\\partial ', 0x2203: '\\exists ', 0x2205: '\\varnothing ',
  0x2206: '\\Delta ', 0x2207: '\\nabla ', 0x2208: '\\in ', 0x2209: '\\notin ',
  0x220b: '\\ni ', 0x2211: '\\sum ', 0x220f: '\\prod ',
  0x2212: '-', 0x2213: '\\mp ', 0x2215: '/', 0x2217: '*', 0x2218: '\\circ ',
  0x221a: '\\surd ', 0x221d: '\\propto ', 0x221e: '\\infty ',
  0x2220: '\\angle ', 0x2225: '\\parallel ', 0x2226: '\\nparallel ',
  0x2227: '\\wedge ', 0x2228: '\\vee ', 0x2229: '\\cap ', 0x222a: '\\cup ',
  0x222b: '\\int ', 0x2234: '\\therefore ', 0x2235: '\\because ',
  0x223c: '\\sim ', 0x2248: '\\approx ', 0x2260: '\\ne ', 0x2261: '\\equiv ',
  0x2264: '\\le ', 0x2265: '\\ge ', 0x226a: '\\ll ', 0x226b: '\\gg ',
  0x2282: '\\subset ', 0x2283: '\\supset ', 0x2286: '\\subseteq ', 0x2287: '\\supseteq ',
  0x2295: '\\oplus ', 0x2297: '\\otimes ', 0x22a5: '\\perp ',
  0x22c5: '\\cdot ', 0x22ee: '\\vdots ', 0x22ef: '\\cdots ',
  0x2308: '\\lceil ', 0x2309: '\\rceil ', 0x230a: '\\lfloor ', 0x230b: '\\rfloor ',
  0x2329: '\\langle ', 0x232a: '\\rangle ', 0x27e8: '\\langle ', 0x27e9: '\\rangle ',
  0x2115: '\\mathbb{N}', 0x2119: '\\mathbb{P}', 0x211a: '\\mathbb{Q}',
  0x211d: '\\mathbb{R}', 0x2124: '\\mathbb{Z}', 0x2102: '\\mathbb{C}',
  0x210f: '\\hbar ', 0x2113: '\\ell ', 0x2118: '\\wp ', 0x2135: '\\aleph ',
  // Hy Lạp thường
  0x03b1: '\\alpha ', 0x03b2: '\\beta ', 0x03b3: '\\gamma ', 0x03b4: '\\delta ',
  0x03b5: '\\varepsilon ', 0x03b6: '\\zeta ', 0x03b7: '\\eta ', 0x03b8: '\\theta ',
  0x03b9: '\\iota ', 0x03ba: '\\kappa ', 0x03bb: '\\lambda ', 0x03bc: '\\mu ',
  0x03bd: '\\nu ', 0x03be: '\\xi ', 0x03bf: 'o', 0x03c0: '\\pi ', 0x03c1: '\\rho ',
  0x03c2: '\\varsigma ', 0x03c3: '\\sigma ', 0x03c4: '\\tau ', 0x03c5: '\\upsilon ',
  0x03c6: '\\varphi ', 0x03c7: '\\chi ', 0x03c8: '\\psi ', 0x03c9: '\\omega ',
  0x03d5: '\\phi ', 0x03d1: '\\vartheta ', 0x03d6: '\\varpi ',
  // Hy Lạp hoa
  0x0393: '\\Gamma ', 0x0394: '\\Delta ', 0x0398: '\\Theta ', 0x039b: '\\Lambda ',
  0x039e: '\\Xi ', 0x03a0: '\\Pi ', 0x03a3: '\\Sigma ', 0x03a5: '\\Upsilon ',
  // Hy Lạp hoa trùng dạng chữ Latin (phông Symbol hay dùng) → chữ Latin
  0x0391: 'A', 0x0392: 'B', 0x0395: 'E', 0x0396: 'Z', 0x0397: 'H', 0x0399: 'I', 0x039a: 'K',
  0x039c: 'M', 0x039d: 'N', 0x039f: 'O', 0x03a1: 'P', 0x03a4: 'T', 0x03a7: 'X',
  0x03a6: '\\Phi ', 0x03a8: '\\Psi ', 0x03a9: '\\Omega ',
};

const KY_TU_CAN_ESCAPE = new Set(['%', '#', '&', '$', '_', '{', '}']);

/** khoảng trắng/ký tự vô hình cần bỏ hoặc đổi thành space */
const chuyenMa = (ma: number): string => {
  if (ma >= 0x2061 && ma <= 0x2064) return '';
  if (ma === 0x200b || ma === 0xfeff) return '';
  if (ma === 0x00a0 || (ma >= 0x2002 && ma <= 0x200a)) return '\\; ';
  if (ma >= 0xe000 && ma <= 0xf8ff) return ''; // vùng PUA của MathType (ký tự dàn trang)
  const daBiet = BANG_KY_TU[ma];
  if (daBiet !== undefined) return daBiet;
  const ch = String.fromCharCode(ma);
  if (KY_TU_CAN_ESCAPE.has(ch)) return '\\' + ch;
  if (ch === '\\') return '\\backslash ';
  if (ch === '~') return '\\sim ';
  if (ch === '^') return '\\hat{} ';
  return ch;
};

/**
 * Ô đánh dấu phần công thức KHÔNG nhận diện được (ký hiệu lạ / dữ liệu hỏng giữa chừng) —
 * hiện rõ "?" trong khung để người soạn thấy và sửa, không bao giờ mất nội dung lặng lẽ.
 */
export const DAU_CHUA_NHAN_DIEN = '\\boxed{?}';

/** Phông Symbol (Adobe Symbol encoding): vị trí ký tự → Unicode; 0 = mảnh ngoặc lớn (bỏ) */
const BANG_SYMBOL: Record<number, number> = (() => {
  const b: Record<number, number> = {};
  const ascii = ' !∀#∃%&∋()∗+,−./0123456789:;<=>?≅ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ[∴]⊥_‾αβχδεφγηιϕκλμνοπθρστυϖωξψζ{|}∼';
  Array.from(ascii).forEach((c, i) => { b[0x20 + i] = c.codePointAt(0) ?? 0; });
  const cao = 'ϒ′≤⁄∞ƒ♣♦♥♠↔←↑→↓°±″≥×∝∂•÷≠≡≈…⏐⎯↵ℵℑℜ℘⊗⊕∅∩∪⊃⊇⊄⊂⊆∈∉∠∇®©™∏√⋅¬∧∨⇔⇐⇑⇒⇓◊〈®©™∑';
  Array.from(cao).forEach((c, i) => { b[0xa1 + i] = c.codePointAt(0) ?? 0; });
  for (let v = 0xe6; v <= 0xef; v++) b[v] = 0; // mảnh ngoặc tròn/vuông/nhọn
  b[0xf1] = 0x232a; // 〉
  b[0xf2] = 0x222b; // ∫
  for (let v = 0xf3; v <= 0xfe; v++) b[v] = 0; // mảnh tích phân/ngoặc
  return b;
})();

/** Khoảng trắng riêng của MathType (MTCode PUA EF00–EF0F, typeface fnSPACE) */
const KHOANG_TRANG_MT: Record<number, string> = {
  0xef00: '', 0xef01: '\\, ', 0xef02: '\\, ', 0xef03: '\\: ', 0xef04: '\\quad ',
  0xef05: '\\; ', 0xef06: '\\, ', 0xef07: '\\! ', 0xef08: '\\, ',
};
const FN_MARKER = 23;
const FN_SPACE = 24;

/** Ghi nhận ký tự lạ trong lượt giải mã hiện tại (đọc bởi mtefSangLatexChiTiet) */
let kyTuLaLuotNay: string[] = [];

const laPua = (ma: number) => ma >= 0xe000 && ma <= 0xf8ff;

/**
 * Ký tự MTEF → LaTeX, có xử lý vùng ký tự riêng (PUA) của MathType:
 * - khoảng trắng riêng MathType (EF0x, fnSPACE) → khoảng cách LaTeX; dấu định vị (fnMARKER) → bỏ;
 * - quy ước "symbol font" của Windows F020–F0FF, hoặc ký tự phông Symbol → tra bảng Symbol;
 * - thiếu MTCode nhưng có vị trí trong phông chữ thường → dùng vị trí đó (ASCII);
 * - còn lại → ô "?" (DAU_CHUA_NHAN_DIEN) + ghi nhận để cảnh báo.
 */
function chuyenKyTu(n: NutChar): string {
  if (n.typeface === FN_MARKER) return '';
  const ma = n.ma;
  if (ma != null && KHOANG_TRANG_MT[ma] !== undefined) return KHOANG_TRANG_MT[ma];
  if (n.typeface === FN_SPACE) return '\\, ';
  if (ma != null && !laPua(ma)) return chuyenMa(ma);

  const laSymbol = /symbol/i.test(n.tenPhong);
  const laMtExtra = /mt\s*extra/i.test(n.tenPhong);
  const viTri = ma != null && ma >= 0xf020 && ma <= 0xf0ff ? ma & 0xff : n.viTriPhong;
  if (viTri != null && !laMtExtra) {
    if (laSymbol || (ma != null && ma >= 0xf020 && ma <= 0xf0ff)) {
      const u = BANG_SYMBOL[viTri];
      if (u === 0) return ''; // mảnh ngoặc lớn — ngoặc đã có ở template
      if (u) return chuyenMa(u);
    } else if (viTri >= 0x20 && viTri < 0x7f) {
      return chuyenMa(viTri); // phông chữ thường: vị trí = mã ASCII
    }
  }
  kyTuLaLuotNay.push(
    `${ma != null ? `U+${ma.toString(16).toUpperCase()}` : 'không MTCode'}` +
      `${viTri != null ? ` @${viTri.toString(16)}` : ''}${n.tenPhong ? ` (${n.tenPhong})` : ''}`,
  );
  return DAU_CHUA_NHAN_DIEN;
}

const HAM_CHUAN = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'coth', 'log', 'ln', 'lg', 'exp', 'lim', 'max',
  'min', 'sup', 'inf', 'det', 'gcd', 'arg', 'deg', 'dim', 'ker', 'mod',
]);

/** embellishment → hàm bọc LaTeX */
const TRANG_TRI: Record<number, (s: string) => string> = {
  2: (s) => `\\dot{${s}}`,
  3: (s) => `\\ddot{${s}}`,
  4: (s) => `\\dddot{${s}}`,
  5: (s) => `${s}'`,
  6: (s) => `${s}''`,
  18: (s) => `${s}'''`,
  7: (s) => `${s}^{\\backprime}`,
  8: (s) => `\\tilde{${s}}`,
  9: (s) => `\\hat{${s}}`,
  10: (s) => `\\cancel{${s}}`,
  11: (s) => `\\vec{${s}}`,
  12: (s) => `\\overleftarrow{${s}}`,
  13: (s) => `\\overleftrightarrow{${s}}`,
  14: (s) => `\\vec{${s}}`,
  15: (s) => `\\overleftarrow{${s}}`,
  16: (s) => `\\bar{${s}}`,
  17: (s) => `\\bar{${s}}`,
  19: (s) => `\\overset{\\frown}{${s}}`,
  20: (s) => `\\overset{\\smile}{${s}}`,
  21: (s) => `\\xcancel{${s}}`,
  22: (s) => `\\cancel{${s}}`,
  23: (s) => `\\bcancel{${s}}`,
  24: (s) => `\\ddddot{${s}}`,
  25: (s) => `\\underset{\\cdot}{${s}}`,
  26: (s) => `\\underset{\\cdot\\cdot}{${s}}`,
  27: (s) => `\\underset{\\cdot\\cdot\\cdot}{${s}}`,
  28: (s) => `\\underset{\\cdot\\cdot\\cdot\\cdot}{${s}}`,
  29: (s) => `\\underline{${s}}`,
  30: (s) => `\\utilde{${s}}`,
  31: (s) => `\\underset{\\frown}{${s}}`,
  32: (s) => `\\underset{\\smile}{${s}}`,
  33: (s) => `\\underrightarrow{${s}}`,
  34: (s) => `\\underleftarrow{${s}}`,
  35: (s) => `\\underleftrightarrow{${s}}`,
  36: (s) => `\\underrightarrow{${s}}`,
  37: (s) => `\\underleftarrow{${s}}`,
};

// ===== sinh LaTeX từ cây =====

const laLine = (n: Nut | undefined): n is NutLine => !!n && n.kieu === 'line';
const laChar = (n: Nut | undefined): n is NutChar => !!n && n.kieu === 'char';

const phatLine = (n: Nut | undefined): string => (laLine(n) ? phatDanhSach(n.ds) : n ? phatNut(n) : '');

const bocNhom = (s: string): string => {
  const g = s.trim();
  return g.length <= 1 ? (g || '{}') : `{${g}}`;
};

/** ký tự ngoặc → dạng hợp lệ sau \left / \right */
const ngoacLatex = (ch: string, macDinh: string): string => {
  const map: Record<string, string> = {
    '(': '(', ')': ')', '[': '[', ']': ']', '{': '\\{', '}': '\\}', '|': '|',
    '‖': '\\Vert ', '⟨': '\\langle ', '⟩': '\\rangle ', '〈': '\\langle ', '〉': '\\rangle ',
    '⌊': '\\lfloor ', '⌋': '\\rfloor ', '⌈': '\\lceil ', '⌉': '\\rceil ',
  };
  return ch ? (map[ch] ?? macDinh) : macDinh;
};

const kyTuCua = (n: Nut | undefined): string =>
  laChar(n) && n.ma != null ? String.fromCharCode(n.ma) : '';

/** toán tử lớn → lệnh LaTeX */
const TOAN_TU_LON: Record<string, string> = {
  '∫': '\\int', '∬': '\\iint', '∭': '\\iiint', '∮': '\\oint', '∯': '\\oiint',
  '∑': '\\sum', '∏': '\\prod', '∐': '\\coprod',
  '⋃': '\\bigcup', '⋂': '\\bigcap', '⋁': '\\bigvee', '⋀': '\\bigwedge',
  '⊕': '\\bigoplus', '⊗': '\\bigotimes',
};

function phatTmpl(t: NutTmpl): string {
  const s = t.selector;
  const ds = t.ds;

  // 0-9: các loại ngoặc — subobject: [main][char trái][char phải]
  if (s >= 0 && s <= 9) {
    const main = ds.find(laLine);
    const cacChar = ds.filter(laChar);
    const macDinh: Record<number, [string, string]> = {
      0: ['\\langle ', '\\rangle '], 1: ['(', ')'], 2: ['\\{', '\\}'], 3: ['[', ']'],
      4: ['|', '|'], 5: ['\\Vert ', '\\Vert '], 6: ['\\lfloor ', '\\rfloor '],
      7: ['\\lceil ', '\\rceil '], 8: ['[', ']'], 9: ['(', ')'],
    };
    let [trai, phai] = macDinh[s];
    if (cacChar.length >= 2) {
      trai = ngoacLatex(kyTuCua(cacChar[0]), trai);
      phai = ngoacLatex(kyTuCua(cacChar[1]), phai);
    } else if (cacChar.length === 1) {
      // chỉ một fence — theo bienThe: 1 = chỉ trái, 2 = chỉ phải
      if (t.bienThe === 2) { trai = '.'; phai = ngoacLatex(kyTuCua(cacChar[0]), phai); }
      else { trai = ngoacLatex(kyTuCua(cacChar[0]), trai); phai = '.'; }
    }
    if (t.bienThe === 1 && cacChar.length < 2) phai = phai === '.' ? '.' : phai;
    const ruotNut = main ? main.ds : [];
    // hệ phương trình: { + PILE bên trong → cases
    if (s === 2 && ruotNut.some((x) => x.kieu === 'pile') && (t.bienThe === 1 || phai === '.')) {
      const pile = ruotNut.find((x): x is NutPile => x.kieu === 'pile');
      if (pile) {
        const dong = pile.ds.filter(laLine).map((l) => phatDanhSach(l.ds));
        return `\\begin{cases}${dong.join(' \\\\ ')}\\end{cases}`;
      }
    }
    return `\\left${trai}${phatLine(main)}\\right${phai}`;
  }

  if (s === 10) {
    // ROOT: [main(biểu thức dưới căn)][bậc]
    const lines = ds.filter(laLine);
    const ruot = phatLine(lines[0]);
    const bac = lines[1] && !lines[1].trong ? phatDanhSach(lines[1].ds).trim() : '';
    return t.bienThe === 1 && bac ? `\\sqrt[${bac}]{${ruot}}` : `\\sqrt{${ruot}}`;
  }

  if (s === 11) {
    // FRACT: [tử][mẫu]
    const lines = ds.filter(laLine);
    const tu = phatLine(lines[0]);
    const mau = phatLine(lines[1]);
    if (t.bienThe & 0x02) return `${bocNhom(tu)}/${bocNhom(mau)}`; // dạng gạch chéo
    return `\\frac{${tu}}{${mau}}`;
  }

  if (s === 12) return `\\underline{${phatLine(ds.find(laLine))}}`;
  if (s === 13) return `\\overline{${phatLine(ds.find(laLine))}}`;

  if (s === 14) {
    // ARROW: LINE trên/dưới + char mũi tên
    const lines = ds.filter(laLine).filter((l) => !l.trong);
    const tren = lines[0] ? phatDanhSach(lines[0].ds).trim() : '';
    const duoi = lines[1] ? phatDanhSach(lines[1].ds).trim() : '';
    const sangTrai = !!(t.bienThe & 0x10) && !(t.bienThe & 0x20);
    const doi = !!(t.bienThe & 0x01);
    const lenh = sangTrai ? (doi ? '\\xLeftarrow' : '\\xleftarrow') : (doi ? '\\xRightarrow' : '\\xrightarrow');
    if (!tren && !duoi) return sangTrai ? '\\leftarrow ' : '\\to ';
    return duoi ? `${lenh}[${duoi}]{${tren}}` : `${lenh}{${tren}}`;
  }

  if (s >= 15 && s <= 22) {
    // toán tử lớn: [main][cận trên][cận dưới] + char toán tử
    const lines = ds.filter(laLine);
    const opChar = ds.filter(laChar).map(kyTuCua).find((c) => TOAN_TU_LON[c]);
    const macDinhOp: Record<number, string> = {
      15: '\\int', 16: '\\sum', 17: '\\prod', 18: '\\coprod',
      19: '\\bigcup', 20: '\\bigcap', 21: '\\int', 22: '\\sum',
    };
    const op = (opChar && TOAN_TU_LON[opChar]) || macDinhOp[s];
    // thứ tự slot thực tế (đối chiếu dữ liệu MathType): [main][cận dưới][cận trên]
    const main = phatLine(lines[0]);
    const duoi = lines[1] && !lines[1].trong ? phatDanhSach(lines[1].ds).trim() : '';
    const tren = lines[2] && !lines[2].trong ? phatDanhSach(lines[2].ds).trim() : '';
    let kq = op;
    if (duoi) kq += `_{${duoi}}`;
    if (tren) kq += `^{${tren}}`;
    return `${kq} ${main}`;
  }

  if (s === 23) {
    // LIM: [main][dưới][trên]
    const lines = ds.filter(laLine);
    const main = phatDanhSach(lines[0]?.ds ?? []).trim();
    const duoi = lines[1] && !lines[1].trong ? phatDanhSach(lines[1].ds).trim() : '';
    const tren = lines[2] && !lines[2].trong ? phatDanhSach(lines[2].ds).trim() : '';
    const thanLaHam = /^\\(lim|max|min|sup|inf)\s*$/.test(main.trim());
    if (thanLaHam && duoi && !tren) return `${main.trim()}_{${duoi}} `;
    if (duoi && tren) return `\\overset{${tren}}{\\underset{${duoi}}{${main}}}`;
    if (duoi) return `\\underset{${duoi}}{${main}}`;
    if (tren) return `\\overset{${tren}}{${main}}`;
    return main;
  }

  if (s === 24 || s === 25) {
    // HBRACE/HBRACK: [main][chú thích]
    const lines = ds.filter(laLine);
    const main = phatLine(lines[0]);
    const chuThich = lines[1] && !lines[1].trong ? phatDanhSach(lines[1].ds).trim() : '';
    const tren = !!(t.bienThe & 0x01);
    const lenh = tren ? '\\overbrace' : '\\underbrace';
    if (!chuThich) return `${lenh}{${main}}`;
    return tren ? `${lenh}{${main}}^{${chuThich}}` : `${lenh}{${main}}_{${chuThich}}`;
  }

  if (s === 26) {
    // chia dọc (long division) — hiếm; giữ dạng đơn giản
    const lines = ds.filter(laLine);
    return `${phatLine(lines[1])}\\overline{\\left)${phatLine(lines[0])}\\right.}`;
  }

  if (s >= 27 && s <= 29) {
    // SUB (27): 1 dòng chỉ số dưới · SUP (28): 1 dòng chỉ số trên ·
    // SUBSUP (29): [dưới][trên] — gắn vào phần tử đứng trước trong dòng cha
    const lines = ds.filter(laLine);
    const dong = (l?: NutLine) => (l && !l.trong ? phatDanhSach(l.ds).trim() : '');
    // luôn 2 dòng [dưới][trên]; dòng không dùng là LINE NULL (VD x² = [NULL]['2'])
    const duoi = dong(lines[0]);
    const tren = dong(lines[1]);
    let kq = '';
    if (t.bienThe & 0x01) kq += '{}'; // prescript (đứng trước cơ số)
    if (duoi) kq += `_{${duoi}}`;
    if (tren) kq += `^{${tren}}`;
    return kq;
  }

  if (s === 30) {
    // DIRAC ⟨a|b⟩
    const lines = ds.filter(laLine);
    const trai = phatLine(lines[0]);
    const phai = phatLine(lines[1]);
    return `\\left\\langle ${trai}\\middle|${phai}\\right\\rangle `;
  }

  if (s === 31) {
    const main = phatLine(ds.find(laLine)).trim();
    const traiPhai = (t.bienThe & 0x01) && (t.bienThe & 0x02);
    if (traiPhai) return `\\overleftrightarrow{${main}}`;
    if (t.bienThe & 0x01) return `\\overleftarrow{${main}}`;
    return main.length > 1 ? `\\overrightarrow{${main}}` : `\\vec{${main}}`;
  }

  if (s === 32) { const m = phatLine(ds.find(laLine)).trim(); return m.length > 1 ? `\\widetilde{${m}}` : `\\tilde{${m}}`; }
  if (s === 33) { const m = phatLine(ds.find(laLine)).trim(); return m.length > 1 ? `\\widehat{${m}}` : `\\hat{${m}}`; }
  if (s === 34) return `\\overgroup{${phatLine(ds.find(laLine))}}`;
  if (s === 35) return phatLine(ds.find(laLine));
  if (s === 36) return `\\cancel{${phatLine(ds.find(laLine))}}`;
  if (s === 37) return `\\boxed{${phatLine(ds.find(laLine))}}`;

  // selector lạ: nối nội dung con để không mất chữ
  return ds.map(phatNut).join('');
}

function phatNut(n: Nut): string {
  if (n.kieu === 'line') return phatDanhSach(n.ds);
  if (n.kieu === 'pile') {
    const dong = n.ds.filter(laLine).map((l) => phatDanhSach(l.ds));
    return `\\begin{gathered}${dong.join(' \\\\ ')}\\end{gathered}`;
  }
  if (n.kieu === 'matrix') {
    const cells = n.ds.filter(laLine).map((l) => phatDanhSach(l.ds));
    const hangs: string[] = [];
    for (let i = 0; i < n.hang; i++) hangs.push(cells.slice(i * n.cot, (i + 1) * n.cot).join(' & '));
    return `\\begin{matrix}${hangs.join(' \\\\ ')}\\end{matrix}`;
  }
  if (n.kieu === 'tmpl') return phatTmpl(n);
  // char đơn lẻ (ngoài phatDanhSach — hiếm)
  return chuyenKyTu(n);
}

/** phát một dãy nút — gộp chuỗi ký tự thành tên hàm/\text */
function phatDanhSach(ds: Nut[]): string {
  let kq = '';
  let i = 0;
  while (i < ds.length) {
    const n = ds[i];
    if (laChar(n)) {
      // gộp tên hàm: các CHỮ CÁI fnFUNCTION liên tiếp (dấu câu để rơi xuống xử lý thường)
      const laChuCai = (ma: number) => (ma >= 0x41 && ma <= 0x5a) || (ma >= 0x61 && ma <= 0x7a);
      if (n.typeface === FN_FUNCTION && n.ma != null && laChuCai(n.ma)) {
        let ten = '';
        while (i < ds.length) {
          const c = ds[i];
          if (
            laChar(c) && c.typeface === FN_FUNCTION && c.ma != null &&
            laChuCai(c.ma) && c.trangTri.length === 0
          ) {
            ten += String.fromCharCode(c.ma);
            i += 1;
          } else break;
        }
        kq += HAM_CHUAN.has(ten) ? `\\${ten} ` : `\\operatorname{${ten}}`;
        continue;
      }
      // gộp chữ thường (text style) thành \text{}
      if (n.typeface === FN_TEXT && n.ma != null) {
        let text = '';
        while (i < ds.length) {
          const c = ds[i];
          if (laChar(c) && c.typeface === FN_TEXT && c.ma != null && c.trangTri.length === 0) {
            text += String.fromCharCode(c.ma);
            i += 1;
          } else break;
        }
        // chế độ chữ của KaTeX: \ ^ ~ phải viết bằng lệnh riêng, không thì báo lỗi đỏ
        const LENH_CHU: Record<string, string> = {
          '\\': '\\textbackslash{}', '^': '\\textasciicircum{}', '~': '\\textasciitilde{}',
        };
        kq += `\\text{${text.replace(/[%#&$_{}\\^~]/g, (c) => LENH_CHU[c] ?? `\\${c}`)}}`;
        continue;
      }
      let ch = chuyenKyTu(n);
      for (const tt of n.trangTri) {
        const boc = TRANG_TRI[tt];
        if (boc) ch = boc(ch.trim() || '{}');
      }
      kq += ch;
      i += 1;
      continue;
    }
    kq += phatNut(n);
    i += 1;
  }
  return kq;
}

/** Cách đọc phần thân MTEF theo phiên bản */
type CachDoc = 'v5' | 'v4' | 'v3';

/** Đọc cây theo một cách đọc; lỗi giữa chừng → giữ phần đã đọc (`hong` = true) */
function docCay(bytes: Uint8Array, cach: CachDoc): { ds: Nut[]; hong: boolean } {
  const r = new BoDoc(bytes);
  const ds: Nut[] = [];
  try {
    r.u8(); // version
    r.nhay(4); // platform, product, product version, product subversion
    if (cach === 'v5') {
      r.chuoiNull(); // application key (VD "DSMT7")
      r.u8(); // equation options
    }
    if (cach === 'v3') docDanhSachV3(r, ds, true);
    else docDanhSach(r, ds, true);
    return { ds, hong: false };
  } catch {
    return { ds, hong: true };
  }
}

const demKyTu = (ds: Nut[]): number =>
  ds.reduce((tong, n) => tong + (n.kieu === 'char' ? 1 : demKyTu(n.ds)), 0);

export interface KetQuaMtef {
  /** LaTeX (null = không giải mã được gì) */
  latex: string | null;
  /** Dữ liệu lạ/hỏng giữa chừng — chỉ giải mã được một phần, cuối có ô "?" */
  motPhan: boolean;
  /** Các ký tự không nhận diện được (đã hiện thành ô "?") — mô tả để chẩn đoán */
  kyTuLa: string[];
}

/**
 * Giải mã MTEF → LaTeX kèm thông tin chất lượng:
 * - v5 (MathType 4+ / 7), v3 (Equation 3.0); v4 (MathType 3.5, không có đặc tả công khai) thử
 *   lần lượt cách đọc kiểu v5 rồi kiểu v3, lấy cách đọc trọn vẹn;
 * - gặp bản ghi lạ/dữ liệu cụt: GIỮ phần đã giải mã + ô "?" ở cuối (motPhan) thay vì bỏ cả công thức.
 */
export function mtefSangLatexChiTiet(bytes: Uint8Array): KetQuaMtef {
  const rong: KetQuaMtef = { latex: null, motPhan: false, kyTuLa: [] };
  if (bytes.length < 6) return rong;
  const phienBan = bytes[0];
  const cacCach: CachDoc[] = phienBan === 5 ? ['v5'] : phienBan === 3 ? ['v3'] : phienBan === 4 ? ['v4', 'v3'] : [];
  let tot: { ds: Nut[]; hong: boolean } | null = null;
  for (const cach of cacCach) {
    const kq = docCay(bytes, cach);
    if (!demKyTu(kq.ds)) continue;
    if (!kq.hong) { tot = kq; break; }
    if (!tot || demKyTu(kq.ds) > demKyTu(tot.ds)) tot = kq;
  }
  if (!tot) return rong;
  kyTuLaLuotNay = [];
  try {
    let latex = tot.ds.map(phatNut).join('').replace(/\s+/g, ' ').trim();
    if (tot.hong) latex = `${latex} ${DAU_CHUA_NHAN_DIEN}`.trim();
    return { latex: latex || null, motPhan: tot.hong, kyTuLa: kyTuLaLuotNay };
  } catch {
    return rong;
  } finally {
    kyTuLaLuotNay = [];
  }
}

export function mtefSangLatex(bytes: Uint8Array): string | null {
  return mtefSangLatexChiTiet(bytes).latex;
}
