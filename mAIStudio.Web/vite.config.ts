import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// @web-shared: bản sao WebShared của monorepo KTS đặt ở ../WebShared (khi cắm monorepo thì trỏ lại bằng WEB_SHARED_DIR).
const webShared = path.resolve(process.env.WEB_SHARED_DIR ?? path.join(__dirname, '../WebShared'));

// Phụ thuộc dùng bên trong @web-shared — giải quyết từ node_modules của web này (docs/10 §6.1)
const PHU_THUOC_WEB_SHARED = [
  'react', 'react-dom', 'react-router-dom', 'axios', 'antd', '@ant-design/icons', 'katex', 'jszip', 'docx-preview', 'pptx-preview',
  '@tiptap/core', '@tiptap/pm', '@tiptap/react', '@tiptap/starter-kit', '@tiptap/extensions', '@tiptap/extension-image',
  '@tiptap/extension-subscript', '@tiptap/extension-superscript', '@tiptap/extension-table', '@tiptap/extension-text-align',
  '@tiptap/extension-text-style', 'mathlive', 'dompurify', 'mathml-to-latex', 'recharts',
];

// base '/maistudio/' khi cắm monorepo (cổng dev 2512); UI-first chạy ở gốc để duyệt nhanh
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@web-shared': path.join(webShared, 'src'),
    },
    dedupe: PHU_THUOC_WEB_SHARED,
  },
  server: {
    fs: { allow: [__dirname, webShared] },
    port: 2512,
    strictPort: true,
  },
  build: { chunkSizeWarningLimit: 2500 },
});
