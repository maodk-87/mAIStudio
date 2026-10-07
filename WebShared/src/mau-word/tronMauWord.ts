/**
 * TRỘN TỆP WORD MẪU (.docx/.dotx) với dữ liệu đề — chạy hoàn toàn trên trình duyệt (jszip), dùng cho
 * xem trước/giả lập ở màn Mẫu đề; backend xuất đề thật theo CÙNG quy ước (docs/apis/03 §2a).
 *
 * - Quét word/document.xml + header*.xml + footer*.xml theo từng đoạn <w:p>. Word hay cắt `{{MA}}` thành nhiều
 *   <w:t> (do soát chính tả, đổi định dạng giữa chừng) → ghép chữ của cả đoạn để tìm, rồi dồn giá trị vào <w:t>
 *   chứa ký tự đầu của trường (giữ định dạng chữ đầu tiên), xóa phần còn lại ở các <w:t> sau.
 * - Trường KHỐI (NOI_DUNG_DE, DAP_AN) đứng riêng một đoạn → thay cả đoạn bằng các đoạn/bảng dựng bởi
 *   `@web-shared/xuat-tep` (cùng bố cục đề chuẩn); ảnh nhúng được thêm vào media + quan hệ của tệp mẫu.
 */
import JSZip from 'jszip';
import { taoThanWord, type KhoiWord } from '../xuat-tep/coBan';
import { MAU_DIEU_KIEN, MAU_TRUONG_TRON, timTruongTron } from './truongTron';

const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface DuLieuTron {
  /** Giá trị trường nội tuyến theo mã (VD { MON_HOC: 'Toán' }) */
  giaTri: Record<string, string>;
  /** Khối nội dung theo mã (VD { NOI_DUNG_DE: khoiNoiDungDe(de) }); khối rỗng/thiếu → bỏ cả đoạn */
  khoi: Record<string, KhoiWord[] | undefined>;
  /** Vùng điều kiện {{#MA}}…{{/MA}}: true giữ phần giữa, false bỏ cả vùng; không khai báo = giữ */
  dieuKien?: Record<string, boolean>;
}

export interface KetQuaPhanTichMau {
  /** Mã trường tìm thấy trong mẫu (không trùng, theo thứ tự xuất hiện) */
  truongCo: string[];
  /** Mã không có trong danh mục (gõ sai) — giữ nguyên chữ khi trộn */
  truongLa: string[];
  /** Trường khối nhưng không đứng riêng một đoạn */
  khoiSaiViTri: string[];
  /** Vùng điều kiện thiếu đoạn mở/đóng, lồng sai hoặc cắt ngang bảng */
  vungLoi: string[];
  soTrangNgat: number;
}

export interface KetQuaTron {
  tep: Blob;
  phanTich: KetQuaPhanTichMau;
}

// ————— XML —————

const giaiMa = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

const maHoa = (s: string) =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Nội dung một <w:t> → XML; "\n" thành ngắt dòng trong cùng run */
const chuSangWt = (chu: string) =>
  `<w:t xml:space="preserve">${chu
    .split('\n')
    .map(maHoa)
    .join('</w:t><w:br/><w:t xml:space="preserve">')}</w:t>`;

// Thẻ tự đóng (<w:p/>, <w:p w:rsidR=".."/>) phải thử trước, và thẻ mở không được kết thúc bằng "/"
const MAU_DOAN = /<w:p(?:\s[^>]*)?\/>|<w:p(?:\s[^>]*?[^/])?>[\s\S]*?<\/w:p>/g;
const MAU_WT = /<w:t(?:\s[^>]*)?\/>|<w:t(?:\s[^>]*?[^/])?>([^<]*)<\/w:t>/g;

/** Chữ thuần của một đoạn (ghép mọi <w:t>) */
function chuCuaDoan(doan: string): string {
  let chu = '';
  for (const m of doan.matchAll(MAU_WT)) chu += giaiMa(m[1] ?? '');
  return chu;
}

const cacTruongTrong = (chu: string) => [...chu.matchAll(MAU_TRUONG_TRON)].map((m) => m[1].toUpperCase());

