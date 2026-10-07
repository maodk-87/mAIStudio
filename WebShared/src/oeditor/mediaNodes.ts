/**
 * Node TipTap cho media nhúng trong nội dung câu hỏi:
 * - videoNhung: <video controls> phát được ngay trong bài;
 * - tepDinhKem: tệp đính kèm XEM NGAY trong bài bằng Trình xem tài liệu trực tuyến
 *   (Word, PowerPoint, PDF, văn bản/mã nguồn…) — @web-shared/trinh-xem-tai-lieu.
 *
 * Tệp được tải lên Dịch vụ Tệp (hiện là API giả lập — @web-shared/dich-vu-tep) và tham chiếu
 * bằng `maTep`; `src` (data URL) giữ làm dự phòng giai đoạn mock.
 * Serialize: <div data-tep data-ma-tep data-src data-ten data-loai data-rong data-cao>;
 * NoiDungHtml gắn lại trình xem cho các div này ở mọi màn hiển thị.
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import NodeViewTep from './NodeViewTep';
import './media-nhung.scss';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaNhung: {
      chenVideo: (attrs: { src: string; ten: string; rong: number; cao: number }) => ReturnType;
      chenTep: (attrs: {
        maTep?: string;
        src: string;
        ten: string;
        loai: string;
        rong: number;
        cao: number;
      }) => ReturnType;
    };
  }
}

// ===================== NODE VIDEO =====================
export const VideoNhung = Node.create({
  name: 'videoNhung',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: { default: '' },
      ten: { default: 'video' },
      rong: {
        default: 640,
        parseHTML: (el) => parseInt(el.getAttribute('width') ?? '640', 10),
        renderHTML: (a) => ({ width: String(a.rong) }),
      },
      cao: {
        default: 360,
        parseHTML: (el) => parseInt(el.getAttribute('height') ?? '360', 10),
        renderHTML: (a) => ({ height: String(a.cao) }),
      },
    };
  },
  parseHTML() {
    return [{
      tag: 'video',
      getAttrs: (el) => ({ src: el.getAttribute('src') ?? '', ten: el.getAttribute('title') ?? 'video' }),
    }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, {
      src: node.attrs.src as string,
      title: node.attrs.ten as string,
      controls: 'controls',
      preload: 'metadata',
    })];
  },
  addCommands() {
    return {
      chenVideo: (attrs) => ({ commands }) =>
        commands.insertContent([{ type: this.name, attrs }, { type: 'paragraph' }]),
    };
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'video-nhung';
      dom.contentEditable = 'false';
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'metadata';
      video.src = node.attrs.src as string;
      video.width = node.attrs.rong as number;
      video.height = node.attrs.cao as number;
      dom.appendChild(video);
      return { dom };
    };
  },
});

// ===================== NODE TỆP ĐÍNH KÈM =====================
export const TepDinhKem = Node.create({
  name: 'tepDinhKem',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      maTep: { default: null, parseHTML: (el) => el.getAttribute('data-ma-tep') },
      src: { default: '', parseHTML: (el) => el.getAttribute('data-src') ?? '' },
      ten: { default: 'tep', parseHTML: (el) => el.getAttribute('data-ten') ?? 'tep' },
      loai: { default: '', parseHTML: (el) => el.getAttribute('data-loai') ?? '' },
      rong: {
        default: 720,
        parseHTML: (el) => parseInt(el.getAttribute('data-rong') ?? '720', 10),
      },
      cao: {
        default: 520,
        parseHTML: (el) => parseInt(el.getAttribute('data-cao') ?? '520', 10),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-tep]' }];
  },
  renderHTML({ node }) {
    const a = node.attrs;
    return ['div', {
      'data-tep': '1',
      ...(a.maTep ? { 'data-ma-tep': a.maTep as string } : {}),
      'data-src': a.src as string,
      'data-ten': a.ten as string,
      'data-loai': a.loai as string,
      'data-rong': String(a.rong),
      'data-cao': String(a.cao),
      style: `width:${a.rong}px;height:${a.cao}px`,
    }, a.ten as string];
  },
  addCommands() {
    return {
      chenTep: (attrs) => ({ commands }) =>
        commands.insertContent([{ type: this.name, attrs }, { type: 'paragraph' }]),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(NodeViewTep, {
      // thao tác trong trình xem (nút, cuộn, phím mũi tên chuyển slide) không để
      // ProseMirror bắt thành thao tác soạn thảo; bấm vào TÊN tệp vẫn chọn cả khối
      stopEvent: ({ event }) => {
        const dich = event.target as HTMLElement | null;
        return !!dich?.closest?.('.txtl') && !dich.closest('.txtl__tieu-de');
      },
    });
  },
});
