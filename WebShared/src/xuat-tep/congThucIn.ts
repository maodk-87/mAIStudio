/** Vẽ công thức <span data-cong-thuc="LaTeX"> bằng KaTeX (HTML) cho bản in — đăng ký ở index.ts */
import katex from 'katex';

export function veCongThucKatex(html: string): string {
  if (!html.includes('data-cong-thuc') && !html.includes('data-latex')) return html;
  const d = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  d.querySelectorAll('[data-cong-thuc],[data-latex]').forEach((el) => {
    const latex = el.getAttribute('data-cong-thuc') ?? el.getAttribute('data-latex') ?? '';
    try {
      el.innerHTML = katex.renderToString(latex, { throwOnError: false, output: 'html' });
    } catch {
      el.textContent = latex;
    }
  });
  return d.body.innerHTML;
}
