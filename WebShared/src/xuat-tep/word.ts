/**
 * Ghi tệp Word .docx THẬT (Office Open XML) bằng jszip — không cần thư viện Word.
 * Khối nội dung: tiêu đề, đoạn, bảng, danh sách, quốc hiệu (văn bản hành chính), chữ ký, ngắt trang và
 * HTML giàu định dạng của câu hỏi (đậm/nghiêng/gạch chân/chỉ số, bảng, ảnh nhúng, công thức → phương trình Word).
 * Tùy chọn: khổ dọc/ngang, đầu/chân trang, đánh số trang "Trang x / y", watermark chéo trang (người xuất + mã theo dõi).
 */
import JSZip from 'jszip';
import { boCongThuc } from './boCongThuc';
import { taiTep, tenTepXuat } from './taiTep';

export type Canh = 'trai' | 'giua' | 'phai' | 'deu';

export interface DoanChu {
  chu: string;
  dam?: boolean;
  nghieng?: boolean;
  gachChan?: boolean;
  /** Màu chữ hex không dấu # (VD "C00000") */
  mau?: string;
  /** Cỡ chữ pt */
  co?: number;
}

/** Ô bảng: chữ thường, HTML giàu định dạng, hoặc các đoạn chữ có định dạng */
export type OWord = string | number | null | undefined | { html: string } | { doan: DoanChu[]; canh?: Canh };

export type KhoiWord =
  | { loai: 'tieu-de'; noiDung: string; cap?: 1 | 2 | 3; canh?: Canh }
  | { loai: 'doan'; noiDung: string | DoanChu[]; canh?: Canh; dam?: boolean; nghieng?: boolean; co?: number; thutDau?: boolean }
  | { loai: 'html'; html: string }
  | {
      loai: 'bang';
      cot: { tieuDe: string; rong?: number; canh?: Canh }[];
      dong: OWord[][];
      /** Bảng không khung (bố cục 2 cột…) */
      khongVien?: boolean;
      /** Không in dòng tiêu đề cột */
      khongDauBang?: boolean;
    }
  | { loai: 'danh-sach'; muc: (string | DoanChu[])[]; soThuTu?: boolean }
  | {
      loai: 'quoc-hieu';
      donViCapTren?: string;
      donVi: string;
      /** Số văn bản (VD "Số: 12/BB-THCSNK") */
      so?: string;
      /** "Hà Nội, ngày 28 tháng 9 năm 2026" */
      diaDanhNgay?: string;
    }
  | { loai: 'chu-ky'; cot: { chucDanh: string; hoTen?: string; ghiChu?: string }[] }
  | { loai: 'ngat-trang' }
  | { loai: 'dong-trong'; so?: number };

export interface TuyChonWord {
  tieuDe?: string;
  nguoiTao?: string;
  huong?: 'doc' | 'ngang';
  /** Chữ mờ chéo giữa mỗi trang (VD người xuất + mã theo dõi) */
  watermark?: string;
  dauTrang?: string;
  chanTrang?: string;
  /** Mặc định có "Trang x / y" ở chân trang */
  khongDanhSoTrang?: boolean;
}

const xml = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const JC: Record<Canh, string> = { trai: 'left', giua: 'center', phai: 'right', deu: 'both' };

interface DinhDang {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  s?: boolean;
  sub?: boolean;
  sup?: boolean;
  mau?: string;
  co?: number;
}

function rPr(f: DinhDang): string {
  const p = [
    f.b && '<w:b/>',
    f.i && '<w:i/>',
    f.s && '<w:strike/>',
    f.mau && `<w:color w:val="${f.mau}"/>`,
    f.co && `<w:sz w:val="${Math.round(f.co * 2)}"/><w:szCs w:val="${Math.round(f.co * 2)}"/>`,
    f.u && '<w:u w:val="single"/>',
    f.sub && '<w:vertAlign w:val="subscript"/>',
    f.sup && '<w:vertAlign w:val="superscript"/>',
  ]
    .filter(Boolean)
    .join('');
  return p ? `<w:rPr>${p}</w:rPr>` : '';
}