interface VungDieuKien {
  ma: string;
  /** Vị trí đoạn mở [bd, kt) và đoạn đóng [bd, kt) trong XML thân */
  mo: [number, number];
  dong: [number, number];
}

const demThe = (xml: string, the: string) => (xml.match(new RegExp(`<${the}[\\s>]`, 'g')) ?? []).length - (xml.match(new RegExp(`</${the}>`, 'g')) ?? []).length;

/** Tìm các vùng {{#MA}}…{{/MA}} (mỗi dấu mở/đóng đứng riêng một đoạn) trong XML thân tài liệu */
function timVungDieuKien(xml: string): { vung: VungDieuKien[]; loi: string[] } {
  const vung: VungDieuKien[] = [];
  const loi: string[] = [];
  const dangMo: { ma: string; vt: [number, number] }[] = [];
  for (const m of xml.matchAll(MAU_DOAN)) {
    const chu = chuCuaDoan(m[0]);
    if (!chu.includes('{{')) continue;
    const dau = [...chu.matchAll(MAU_DIEU_KIEN)];
    if (!dau.length) continue;
    const gon = chu.replace(/\s/g, '');
    const k = dau[0];
    const ma = k[2].toUpperCase();
    if (dau.length > 1 || gon !== `{{${k[1]}${k[2]}}}`) {
      loi.push(`${k[1]}${ma}: dấu vùng phải đứng riêng một đoạn`);
      continue;
    }
    const vt: [number, number] = [m.index!, m.index! + m[0].length];
    if (k[1] === '#') {
      dangMo.push({ ma, vt });
      continue;
    }
    const mo = dangMo.pop();
    if (!mo || mo.ma !== ma) {
      loi.push(`/${ma}: thiếu đoạn mở {{#${ma}}} tương ứng`);
      if (mo) dangMo.push(mo);
      continue;
    }
    const giua = xml.slice(mo.vt[0], vt[1]);
    if (demThe(giua, 'w:tbl') !== 0 || demThe(giua, 'w:tc') !== 0 || demThe(giua, 'w:tr') !== 0) {
      loi.push(`${ma}: vùng cắt ngang bảng — đặt cả đoạn mở và đóng cùng ngoài bảng hoặc cùng một ô`);
      continue;
    }
    vung.push({ ma, mo: mo.vt, dong: vt });
  }
  dangMo.forEach((m) => loi.push(`#${m.ma}: thiếu đoạn đóng {{/${m.ma}}}`));
  return { vung, loi };
}

/** Áp vùng điều kiện: giữ phần giữa (bỏ 2 đoạn dấu) hoặc bỏ cả vùng */
function apDieuKien(xml: string, dieuKien: Record<string, boolean>): string {
  const { vung } = timVungDieuKien(xml);
  const cat: [number, number][] = [];
  for (const v of vung) {
    if (dieuKien[v.ma] === false) cat.push([v.mo[0], v.dong[1]]);
    else cat.push(v.mo, v.dong);
  }
  // Gộp các khoảng chồng nhau (vùng lồng nhau) rồi dựng lại chuỗi từ XML gốc
  cat.sort((a, b) => a[0] - b[0]);
  let kq = '';
  let tu = 0;
  for (const [bd, kt] of cat) {
    if (kt <= tu) continue;
    if (bd > tu) kq += xml.slice(tu, bd);
    tu = Math.max(tu, kt);
  }
  kq += xml.slice(tu);
  // Vùng nằm trọn trong một ô bảng bị bỏ hết đoạn → ô Word bắt buộc còn ít nhất một <w:p>
  return kq.replace(/(<w:tc(?:\s[^>]*)?>\s*(?:<w:tcPr>[\s\S]*?<\/w:tcPr>)?\s*)(<\/w:tc>)/g, '$1<w:p/>$2');
}

