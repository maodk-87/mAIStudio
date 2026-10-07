/**
 * Đọc tệp .xlsx (Office Open XML) hoặc .csv thành bảng ô chữ — phục vụ các màn nhập liệu.
 * Hỗ trợ chuỗi dùng chung, chuỗi nội tuyến, số, đúng/sai, công thức (lấy giá trị đã tính), ô ngày
 * (định dạng ngày → dd/MM/yyyy). Không hỗ trợ .xls (Excel 97–2003) — báo lỗi rõ để người dùng lưu lại .xlsx.
 */
import JSZip from 'jszip';
import { docCsv } from './csv';

export interface BangDoc {
  ten: string;
  /** Mảng dòng × ô (chuỗi, đã trim); dòng trống cuối bảng đã bỏ */
  dong: string[][];
}

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const doc = (s: string) => new DOMParser().parseFromString(s, 'application/xml');
const theo = (goc: Document | Element, ten: string) => Array.from(goc.getElementsByTagNameNS(NS, ten));

/** "AB12" → chỉ số cột 27 */
function chiSoCot(ref: string): number {
  const chu = /^[A-Z]+/.exec(ref)?.[0] ?? 'A';
  return [...chu].reduce((t, c) => t * 26 + c.charCodeAt(0) - 64, 0) - 1;
}

const hai = (n: number) => String(n).padStart(2, '0');
function seriSangNgay(n: number): string {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return `${hai(d.getUTCDate())}/${hai(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Mã định dạng số là ngày (14–22 dựng sẵn, hoặc tùy chỉnh có d/m/y và không phải giờ thuần) */
function laDinhDangNgay(id: number, ma?: string): boolean {
  if (id >= 14 && id <= 22) return true;
  if (!ma) return false;
  const s = ma.replace(/"[^"]*"|\[[^\]]*]/g, '').toLowerCase();
  return /[dy]/.test(s) || (/m/.test(s) && !/[hs]/.test(s));
}

export async function docExcel(tep: Blob & { name?: string }): Promise<BangDoc[]> {
  const ten = (tep.name ?? '').toLowerCase();
  if (ten.endsWith('.csv') || tep.type === 'text/csv') return [{ ten: 'CSV', dong: docCsv(await tep.text()) }];
  if (ten.endsWith('.xls')) throw new Error('Tệp .xls (Excel 97–2003) chưa hỗ trợ — mở bằng Excel, chọn "Lưu thành" .xlsx rồi tải lại.');
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(tep);
  } catch {
    throw new Error('Không đọc được tệp — tệp không phải Excel .xlsx hợp lệ hoặc đã bị hỏng.');
  }
  const wb = await zip.file('xl/workbook.xml')?.async('string');
  if (!wb) throw new Error('Tệp không có dữ liệu bảng tính (.xlsx).');
  const rels = doc((await zip.file('xl/_rels/workbook.xml.rels')?.async('string')) ?? '<Relationships/>');
  const dich = new Map(Array.from(rels.getElementsByTagName('Relationship')).map((r) => [r.getAttribute('Id') ?? '', r.getAttribute('Target') ?? '']));

  const ss = await zip.file('xl/sharedStrings.xml')?.async('string');
  const chuoiChung = ss ? theo(doc(ss), 'si').map((si) => theo(si, 't').map((t) => t.textContent ?? '').join('')) : [];

  // Kiểu ô → có phải ngày không
  const st = await zip.file('xl/styles.xml')?.async('string');
  const kieuNgay: boolean[] = [];
  if (st) {
    const d = doc(st);
    const ma = new Map(theo(d, 'numFmt').map((n) => [Number(n.getAttribute('numFmtId')), n.getAttribute('formatCode') ?? '']));
    const xfs = theo(d, 'cellXfs')[0];
    if (xfs) theo(xfs, 'xf').forEach((x) => {
      const id = Number(x.getAttribute('numFmtId') ?? 0);
      kieuNgay.push(laDinhDangNgay(id, ma.get(id)));
    });
  }

  const kq: BangDoc[] = [];
  for (const sh of theo(doc(wb), 'sheet')) {
    const rid = sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? sh.getAttribute('r:id') ?? '';
    const dichDen = (dich.get(rid) ?? '').replace(/^\/?xl\//, '');
    const xmlTrang = await zip.file(`xl/${dichDen}`)?.async('string');
    if (!xmlTrang) continue;
    const dong: string[][] = [];
    theo(doc(xmlTrang), 'row').forEach((row, iRow) => {
      const r = Number(row.getAttribute('r') ?? iRow + 1) - 1;
      const o: string[] = [];
      theo(row, 'c').forEach((c, iC) => {
        const ref = c.getAttribute('r');
        const i = ref ? chiSoCot(ref) : iC;
        const t = c.getAttribute('t');
        const v = theo(c, 'v')[0]?.textContent ?? '';
        let gt = '';
        if (t === 's') gt = chuoiChung[Number(v)] ?? '';
        else if (t === 'inlineStr') gt = theo(c, 't').map((x) => x.textContent ?? '').join('');
        else if (t === 'b') gt = v === '1' ? 'TRUE' : 'FALSE';
        else if (t === 'str' || t === 'e') gt = v;
        else if (v !== '') {
          const s = Number(c.getAttribute('s') ?? 0);
          gt = kieuNgay[s] && !Number.isNaN(Number(v)) ? seriSangNgay(Number(v)) : v;
        }
        o[i] = gt.trim();
      });
      dong[r] = Array.from(o, (x) => x ?? '');
    });
    const day = Array.from(dong, (d) => d ?? []);
    while (day.length && !day[day.length - 1].some((x) => x)) day.pop();
    kq.push({ ten: sh.getAttribute('name') ?? `Trang ${kq.length + 1}`, dong: day });
  }
  return kq;
}

/**
 * Đọc trang đầu tiên thành danh sách bản ghi theo dòng tiêu đề (tự tìm dòng tiêu đề chứa `cotBatBuoc` đầu tiên;
 * bỏ dấu * và khoảng trắng thừa ở tên cột). Trả về cả số dòng gốc trên Excel để báo lỗi đúng dòng.
 */
export async function docExcelTheoTieuDe(
  tep: Blob & { name?: string },
  cotNhanDien?: string,
): Promise<{ tieuDe: string[]; banGhi: { dong: number; gt: Record<string, string> }[] }> {
  const bang = (await docExcel(tep))[0];
  if (!bang?.dong.length) throw new Error('Tệp không có dữ liệu.');
  const chuan = (s: string) => s.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const iTieuDe = Math.max(0, cotNhanDien ? bang.dong.findIndex((d) => d.some((x) => chuan(x) === chuan(cotNhanDien))) : 0);
  const tieuDe = bang.dong[iTieuDe].map((x) => x.replace(/\*/g, '').trim());
  const banGhi = bang.dong
    .slice(iTieuDe + 1)
    .map((d, i) => ({ dong: iTieuDe + i + 2, gt: Object.fromEntries(tieuDe.map((t, j) => [t, d[j] ?? ''])) }))
    .filter((b) => Object.values(b.gt).some((x) => x));
  return { tieuDe, banGhi };
}