/** Một đoạn chữ; xuống dòng "\n" → <w:br/>, tab → <w:tab/> */
function run(chu: string, f: DinhDang = {}): string {
  if (!chu) return '';
  const pr = rPr(f);
  return chu
    .split('\n')
    .map((dong, i) => {
      const phan = dong.split('\t').map((x) => (x ? `<w:t xml:space="preserve">${xml(x)}</w:t>` : '')).join('<w:tab/>');
      return `<w:r>${pr}${i ? '<w:br/>' : ''}${phan}</w:r>`;
    })
    .join('');
}

function para(noiDung: string, o: { canh?: Canh; kieu?: string; thutDau?: boolean; giuVoiSau?: boolean; khoangSau?: number; vienDuoi?: boolean; tabPhai?: number } = {}): string {
  const pp = [
    o.kieu && `<w:pStyle w:val="${o.kieu}"/>`,
    o.giuVoiSau && '<w:keepNext/>',
    o.vienDuoi && '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="808080"/></w:pBdr>',
    o.tabPhai && `<w:tabs><w:tab w:val="right" w:pos="${o.tabPhai}"/></w:tabs>`,
    o.khoangSau != null && `<w:spacing w:after="${o.khoangSau}"/>`,
    o.thutDau && '<w:ind w:firstLine="567"/>',
    o.canh && `<w:jc w:val="${JC[o.canh]}"/>`,
  ]
    .filter(Boolean)
    .join('');
  return `<w:p>${pp ? `<w:pPr>${pp}</w:pPr>` : ''}${noiDung}</w:p>`;
}

const doanChuSangRun = (ds: DoanChu[]) => ds.map((d) => run(d.chu, { b: d.dam, i: d.nghieng, u: d.gachChan, mau: d.mau, co: d.co })).join('');

// ————— Ảnh —————

interface AnhNhung {
  duoi: 'png' | 'jpeg' | 'gif';
  du: Uint8Array;
  rong: number;
  cao: number;
}

async function taiAnh(src: string): Promise<AnhNhung | null> {
  try {
    const blob = await (await fetch(src)).blob();
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const rong = img.naturalWidth || 300;
      const cao = img.naturalHeight || 200;
      const kieu = blob.type.toLowerCase();
      if (kieu === 'image/png' || kieu === 'image/jpeg' || kieu === 'image/jpg' || kieu === 'image/gif')
        return { duoi: kieu.includes('png') ? 'png' : kieu.includes('gif') ? 'gif' : 'jpeg', du: new Uint8Array(await blob.arrayBuffer()), rong, cao };
      // SVG, WebP… → vẽ lại thành PNG để Word nào cũng mở được
      const canvas = document.createElement('canvas');
      canvas.width = rong;
      canvas.height = cao;
      canvas.getContext('2d')?.drawImage(img, 0, 0, rong, cao);
      const png = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
      return png ? { duoi: 'png', du: new Uint8Array(await png.arrayBuffer()), rong, cao } : null;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}

class NguCanh {
  anh: { id: string; tep: string; du: Uint8Array }[] = [];
  private boNho = new Map<string, AnhNhung | null>();
  private soHinh = 0;
  rongNoiDungTwip: number;
  constructor(rongNoiDungTwip: number) {
    this.rongNoiDungTwip = rongNoiDungTwip;
  }

  async napAnh(dsSrc: string[]) {
    await Promise.all([...new Set(dsSrc)].filter((s) => !this.boNho.has(s)).map(async (s) => this.boNho.set(s, await taiAnh(s))));
  }

  /** Ảnh inline; `rongPx` theo thuộc tính width của thẻ img nếu có */
  hinh(src: string, rongPx?: number): string {
    const a = this.boNho.get(src);
    if (!a) return run('[Hình ảnh không tải được]', { i: true, mau: '808080' });
    this.soHinh++;
    const id = `rIdAnh${this.soHinh}`;
    const tep = `anh${this.soHinh}.${a.duoi}`;
    this.anh.push({ id, tep, du: a.du });
    const EMU_PX = 9525;
    const toiDa = Math.floor((this.rongNoiDungTwip / 1440) * 914400);
    let cx = (rongPx ?? a.rong) * EMU_PX;
    let cy = Math.round(cx * (a.cao / a.rong));
    if (cx > toiDa) {
      cy = Math.round((cy * toiDa) / cx);
      cx = toiDa;
    }
    const n = this.soHinh;
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Hình ${n}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="${tep}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }
}

// ————— HTML → OOXML —————

const KHOI = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'section', 'article', 'header', 'footer', 'figure', 'figcaption', 'li', 'dd', 'dt']);