/** Thay các trường nội tuyến trong một đoạn — giữ nguyên run/định dạng, chỉ sửa chữ các <w:t> liên quan */
function thayNoiTuyen(doan: string, giaTri: (ma: string) => string | undefined): string {
  const ds = [...doan.matchAll(MAU_WT)];
  if (!ds.length) return doan;
  const chu = ds.map((m) => giaiMa(m[1] ?? ''));
  const batDau: number[] = [];
  let tong = '';
  for (const c of chu) {
    batDau.push(tong.length);
    tong += c;
  }
  const viTri = (pos: number) => {
    let i = batDau.length - 1;
    while (i > 0 && batDau[i] > pos) i--;
    return { i, lech: pos - batDau[i] };
  };
  const cacKhop = [...tong.matchAll(MAU_TRUONG_TRON)];
  if (!cacKhop.length) return doan;
  let doiGi = false;
  // Xử lý từ cuối lên để vị trí các trường phía trước không lệch
  for (const k of cacKhop.reverse()) {
    const gt = giaTri(k[1].toUpperCase());
    if (gt == null) continue;
    doiGi = true;
    const dau = viTri(k.index!);
    const cuoi = viTri(k.index! + k[0].length - 1);
    if (dau.i === cuoi.i) {
      chu[dau.i] = chu[dau.i].slice(0, dau.lech) + gt + chu[dau.i].slice(cuoi.lech + 1);
    } else {
      chu[dau.i] = chu[dau.i].slice(0, dau.lech) + gt;
      for (let j = dau.i + 1; j < cuoi.i; j++) chu[j] = '';
      chu[cuoi.i] = chu[cuoi.i].slice(cuoi.lech + 1);
    }
  }
  if (!doiGi) return doan;
  let i = 0;
  return doan.replace(MAU_WT, () => chuSangWt(chu[i++] ?? ''));
}

// ————— Phân tích mẫu —————

const laPhanNoiDung = (ten: string) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(ten);

/** Đọc tệp mẫu: liệt kê trường có trong mẫu, trường lạ, trường khối đặt sai chỗ */
export async function phanTichMauWord(mau: Blob): Promise<KetQuaPhanTichMau> {
  const zip = await JSZip.loadAsync(mau);
  const truongCo: string[] = [];
  const truongLa: string[] = [];
  const khoiSaiViTri: string[] = [];
  const vungLoi: string[] = [];
  let soTrangNgat = 0;
  for (const ten of Object.keys(zip.files).filter(laPhanNoiDung)) {
    const xml = await zip.file(ten)!.async('string');
    if (ten === 'word/document.xml') {
      soTrangNgat = (xml.match(/<w:br [^>]*w:type="page"/g) ?? []).length;
      vungLoi.push(...timVungDieuKien(xml).loi);
    }
    for (const m of xml.matchAll(MAU_DOAN)) {
      const chu = chuCuaDoan(m[0]);
      for (const k of chu.matchAll(MAU_DIEU_KIEN)) {
        const ma = k[2].toUpperCase();
        if (!truongCo.includes(ma)) truongCo.push(ma);
        if (timTruongTron(ma)?.kieu !== 'dieu-kien' && !truongLa.includes(ma)) truongLa.push(ma);
      }
      for (const ma of cacTruongTrong(chu)) {
        if (!truongCo.includes(ma)) truongCo.push(ma);
        const t = timTruongTron(ma);
        if (!t) {
          if (!truongLa.includes(ma)) truongLa.push(ma);
        } else if (t.kieu === 'khoi' && (chu.replace(/\s/g, '') !== `{{${ma}}}` || ten !== 'word/document.xml')) {
          if (!khoiSaiViTri.includes(ma)) khoiSaiViTri.push(ma);
        }
      }
    }
  }
  return { truongCo, truongLa, khoiSaiViTri, vungLoi, soTrangNgat };
}

// ————— Trộn —————

const KHAI_BAO_NS: Record<string, string> = {
  'xmlns:r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  'xmlns:wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
  'xmlns:m': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
  'xmlns:a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
  'xmlns:pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
  'xmlns:v': 'urn:schemas-microsoft-com:vml',
  'xmlns:o': 'urn:schemas-microsoft-com:office:office',
};

/** Bổ sung khai báo namespace còn thiếu ở thẻ gốc (công thức OMML / ảnh nhúng cần m:, wp:, a:, pic:) */
function boSungNamespace(xml: string): string {
  return xml.replace(/<w:document\b[^>]*>/, (the) => {
    const thieu = Object.entries(KHAI_BAO_NS).filter(([k]) => !the.includes(`${k}=`));
    return thieu.length ? the.replace(/>$/, ` ${thieu.map(([k, v]) => `${k}="${v}"`).join(' ')}>`) : the;
  });
}

