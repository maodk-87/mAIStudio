/**
 * Ghi tệp Excel .xlsx THẬT (Office Open XML) bằng jszip — không cần thư viện Excel.
 * Mỗi trang tính: tiêu đề + dòng mô tả (gộp ô), dòng tiêu đề cột (đậm, nền xanh nhạt, cố định khi cuộn,
 * có bộ lọc), dữ liệu có khung viền, dòng tổng; cột có thể là số / ngày / phần trăm, danh sách chọn (xác thực dữ liệu).
 */
import JSZip from 'jszip';
import { taiTep, tenTepXuat } from './taiTep';

export type OExcel = string | number | boolean | Date | null | undefined;

export interface CotExcel {
  tieuDe: string;
  /** Độ rộng (ký tự); bỏ trống = tự ước theo nội dung */
  rong?: number;
  /** chu (mặc định) · so · ngay (Date hoặc chuỗi dd/MM/yyyy) · phan-tram (0–1) */
  kieu?: 'chu' | 'so' | 'ngay' | 'phan-tram';
  /** Danh sách giá trị cho phép (ô thả xuống — dùng cho file mẫu nhập liệu) */
  danhSach?: string[];
}

export interface TrangTinh {
  /** Tên trang tính (≤ 31 ký tự, tự cắt/bỏ ký tự cấm) */
  ten: string;
  /** Tiêu đề lớn ở dòng 1 (gộp ô theo số cột) */
  tieuDe?: string;
  /** Các dòng mô tả dưới tiêu đề: đơn vị, bộ lọc, người xuất… */
  moTa?: string[];
  cot: CotExcel[];
  dong: OExcel[][];
  /** Dòng tổng cuối bảng (in đậm) */
  tong?: OExcel[];
  /** Hướng giấy khi in từ Excel */
  huong?: 'doc' | 'ngang';
  /** Tắt bộ lọc ở dòng tiêu đề cột */
  khongLoc?: boolean;
}

const xml = (s: string) =>
  s
    // Bỏ ký tự điều khiển không hợp lệ trong XML 1.0
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 0 → A, 25 → Z, 26 → AA */
export function tenCotExcel(i: number): string {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Style id trong styles.xml */
const S = { thuong: 0, dauCot: 1, chu: 2, so: 3, tieuDe: 4, moTa: 5, ngay: 6, phanTram: 7, tongChu: 8, tongSo: 9 };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="0.0%"/></numFmts>
<fonts count="4">
<font><sz val="12"/><name val="Times New Roman"/><family val="1"/></font>
<font><b/><sz val="12"/><name val="Times New Roman"/><family val="1"/></font>
<font><b/><sz val="14"/><color rgb="FF0B508B"/><name val="Times New Roman"/><family val="1"/></font>
<font><i/><sz val="11"/><color rgb="FF5B6572"/><name val="Times New Roman"/><family val="1"/></font>
</fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9E7F5"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF9FB3C8"/></left><right style="thin"><color rgb="FF9FB3C8"/></right><top style="thin"><color rgb="FF9FB3C8"/></top><bottom style="thin"><color rgb="FF9FB3C8"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Ngày Excel (số seri, gốc 30/12/1899) */
function soSeriNgay(d: Date): number {
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 86400000);
}
function chuoiSangNgay(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  return iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : null;
}

function oChu(ref: string, v: string, s: number) {
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}

function taoO(ref: string, v: OExcel, cot: CotExcel | undefined, laTong: boolean): string {
  if (v == null || v === '') return `<c r="${ref}" s="${laTong ? S.tongChu : cot?.kieu && cot.kieu !== 'chu' ? S.so : S.chu}"/>`;
  const kieu = cot?.kieu ?? 'chu';
  if (typeof v === 'boolean') return oChu(ref, v ? 'Có' : 'Không', laTong ? S.tongChu : S.chu);
  if (kieu === 'ngay') {
    const d = v instanceof Date ? v : typeof v === 'string' ? chuoiSangNgay(v) : null;
    if (d && !Number.isNaN(d.getTime())) return `<c r="${ref}" s="${S.ngay}"><v>${soSeriNgay(d)}</v></c>`;
  }
  if ((kieu === 'so' || kieu === 'phan-tram') && typeof v === 'number' && Number.isFinite(v))
    return `<c r="${ref}" s="${laTong ? S.tongSo : kieu === 'phan-tram' ? S.phanTram : S.so}"><v>${v}</v></c>`;
  if (typeof v === 'number' && Number.isFinite(v) && kieu !== 'chu') return `<c r="${ref}" s="${S.so}"><v>${v}</v></c>`;
  // Cột "chu" giữ nguyên dạng văn bản (SBD 0012, mã số…) — không để Excel tự đổi thành số
  return oChu(ref, v instanceof Date ? v.toLocaleDateString('vi-VN') : String(v), laTong ? S.tongChu : S.chu);
}

