/**
 * Đọc tệp Word (.docx) trên trình duyệt → HTML chuẩn hóa GIỐNG HỆT định dạng HTML của
 * chức năng dán (chuyenDoiWord): công thức <span data-cong-thuc="LaTeX">, ảnh <img>
 * data URL, định dạng <b>/<i>/<u>/<sup>/<sub>, cùng bộ lọc lamSachHtml.
 *
 * Dựng tài liệu bằng docx-preview (Apache-2.0); công thức MathType OLE được giải mã từ
 * ảnh WMF (MTEF) trước khi dựng — docx-preview mặc định bỏ trống đối tượng OLE.
 */
import { tienXuLyCongThucDocx } from '../trinh-xem-tai-lieu/congThucTaiLieu';
import { lamSachHtml } from './chuyenDoiWord';

export interface KetQuaDocx {
  html: string;
  soCongThuc: number;
  /** Đối tượng nhúng không đọc được (OLE không phải MathType, ảnh WMF…) */
  soKhongDocDuoc: number;
}

const DAU_RE = /⟦CT(\d+)⟧/g;

export async function docxSangHtml(
  tep: Blob,
  onTienTrinh?: (phanTram: number) => void,
): Promise<KetQuaDocx> {
  onTienTrinh?.(10);
  const { noiDung, dsDoiTuong } = await tienXuLyCongThucDocx(tep, { tabThanhKyTu: true });
  onTienTrinh?.(45);

  const { renderAsync } = await import('docx-preview');
  const than = document.createElement('div');
  const kieu = document.createElement('div');
  await renderAsync(noiDung, than, kieu, {
    className: 'oiw-docx',
    inWrapper: false,
    breakPages: false,
    ignoreWidth: true,
    ignoreHeight: true,
    renderHeaders: false,
    renderFooters: false,
    renderFootnotes: false,
    renderEndnotes: false,
    useBase64URL: true,
  });
  onTienTrinh?.(75);

  // dấu ⟦CTn⟧ (đối tượng OLE đã giải mã) → công thức / ảnh / chip cảnh báo
  let soCongThuc = 0;
  let soKhongDocDuoc = 0;
  const cacNut: Text[] = [];
  const duyet = document.createTreeWalker(than, NodeFilter.SHOW_TEXT);
  while (duyet.nextNode()) {
    const nut = duyet.currentNode as Text;
    if (nut.data.includes('⟦CT')) cacNut.push(nut);
  }
  for (const nut of cacNut) {
    const manh = document.createDocumentFragment();
    let tu = 0;
    for (const khop of nut.data.matchAll(DAU_RE)) {
      const i = khop.index ?? 0;
      if (i > tu) manh.append(nut.data.slice(tu, i));
      const dt = dsDoiTuong[Number(khop[1])];
      if (dt?.loai === 'cong-thuc') {
        const span = document.createElement('span');
        span.setAttribute('data-cong-thuc', dt.latex);
        span.textContent = dt.latex;
        manh.append(span);
        soCongThuc += 1;
      } else if (dt?.loai === 'anh') {
        const img = document.createElement('img');
        img.src = dt.src;
        manh.append(img);
      } else {
        const chip = document.createElement('code');
        chip.setAttribute('data-khong-chuyen', '1');
        chip.textContent = '[Đối tượng nhúng không đọc được — chèn lại bằng nút Σ hoặc nút Ảnh]';
        manh.append(chip);
        soKhongDocDuoc += 1;
      }
      tu = i + khop[0].length;
    }
    if (tu < nut.data.length) manh.append(nut.data.slice(tu));
    nut.replaceWith(manh);
  }

  // các khối nội dung theo thứ tự tài liệu (docx-preview: section > article > p/table…)
  const goc = document.createElement('div');
  const cacBaiViet = Array.from(than.querySelectorAll('article'));
  const cacKhoi = cacBaiViet.length
    ? cacBaiViet.flatMap((a) => Array.from(a.children))
    : Array.from(than.children);
  for (const khoi of cacKhoi) goc.append(khoi);
  onTienTrinh?.(90);

  return { html: lamSachHtml(goc), soCongThuc, soKhongDocDuoc };
}
