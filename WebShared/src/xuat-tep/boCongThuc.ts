/**
 * Bộ chuyển công thức dùng khi xuất Word / in — ĐĂNG KÝ ĐƯỢC để phần lõi không phụ thuộc KaTeX:
 * `@web-shared/xuat-tep` (index) đăng ký bản KaTeX (công thức thật); `@web-shared/xuat-tep/coBan`
 * (web không cài katex, VD CoreAdmin) giữ bản mặc định — công thức hiện dạng chữ LaTeX.
 */
// eslint-disable-next-line no-control-regex
const xml = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const boCongThuc = {
  /** LaTeX → OOXML chèn trong <w:p> */
  omml: (latex: string): string => `<w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve">${xml(latex)}</w:t></w:r>`,
  /** HTML có <span data-cong-thuc> → HTML đã vẽ công thức (bản in) */
  html: (html: string): string => html,
  /** CSS cần nhúng vào tài liệu in (KaTeX) — trang đang mở có thể chưa nạp katex.css */
  css: '',
};
