/**
 * Node TipTap "congThuc" — công thức toán học sống trong nội dung câu hỏi.
 * - Lưu trong HTML dưới dạng <span data-cong-thuc="LaTeX">LaTeX</span>
 *   (text LaTeX bên trong là fallback khi nơi hiển thị chưa render KaTeX).
 * - Trong editor: render bằng KaTeX, click vào để sửa bằng bảng nhập MathLive.
 */
import { mergeAttributes, Node } from '@tiptap/core';
import katex from 'katex';

export interface TuyChonCongThuc {
  /** Gọi khi người dùng click vào công thức để sửa (vị trí node + LaTeX hiện tại) */
  onSuaCongThuc?: (viTri: number, latex: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    congThuc: {
      /** Chèn công thức mới tại con trỏ */
      chenCongThuc: (latex: string) => ReturnType;
      /** Cập nhật LaTeX của công thức tại vị trí cho trước */
      capNhatCongThuc: (viTri: number, latex: string) => ReturnType;
    };
  }
}

export const CongThuc = Node.create<TuyChonCongThuc>({
  name: 'congThuc',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { onSuaCongThuc: undefined };
  },

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-cong-thuc') ?? '',
        renderHTML: (attrs) => ({ 'data-cong-thuc': attrs.latex as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-cong-thuc]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    // text LaTeX làm fallback — nơi hiển thị sẽ render lại bằng KaTeX (NoiDungHtml)
    return ['span', mergeAttributes(HTMLAttributes), (node.attrs.latex as string) || ''];
  },

  addCommands() {
    return {
      chenCongThuc:
        (latex) =>
        ({ commands }) =>
          commands.insertContent([
            { type: this.name, attrs: { latex } },
            { type: 'text', text: ' ' },
          ]),
      capNhatCongThuc:
        (viTri, latex) =>
        ({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(viTri);
          if (!node || node.type.name !== this.name) return false;
          if (dispatch) tr.setNodeMarkup(viTri, undefined, { ...node.attrs, latex });
          return true;
        },
    };
  },

  addNodeView() {
    const { onSuaCongThuc } = this.options;
    return ({ node, getPos }) => {
      let latexHienTai = (node.attrs.latex as string) || '';

      const dom = document.createElement('span');

      const render = (latex: string) => {
        dom.setAttribute('data-cong-thuc', latex);
        if (!latex) {
          // ô công thức trống (từ MathType OLE không đọc được) — bấm để nhập
          dom.className = 'editor-soan-thao__cong-thuc editor-soan-thao__cong-thuc--trong';
          dom.title = 'Công thức chưa có nội dung — bấm để nhập bằng bảng công thức';
          dom.textContent = 'Σ bấm để nhập công thức';
          return;
        }
        dom.className = 'editor-soan-thao__cong-thuc';
        dom.title = 'Click để sửa công thức';
        try {
          katex.render(latex, dom, { throwOnError: false });
        } catch {
          dom.textContent = latex;
        }
      };
      render(latexHienTai);

      dom.addEventListener('click', () => {
        const viTri = typeof getPos === 'function' ? getPos() : undefined;
        if (viTri != null) onSuaCongThuc?.(viTri, latexHienTai);
      });

      return {
        dom,
        update: (nodeMoi) => {
          if (nodeMoi.type.name !== 'congThuc') return false;
          latexHienTai = (nodeMoi.attrs.latex as string) || '';
          render(latexHienTai);
          return true;
        },
      };
    };
  },
});