function canhCua(el: Element): Canh | undefined {
  const t = ((el as HTMLElement).style?.textAlign || el.getAttribute('align') || '').toLowerCase();
  return t === 'center' ? 'giua' : t === 'right' ? 'phai' : t === 'justify' ? 'deu' : t === 'left' ? 'trai' : undefined;
}

function htmlSangOoxml(html: string, nc: NguCanh, rongTwip = nc.rongNoiDungTwip, fGoc: DinhDang = {}): string {
  const goc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  const out: string[] = [];
  let runs: string[] = [];
  let pp: { canh?: Canh; kieu?: string } = {};
  const xa = () => {
    if (runs.length) out.push(para(runs.join(''), pp));
    runs = [];
    pp = {};
  };

  const noiTuyen = (n: Node, f: DinhDang) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n.textContent ?? '').replace(/\s+/g, ' ');
      if (t.trim() || (t === ' ' && runs.length)) runs.push(run(t, f));
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const el = n as HTMLElement;
    const tag = el.localName;
    const latex = el.getAttribute('data-cong-thuc') ?? el.getAttribute('data-latex');
    if (latex != null) return void runs.push(boCongThuc.omml(latex));
    if (tag === 'br') return void runs.push('<w:r><w:br/></w:r>');
    if (tag === 'img') {
      const src = el.getAttribute('src');
      if (src) runs.push(nc.hinh(src, Number(el.getAttribute('width')) || parseInt(el.style.width) || undefined));
      return;
    }
    if (tag === 'audio') return void runs.push(run('[Tệp âm thanh]', { i: true, mau: '808080' }));
    if (tag === 'video' || tag === 'iframe') return void runs.push(run('[Video]', { i: true, mau: '808080' }));
    if (tag === 'script' || tag === 'style' || tag === 'annotation') return;
    if (tag === 'table') {
      xa();
      out.push(bangHtml(el));
      return;
    }
    if (tag === 'hr') {
      xa();
      out.push(para('', { vienDuoi: true }));
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      xa();
      Array.from(el.children).forEach((li, i) => {
        runs.push(run(tag === 'ol' ? `${i + 1}. ` : '• ', f));
        Array.from(li.childNodes).forEach((c) => (KHOI.has((c as Element).localName ?? '') ? khoi(c as Element, f) : noiTuyen(c, f)));
        xa();
      });
      return;
    }
    if (KHOI.has(tag)) return khoi(el, f);
    const st = el.style;
    const f2: DinhDang = {
      ...f,
      b: f.b || tag === 'b' || tag === 'strong' || st?.fontWeight === 'bold' || Number(st?.fontWeight) >= 600,
      i: f.i || tag === 'i' || tag === 'em' || st?.fontStyle === 'italic',
      u: f.u || tag === 'u' || st?.textDecoration?.includes('underline'),
      s: f.s || tag === 's' || tag === 'strike' || tag === 'del',
      sub: f.sub || tag === 'sub',
      sup: f.sup || tag === 'sup',
    };
    el.childNodes.forEach((c) => noiTuyen(c, f2));
  };

  const khoi = (el: Element, f: DinhDang) => {
    xa();
    const tag = el.localName;
    pp = { canh: canhCua(el), kieu: /^h[1-3]$/.test(tag) ? `TieuDe${tag[1]}` : /^h[4-6]$/.test(tag) ? 'TieuDe3' : undefined };
    el.childNodes.forEach((c) => noiTuyen(c, f));
    xa();
  };

  const bangHtml = (tbl: Element): string => {
    const hang = Array.from(tbl.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr, :scope > tfoot > tr'));
    const soCot = Math.max(1, ...hang.map((h) => Array.from(h.children).reduce((t, o) => t + (Number(o.getAttribute('colspan')) || 1), 0)));
    const rongO = Math.floor(rongTwip / soCot);
    const dongXml = hang
      .map((h) => {
        const o = Array.from(h.children)
          .map((td) => {
            const span = Number(td.getAttribute('colspan')) || 1;
            const dauBang = td.localName === 'th';
            const trong = htmlSangOoxml(td.innerHTML, nc, rongO * span, dauBang ? { b: true } : {}) || para('');
            return `<w:tc><w:tcPr><w:tcW w:w="${rongO * span}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${dauBang ? '<w:shd w:val="clear" w:color="auto" w:fill="D9E7F5"/>' : ''}</w:tcPr>${trong}</w:tc>`;
          })
          .join('');
        return `<w:tr>${o}</w:tr>`;
      })
      .join('');
    return `<w:tbl><w:tblPr><w:tblW w:w="${rongTwip}" w:type="dxa"/><w:tblBorders>${VIEN}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${Array.from({ length: soCot }, () => `<w:gridCol w:w="${rongO}"/>`).join('')}</w:tblGrid>${dongXml}</w:tbl>${para('', { khoangSau: 0 })}`;
  };

  goc.childNodes.forEach((c) => noiTuyen(c, fGoc));
  xa();
  return out.join('');
}

