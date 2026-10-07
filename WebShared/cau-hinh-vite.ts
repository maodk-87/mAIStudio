/**
 * Cấu hình nhúng @web-shared cho vite.config.ts của từng web.
 * KHÔNG import gì ở tệp này — nó được nạp từ vite.config của web, nằm ngoài
 * thư mục web nên không tự tìm thấy node_modules.
 *
 * Vì mã package nằm ngoài thư mục web, import trần ('antd', 'katex'…) bên trong nó
 * phải được giải quyết từ node_modules CỦA WEB: `resolve.dedupe` bắt Vite làm đúng
 * như vậy (và bảo đảm chỉ một bản React/antd). Thêm phụ thuộc mới cho package thì
 * bổ sung vào danh sách này + peerDependencies trong package.json.
 */

/** Đường dẫn package, tương đối với thư mục một web project (src/<Web>/) */
export const THU_MUC_WEB_SHARED = '../WebShared';

/** Phụ thuộc dùng bên trong package — giải quyết từ node_modules của web */
export const PHU_THUOC_WEB_SHARED = [
  'react',
  'react-dom',
  'react-router-dom',
  'axios',
  'antd',
  '@ant-design/icons',
  'katex',
  'jszip',
  'docx-preview',
  'pptx-preview',
  // OEditor
  '@tiptap/core',
  '@tiptap/pm',
  '@tiptap/react',
  '@tiptap/starter-kit',
  '@tiptap/extensions',
  '@tiptap/extension-image',
  '@tiptap/extension-subscript',
  '@tiptap/extension-superscript',
  '@tiptap/extension-table',
  '@tiptap/extension-text-align',
  '@tiptap/extension-text-style',
  'mathlive',
  // word-html (dán/import Word)
  'dompurify',
  'mathml-to-latex',
  // soan-cau-hoi (biểu đồ ICC ở chi tiết câu hỏi)
  'recharts',
  // thong-bao (chuông realtime — hub /hubs/thong-bao); chỉ web dùng @web-shared/thong-bao mới cần cài
  '@microsoft/signalr',
];