/** Độ rộng ước lượng theo nội dung (ký tự), giới hạn 8–60 */
function uocRong(cot: CotExcel, i: number, dong: OExcel[][]): number {
  if (cot.rong) return cot.rong;
  const dai = Math.max(
    ...cot.tieuDe.split('\n').map((x) => x.length),
    ...dong.slice(0, 300).map((d) => {
      const v = d[i];
      return v == null ? 0 : Math.max(...String(v instanceof Date ? '00/00/0000' : v).split('\n').map((x) => x.length));
    }),
  );
  return Math.max(8, Math.min(60, Math.ceil(dai * 1.1) + 2));
}

function taoTrang(t: TrangTinh, chiSo: number): { xml: string; locRef?: string } {
  const soCot = Math.max(1, t.cot.length);
  const cuoi = tenCotExcel(soCot - 1);
  const hang: string[] = [];
  const gop: string[] = [];
  let r = 0;
  if (t.tieuDe) {
    r++;
    hang.push(`<row r="${r}" ht="24" customHeight="1">${oChu(`A${r}`, t.tieuDe, S.tieuDe)}</row>`);
    if (soCot > 1) gop.push(`A${r}:${cuoi}${r}`);
  }
  (t.moTa ?? []).forEach((m) => {
    r++;
    hang.push(`<row r="${r}">${oChu(`A${r}`, m, S.moTa)}</row>`);
    if (soCot > 1) gop.push(`A${r}:${cuoi}${r}`);
  });
  if (t.tieuDe || t.moTa?.length) r++; // dòng trống ngăn cách
  r++;
  const dongDauCot = r;
  hang.push(`<row r="${r}" ht="${t.cot.some((c) => c.tieuDe.includes('\n')) ? 36 : 20}" customHeight="1">${t.cot.map((c, i) => oChu(`${tenCotExcel(i)}${r}`, c.tieuDe, S.dauCot)).join('')}</row>`);
  t.dong.forEach((d) => {
    r++;
    hang.push(`<row r="${r}">${t.cot.map((c, i) => taoO(`${tenCotExcel(i)}${r}`, d[i], c, false)).join('')}</row>`);
  });
  const dongCuoiDuLieu = r;
  if (t.tong) {
    r++;
    hang.push(`<row r="${r}">${t.cot.map((c, i) => taoO(`${tenCotExcel(i)}${r}`, t.tong![i], c, true)).join('')}</row>`);
  }
  const cols = t.cot.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${uocRong(c, i, t.dong)}" customWidth="1"/>`).join('');
  const locRef = !t.khongLoc && t.dong.length ? `A${dongDauCot}:${cuoi}${dongCuoiDuLieu}` : undefined;
  // Ô thả xuống cho cột có danh sách (tối đa 1000 dòng dữ liệu)
  const xacThuc = t.cot
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.danhSach?.length && c.danhSach.join(',').length < 250)
    .map(
      ({ c, i }) =>
        `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Giá trị không hợp lệ" error="${xml(`Chọn một trong: ${c.danhSach!.join(', ')}`)}" sqref="${tenCotExcel(i)}${dongDauCot + 1}:${tenCotExcel(i)}${dongDauCot + 1000}"><formula1>"${xml(c.danhSach!.join(','))}"</formula1></dataValidation>`,
    );
  const out = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0"${chiSo === 0 ? ' tabSelected="1"' : ''}><pane ySplit="${dongDauCot}" topLeftCell="A${dongDauCot + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="16"/>
<cols>${cols}</cols>
<sheetData>${hang.join('')}</sheetData>
${locRef ? `<autoFilter ref="${locRef}"/>` : ''}
${gop.length ? `<mergeCells count="${gop.length}">${gop.map((g) => `<mergeCell ref="${g}"/>`).join('')}</mergeCells>` : ''}
${xacThuc.length ? `<dataValidations count="${xacThuc.length}">${xacThuc.join('')}</dataValidations>` : ''}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="${t.huong === 'ngang' || soCot > 7 ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;C&amp;"Times New Roman"&amp;10Trang &amp;P / &amp;N</oddFooter></headerFooter>
</worksheet>`;
  return { xml: out, locRef };
}

/** Tên trang tính hợp lệ, không trùng */
function tenTrangHopLe(ds: TrangTinh[]): string[] {
  const daDung = new Set<string>();
  return ds.map((t, i) => {
    let ten = (t.ten || `Trang ${i + 1}`).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31).trim() || `Trang ${i + 1}`;
    let n = 2;
    while (daDung.has(ten.toLowerCase())) ten = `${ten.slice(0, 27)} (${n++})`;
    daDung.add(ten.toLowerCase());
    return ten;
  });
}

/** Tạo Blob .xlsx từ một hoặc nhiều trang tính */
export async function taoExcel(trang: TrangTinh | TrangTinh[], thongTin: { nguoiTao?: string } = {}): Promise<Blob> {
  const ds = Array.isArray(trang) ? trang : [trang];
  const ten = tenTrangHopLe(ds);
  const zip = new JSZip();
  const trangXml = ds.map((t, i) => taoTrang(t, i));
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${ds.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`,
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`,
  );
  const bayGio = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${xml(ds[0]?.tieuDe ?? ten[0])}</dc:title><dc:creator>${xml(thongTin.nguoiTao ?? 'KHẢO THÍ SỐ')}</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${bayGio}</dcterms:created></cp:coreProperties>`,
  );
  const locTen = trangXml
    .map((t, i) => (t.locRef ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${ten[i].replace(/'/g, "''")}'!${t.locRef.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>` : ''))
    .join('');
  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets>${ten.map((t, i) => `<sheet name="${xml(t)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>
${locTen ? `<definedNames>${locTen}</definedNames>` : ''}
</workbook>`,
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${ds.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}
<Relationship Id="rId${ds.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
  );
  zip.file('xl/styles.xml', STYLES);
  trangXml.forEach((t, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, t.xml));
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', compression: 'DEFLATE' });
}

/** Tạo và tải .xlsx về máy; tên tệp tự thêm dấu thời gian */
export async function xuatExcel(tenTep: string, trang: TrangTinh | TrangTinh[], thongTin: { nguoiTao?: string; coThoiGian?: boolean } = {}): Promise<void> {
  taiTep(await taoExcel(trang, thongTin), tenTepXuat(tenTep, 'xlsx', thongTin.coThoiGian ?? true));
}

// ————— File mẫu nhập liệu —————

export interface CotMauNhap {
  tieuDe: string;
  batBuoc?: boolean;
  /** Mô tả định dạng/quy tắc (sheet "Hướng dẫn") */
  moTa?: string;
  /** Giá trị ví dụ ở dòng mẫu */
  viDu?: OExcel;
  danhSach?: string[];
  kieu?: CotExcel['kieu'];
  rong?: number;
}

/**
 * File mẫu nhập liệu chuẩn: trang "Dữ liệu" (tiêu đề cột, cột bắt buộc có dấu *, 1 dòng ví dụ, ô thả xuống)
 * + trang "Hướng dẫn" (từng cột: bắt buộc, định dạng, giá trị cho phép) + ghi chú chung.
 */
export async function xuatMauNhap(
  tenTep: string,
  mau: { tieuDe: string; cot: CotMauNhap[]; ghiChu?: string[]; dongViDu?: OExcel[][] },
): Promise<void> {
  const cot: CotExcel[] = mau.cot.map((c) => ({ tieuDe: `${c.tieuDe}${c.batBuoc ? ' *' : ''}`, danhSach: c.danhSach, kieu: c.kieu, rong: c.rong }));
  const dongViDu = mau.dongViDu ?? [mau.cot.map((c) => c.viDu ?? '')];
  await xuatExcel(
    tenTep,
    [
      { ten: 'Dữ liệu', cot, dong: dongViDu, khongLoc: true },
      {
        ten: 'Hướng dẫn',
        tieuDe: `HƯỚNG DẪN NHẬP — ${mau.tieuDe.toUpperCase()}`,
        moTa: [
          'Nhập dữ liệu ở trang "Dữ liệu", bắt đầu từ dòng 2; xóa dòng ví dụ trước khi nhập. Không đổi tên, thứ tự cột.',
          'Cột có dấu * là bắt buộc. Cột có danh sách: chọn trong ô thả xuống.',
          ...(mau.ghiChu ?? []),
        ],
        cot: [{ tieuDe: 'Cột', rong: 28 }, { tieuDe: 'Bắt buộc', rong: 10 }, { tieuDe: 'Định dạng / quy tắc', rong: 60 }, { tieuDe: 'Giá trị cho phép', rong: 36 }, { tieuDe: 'Ví dụ', rong: 22 }],
        dong: mau.cot.map((c) => [c.tieuDe, c.batBuoc ? 'Có' : '', c.moTa ?? '', c.danhSach?.join(', ') ?? '', c.viDu instanceof Date ? c.viDu.toLocaleDateString('vi-VN') : (c.viDu ?? '')]),
        khongLoc: true,
      },
    ],
    { coThoiGian: false },
  );
}

/** File kết quả nhập có lỗi: dữ liệu gốc + cột "Lỗi" — người dùng sửa rồi nhập lại */
export async function xuatFileLoiNhap(tenTep: string, cot: string[], dong: { duLieu: OExcel[]; loi: string }[]): Promise<void> {
  await xuatExcel(tenTep, {
    ten: 'Dòng lỗi',
    tieuDe: 'DANH SÁCH DÒNG LỖI KHI NHẬP',
    moTa: [`${dong.length} dòng lỗi — sửa theo cột "Lỗi" rồi nhập lại tệp này (xóa cột "Lỗi" không bắt buộc).`],
    cot: [...cot.map((c) => ({ tieuDe: c })), { tieuDe: 'Lỗi', rong: 50 }],
    dong: dong.map((d) => [...d.duLieu, d.loi]),
  });
}
