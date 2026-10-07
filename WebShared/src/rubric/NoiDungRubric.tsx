/**
 * Hiển thị ô nội dung của rubric (mô tả tiêu chí / đáp án mẫu / mô tả mức): chuỗi thường in nguyên văn,
 * nội dung có công thức toán (HTML của OEditor) render qua NoiDungOEditor (KaTeX).
 */
import { NoiDungOEditor } from '../oeditor';
import { laHtml } from './tinhToan';

export default function NoiDungRubric({ html, khoi = false }: { html?: string; khoi?: boolean }) {
  if (!html) return null;
  if (!laHtml(html)) return <>{html}</>;
  return <NoiDungOEditor html={html} inline={!khoi} />;
}