const VIEN = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((v) => `<w:${v} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`).join('');
const KHONG_VIEN = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((v) => `<w:${v} w:val="nil"/>`).join('');

function oSangOoxml(o: OWord, nc: NguCanh, rong: number, canh?: Canh, dam?: boolean): string {
  if (o && typeof o === 'object' && 'html' in o) return htmlSangOoxml(o.html, nc, rong) || para('');
  if (o && typeof o === 'object' && 'doan' in o) return para(doanChuSangRun(o.doan), { canh: o.canh ?? canh, khoangSau: 0 });
  return para(run(o == null ? '' : String(o), { b: dam }), { canh, khoangSau: 0 });
}

function bang(k: Extract<KhoiWord, { loai: 'bang' }>, nc: NguCanh): string {
  const tongTiLe = k.cot.reduce((t, c) => t + (c.rong ?? 1), 0);
  const rong = k.cot.map((c) => Math.floor(((c.rong ?? 1) / tongTiLe) * nc.rongNoiDungTwip));
  const o = (v: OWord, i: number, dau: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${rong[i]}" w:type="dxa"/>${dau ? '<w:shd w:val="clear" w:color="auto" w:fill="D9E7F5"/><w:vAlign w:val="center"/>' : ''}</w:tcPr>${oSangOoxml(v, nc, rong[i], dau ? 'giua' : k.cot[i]?.canh, dau)}</w:tc>`;
  const dau = k.khongDauBang ? '' : `<w:tr><w:trPr><w:tblHeader/></w:trPr>${k.cot.map((c, i) => o(c.tieuDe, i, true)).join('')}</w:tr>`;
  const than = k.dong.map((d) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${k.cot.map((_, i) => o(d[i], i, false)).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${nc.rongNoiDungTwip}" w:type="dxa"/><w:tblBorders>${k.khongVien ? KHONG_VIEN : VIEN}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="${k.khongVien ? 28 : 85}" w:type="dxa"/><w:right w:w="${k.khongVien ? 28 : 85}" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${rong.map((r) => `<w:gridCol w:w="${r}"/>`).join('')}</w:tblGrid>${dau}${than}</w:tbl>${para('', { khoangSau: 0 })}`;
}

function khoiSangOoxml(k: KhoiWord, nc: NguCanh): string {
  switch (k.loai) {
    case 'tieu-de':
      return para(run(k.noiDung), { kieu: `TieuDe${k.cap ?? 1}`, canh: k.canh ?? ((k.cap ?? 1) === 1 ? 'giua' : undefined), giuVoiSau: true });
    case 'doan':
      return para(typeof k.noiDung === 'string' ? run(k.noiDung, { b: k.dam, i: k.nghieng, co: k.co }) : doanChuSangRun(k.noiDung), { canh: k.canh, thutDau: k.thutDau });
    case 'html':
      return htmlSangOoxml(k.html, nc);
    case 'bang':
      return bang(k, nc);
    case 'danh-sach':
      return k.muc.map((m, i) => para(`${run(k.soThuTu ? `${i + 1}. ` : '• ')}${typeof m === 'string' ? run(m) : doanChuSangRun(m)}`, { khoangSau: 40 })).join('');
    case 'quoc-hieu': {
      const trai: OWord = {
        doan: [
          ...(k.donViCapTren ? [{ chu: `${k.donViCapTren.toUpperCase()}\n`, co: 12 }] : []),
          { chu: k.donVi.toUpperCase(), dam: true, co: 12 },
          ...(k.so ? [{ chu: `\n${k.so}`, co: 12 }] : []),
        ],
        canh: 'giua',
      };
      const phai: OWord = {
        doan: [{ chu: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\n', dam: true, co: 12 }, { chu: 'Độc lập - Tự do - Hạnh phúc', dam: true, gachChan: true, co: 13 }],
        canh: 'giua',
      };
      // Tỉ lệ 42 : 58 để quốc hiệu (cỡ 12) không xuống dòng trên khổ A4
      return (
        bang({ loai: 'bang', cot: [{ tieuDe: '', rong: 42 }, { tieuDe: '', rong: 58 }], dong: [[trai, phai]], khongVien: true, khongDauBang: true }, nc) +
        (k.diaDanhNgay ? para(run(k.diaDanhNgay, { i: true }), { canh: 'phai' }) : '')
      );
    }
    case 'chu-ky':
      return bang(
        {
          loai: 'bang',
          cot: k.cot.map(() => ({ tieuDe: '', canh: 'giua' as Canh })),
          dong: [k.cot.map((c) => ({ doan: [{ chu: c.chucDanh.toUpperCase(), dam: true }, { chu: `\n${c.ghiChu ?? '(Ký, ghi rõ họ tên)'}`, nghieng: true }, { chu: `\n\n\n\n${c.hoTen ?? ''}`, dam: true }], canh: 'giua' as Canh }))],
          khongVien: true,
          khongDauBang: true,
        },
        nc,
      );
    case 'ngat-trang':
      return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    default:
      return Array.from({ length: k.so ?? 1 }, () => para('')).join('');
  }
}

/** Thu thập mọi ảnh trong khối HTML (để nạp trước khi dựng tài liệu) */
function anhTrongKhoi(khoi: KhoiWord[]): string[] {
  const html = khoi
    .flatMap((k) => (k.loai === 'html' ? [k.html] : k.loai === 'bang' ? k.dong.flat().filter((o): o is { html: string } => !!o && typeof o === 'object' && 'html' in o).map((o) => o.html) : []))
    .join('');
  if (!html.includes('<img')) return [];
  return Array.from(new DOMParser().parseFromString(html, 'text/html').querySelectorAll('img'))
    .map((i) => i.getAttribute('src') ?? '')
    .filter(Boolean);
}

const NS_TAI_LIEU =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w10="urn:schemas-microsoft-com:office:word"';

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="TieuDe1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="120"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TieuDe2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="27"/><w:szCs w:val="27"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="TieuDe3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="120" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="DauTrang"><w:name w:val="header"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="20"/><w:color w:val="595959"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="ChanTrang"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="20"/><w:color w:val="595959"/></w:rPr></w:style>
<w:style w:type="table" w:default="1" w:styleId="BangThuong"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
</w:styles>`;

/** Watermark chữ chéo trang (VML — Word hiển thị như "Watermark" chuẩn) */
function watermarkXml(chu: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="DauTrang"/></w:pPr><w:r><w:pict><v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e"><v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas><v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="t"/><v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles><o:lock v:ext="edit" text="t" shapetype="t"/></v:shapetype><v:shape id="WatermarkKTS" o:spid="_x0000_s2049" type="#_x0000_t136" style="position:absolute;margin-left:0;margin-top:0;width:470pt;height:40pt;rotation:315;z-index:-251655168;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin" o:allowincell="f" fillcolor="#bfbfbf" stroked="f"><v:fill opacity=".45"/><v:textpath style="font-family:&quot;Times New Roman&quot;;font-size:1pt" string="${xml(chu)}"/></v:shape></w:pict></w:r></w:p>`;
}

/**
 * Chỉ dựng phần THÂN OOXML (chuỗi <w:p>/<w:tbl>) + ảnh nhúng của các khối — để chèn vào một tệp Word có sẵn
 * (trộn tệp Word mẫu của mẫu đề — `@web-shared/mau-word`). Ảnh trả kèm id quan hệ (rIdAnhN) và tên tệp media.
 */
export async function taoThanWord(
  khoi: KhoiWord[],
  rongNoiDungTwip = 11906 - 1134 - 1588,
): Promise<{ than: string; anh: { id: string; tep: string; du: Uint8Array }[] }> {
  const nc = new NguCanh(rongNoiDungTwip);
  await nc.napAnh(anhTrongKhoi(khoi));
  return { than: khoi.map((k) => khoiSangOoxml(k, nc)).join(''), anh: nc.anh };
}

/** Tạo Blob .docx từ danh sách khối nội dung */
export async function taoWord(khoi: KhoiWord[], tuyChon: TuyChonWord = {}): Promise<Blob> {
  const ngang = tuyChon.huong === 'ngang';
  const [rongTrang, caoTrang] = ngang ? [16838, 11906] : [11906, 16838];
  const [leTren, lePhai, leDuoi, leTrai] = [1134, 1134, 1134, 1588];
  const nc = new NguCanh(rongTrang - lePhai - leTrai);
  await nc.napAnh(anhTrongKhoi(khoi));
  const than = khoi.map((k) => khoiSangOoxml(k, nc)).join('');

  const coDau = !!(tuyChon.watermark || tuyChon.dauTrang);
  const coChan = !tuyChon.khongDanhSoTrang || !!tuyChon.chanTrang;
  const sect = `<w:sectPr>${coDau ? '<w:headerReference w:type="default" r:id="rIdDau"/>' : ''}${coChan ? '<w:footerReference w:type="default" r:id="rIdChan"/>' : ''}<w:pgSz w:w="${rongTrang}" w:h="${caoTrang}"${ngang ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="${leTren}" w:right="${lePhai}" w:bottom="${leDuoi}" w:left="${leTrai}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;

  const zip = new JSZip();
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS_TAI_LIEU}><w:body>${than}${sect}</w:body></w:document>`);
  zip.file('word/styles.xml', STYLES);
  zip.file(
    'word/settings.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><m:mathPr><m:mathFont m:val="Cambria Math"/></m:mathPr><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`,
  );
  if (coDau)
    zip.file(
      'word/header1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${NS_TAI_LIEU}>${tuyChon.watermark ? watermarkXml(tuyChon.watermark) : ''}${tuyChon.dauTrang ? para(run(tuyChon.dauTrang), { kieu: 'DauTrang', canh: 'phai' }) : ''}</w:hdr>`,
    );
  if (coChan) {
    const soTrang = tuyChon.khongDanhSoTrang
      ? ''
      : `${run('Trang ')}<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>${run(' / ')}<w:fldSimple w:instr=" NUMPAGES "><w:r><w:t>1</w:t></w:r></w:fldSimple>`;
    zip.file(
      'word/footer1.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS_TAI_LIEU}>${para(`${tuyChon.chanTrang ? `${run(tuyChon.chanTrang)}${soTrang ? '<w:r><w:tab/></w:r>' : ''}` : ''}${soTrang}`, { kieu: 'ChanTrang', canh: tuyChon.chanTrang ? undefined : 'phai', tabPhai: nc.rongNoiDungTwip })}</w:ftr>`,
    );
  }
  nc.anh.forEach((a) => zip.file(`word/media/${a.tep}`, a.du));
  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
${coDau ? '<Relationship Id="rIdDau" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>' : ''}
${coChan ? '<Relationship Id="rIdChan" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>' : ''}
${nc.anh.map((a) => `<Relationship Id="${a.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${a.tep}"/>`).join('')}
</Relationships>`,
  );
  const bayGio = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(tuyChon.tieuDe ?? '')}</dc:title><dc:creator>${xml(tuyChon.nguoiTao ?? 'KHẢO THÍ SỐ')}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${bayGio}</dcterms:created></cp:coreProperties>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  );
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
${coDau ? '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>' : ''}
${coChan ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>' : ''}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
  );
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}

/** Tạo và tải .docx về máy; tên tệp tự thêm dấu thời gian */
export async function xuatWord(tenTep: string, khoi: KhoiWord[], tuyChon: TuyChonWord & { coThoiGian?: boolean } = {}): Promise<void> {
  taiTep(await taoWord(khoi, tuyChon), tenTepXuat(tenTep, 'docx', tuyChon.coThoiGian ?? true));
}