/**
 * Trộn dữ liệu vào tệp Word mẫu → Blob .docx. Trường lạ giữ nguyên chữ `{{…}}` để người quản lý thấy lỗi gõ;
 * trường trong danh mục nhưng không có giá trị → chuỗi rỗng.
 */
export async function tronMauWord(mau: Blob, duLieu: DuLieuTron): Promise<KetQuaTron> {
  const phanTich = await phanTichMauWord(mau);
  const zip = await JSZip.loadAsync(mau);
  const giaTri = (ma: string) => {
    const t = timTruongTron(ma);
    if (!t) return undefined;
    return t.kieu === 'khoi' ? '' : (duLieu.giaTri[ma] ?? '');
  };

  // Dựng trước OOXML các khối (ảnh đặt tên riêng để không trùng quan hệ/tệp media của mẫu)
  const thanKhoi = new Map<string, string>();
  const anhThem: { id: string; tep: string; du: Uint8Array }[] = [];
  for (const [ma, khoi] of Object.entries(duLieu.khoi)) {
    if (!khoi?.length) continue;
    const { than, anh } = await taoThanWord(khoi);
    let thanDoi = than;
    for (const a of anh) {
      const idMoi = `rIdTron${ma}${a.id.replace(/\D/g, '')}`;
      const tepMoi = `tron-${ma.toLowerCase()}-${a.tep}`;
      thanDoi = thanDoi.split(`r:embed="${a.id}"`).join(`r:embed="${idMoi}"`);
      anhThem.push({ id: idMoi, tep: tepMoi, du: a.du });
    }
    thanKhoi.set(ma, thanDoi);
  }

  for (const ten of Object.keys(zip.files).filter(laPhanNoiDung)) {
    let xml = await zip.file(ten)!.async('string');
    const laThan = ten === 'word/document.xml';
    if (laThan) xml = apDieuKien(xml, duLieu.dieuKien ?? {});
    xml = xml.replace(MAU_DOAN, (doan) => {
      const chu = chuCuaDoan(doan);
      if (!chu.includes('{{')) return doan;
      if (laThan) {
        const gon = chu.replace(/\s/g, '');
        const khop = /^\{\{([A-Za-z0-9_]+)\}\}$/.exec(gon);
        const t = khop && timTruongTron(khop[1].toUpperCase());
        if (t?.kieu === 'khoi') {
          const than = thanKhoi.get(t.ma);
          // Khối rỗng → bỏ cả đoạn; ô bảng Word bắt buộc kết thúc bằng <w:p> nên luôn thêm một đoạn trống
          return than ? `${than}<w:p/>` : '';
        }
      }
      return thayNoiTuyen(doan, giaTri);
    });
    if (laThan) xml = boSungNamespace(xml);
    zip.file(ten, xml);
  }

  if (anhThem.length) {
    const tenRels = 'word/_rels/document.xml.rels';
    const rels = (await zip.file(tenRels)?.async('string')) ?? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    const them = anhThem
      .map((a) => `<Relationship Id="${a.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${a.tep}"/>`)
      .join('');
    zip.file(tenRels, rels.replace('</Relationships>', `${them}</Relationships>`));
    anhThem.forEach((a) => zip.file(`word/media/${a.tep}`, a.du));
  }

  // Loại nội dung: .dotx → .docx; bảo đảm có kiểu cho ảnh png/jpeg/gif
  const tenCt = '[Content_Types].xml';
  let ct = await zip.file(tenCt)!.async('string');
  ct = ct.replace('application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml');
  const kieuAnh: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif' };
  for (const [duoi, mime] of Object.entries(kieuAnh)) {
    if (anhThem.some((a) => a.tep.endsWith(`.${duoi}`)) && !new RegExp(`Extension="${duoi}"`, 'i').test(ct)) {
      ct = ct.replace('</Types>', `<Default Extension="${duoi}" ContentType="${mime}"/></Types>`);
    }
  }
  zip.file(tenCt, ct);

  const tep = await zip.generateAsync({ type: 'blob', mimeType: MIME_DOCX, compression: 'DEFLATE' });
  return { tep, phanTich };
}
