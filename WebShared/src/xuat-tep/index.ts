/**
 * XUẤT – IN – TẢI TỆP dùng chung 6 web (thay mọi thao tác "xuất/in/tải" mock bằng tệp THẬT, không cần backend):
 *   - xuatExcel / taoExcel      → .xlsx thật (định dạng, cố định tiêu đề, bộ lọc, ô thả xuống, nhiều trang tính)
 *   - xuatMauNhap / xuatFileLoiNhap → file mẫu nhập liệu (trang Dữ liệu + Hướng dẫn) / file dòng lỗi khi nhập
 *   - docExcel / docExcelTheoTieuDe → đọc .xlsx/.csv cho màn nhập liệu
 *   - xuatWord / taoWord        → .docx thật (quốc hiệu, bảng, chữ ký, HTML câu hỏi + ảnh + công thức Word, watermark)
 *   - inTaiLieu                 → in / Xuất PDF qua hộp in trình duyệt (A4, watermark, công thức KaTeX)
 *   - xuatBang                  → một bảng ra xlsx | csv | docx | pdf | in bằng một lời gọi
 *   - NutXuatTep                → nút xuất chuẩn (menu định dạng, trạng thái đang xuất, báo lỗi)
 *   - ghiNhatKyXuat             → ghi vết lượt xuất (mã theo dõi cho watermark)
 * Hợp đồng backend tương ứng: docs/apis/23-xuat-in-tai-tep.md.
 */
// Đăng ký bộ công thức KaTeX: Word → phương trình thật (OMML), bản in → KaTeX HTML
import { boCongThuc } from './boCongThuc';
import { veCongThucKatex } from './congThucIn';
import { latexSangOmml } from './congThucWord';
// CSS KaTeX nhúng thẳng (Vite ?inline tự đổi url() phông chữ) — bản in đúng dù trang chưa nạp katex.css
import katexCss from 'katex/dist/katex.min.css?inline';

boCongThuc.omml = latexSangOmml;
boCongThuc.html = veCongThucKatex;
boCongThuc.css = katexCss;

export * from './coBan';
export { latexSangOmml } from './congThucWord';
export { veCongThucKatex } from './congThucIn';
