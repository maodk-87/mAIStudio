/**
 * Định dạng mở rộng kiểu Word cho editor:
 * - thụt lề đoạn (Tab vào/ra — mỗi nấc 32px, tối đa 8 nấc) trên paragraph/heading;
 * - căn theo dòng (vertical-align top/middle/bottom) cho chữ/ảnh/công thức đang chọn.
 * (Căn trái/phải/giữa/đều dùng @tiptap/extension-text-align; font/cỡ/màu/giãn dòng
 * dùng TextStyleKit — khai báo ở EditorSoanThao.)
 */
import { Extension } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

const MOT_NAC_PX = 32;
const NAC_TOI_DA = 8;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dinhDangMoRong: {
      /** Thụt đoạn đang chọn vào 1 tab */
      tangThutLe: () => ReturnType;
      /** Thò đoạn đang chọn ra 1 tab */
      giamThutLe: () => ReturnType;
      /** Căn phần đang chọn theo dòng: top | middle | bottom | null (bỏ) */
      datCanDoc: (giaTri: 'top' | 'middle' | 'bottom' | null) => ReturnType;
    };
  }
}

const doiThutLe = (huong: 1 | -1) =>
  ({ tr, state, dispatch }: { tr: any; state: any; dispatch?: any }): boolean => {
    const { from, to } = state.selection;
    let doiDuoc = false;
    state.doc.nodesBetween(from, to, (node: any, pos: number) => {
      if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
      const hienTai: number = node.attrs.thutLe ?? 0;
      const moi = Math.min(NAC_TOI_DA, Math.max(0, hienTai + huong));
      if (moi !== hienTai) {
        if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, thutLe: moi });
        doiDuoc = true;
      }
    });
    return doiDuoc;
  };

export const DinhDangMoRong = Extension.create({
  name: 'dinhDangMoRong',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          thutLe: {
            default: 0,
            parseHTML: (el: HTMLElement) => {
              const m = /margin-left:\s*([\d.]+)px/.exec(el.getAttribute('style') ?? '');
              return m ? Math.min(NAC_TOI_DA, Math.round(parseFloat(m[1]) / MOT_NAC_PX)) : 0;
            },
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.thutLe
                ? { style: `margin-left: ${(attrs.thutLe as number) * MOT_NAC_PX}px` }
                : {},
          },
        },
      },
      {
        types: ['textStyle', 'image', 'congThuc'],
        attributes: {
          canDoc: {
            default: null,
            parseHTML: (el: HTMLElement) => {
              const m = /vertical-align:\s*(top|middle|bottom)/.exec(el.getAttribute('style') ?? '');
              return m ? m[1] : null;
            },
            renderHTML: (attrs: Record<string, unknown>) =>
              attrs.canDoc ? { style: `vertical-align: ${attrs.canDoc as string}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      tangThutLe: () => doiThutLe(1),
      giamThutLe: () => doiThutLe(-1),
      datCanDoc:
        (giaTri) =>
        ({ state, commands, chain }) => {
          // đang chọn nguyên node ảnh/công thức → đặt attr trực tiếp lên node
          const luaChon = state.selection;
          if (luaChon instanceof NodeSelection) {
            const tenNode = luaChon.node.type.name;
            if (tenNode === 'image' || tenNode === 'congThuc') {
              return commands.updateAttributes(tenNode, { canDoc: giaTri });
            }
          }
          if (giaTri === null) return chain().setMark('textStyle', { canDoc: null }).run();
          return chain().setMark('textStyle', { canDoc: giaTri }).run();
        },
    };
  },
});
