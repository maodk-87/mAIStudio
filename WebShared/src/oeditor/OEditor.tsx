/**
 * PLUGIN OEditor — trình soạn thảo nội dung câu hỏi dùng chung các web (@web-shared/oeditor),
 * TipTap 3 (MIT) theo ADR-09 (docs/07):
 * - Toolbar kiểu Word: font chữ, cỡ chữ, Đậm/Nghiêng/Gạch chân/Gạch giữa,
 *   chỉ số trên–dưới, màu chữ, màu nền, căn trái/giữa/phải/đều, căn theo dòng
 *   (trên/giữa/dưới), danh sách, thụt lề vào/ra, giãn dòng, bảng, chèn
 *   Ảnh/Công thức/Link/Video/Tệp (modal chọn tệp → xem trước → chỉnh kích
 *   thước khung → Xác nhận mới đưa xuống bài; PDF xem bằng trình xem PDF,
 *   text/code bằng TextView, Office bằng khung OfficeView chờ tích hợp BE).
 * - Công thức toán: nhập trực quan bằng MathLive, render KaTeX, click để sửa.
 * - Dán từ Word: giữ định dạng, chuyển công thức OMML/MathType (MTEF), dán ảnh
 *   thật đúng kích thước, bỏ nội dung ẩn/dòng trống 2 đầu (../word-html).
 * - Dán nguyên câu hỏi: bóc tách đề/phương án/đáp án bằng plugin oImportWord —
 *   CÙNG bộ định dạng với chức năng import tệp Word (prop `bocTachKhiDan`).
 *
 * BA ĐỊNH DẠNG (prop `cheDo`):
 * - `cau-hoi`  : soạn CÂU HỎI — dán nguyên câu từ Word thì bóc tách đề / phương án / đáp án / lời giải /
 *                câu con (cần `bocTachKhiDan`); toolbar đầy đủ.
 * - `soan-thao`: soạn thảo THÔNG THƯỜNG (trang nội dung, mô tả hoạt động, thông báo, bài làm tự luận,
 *                thảo luận…) — dán từ Word giữ nguyên nội dung, định dạng, ảnh, công thức, bảng; KHÔNG bóc
 *                tách đáp án/câu con (dòng "A.", "Đáp án:", "CH-TN"… giữ nguyên là chữ); toolbar đầy đủ.
 * - `gon`      : ô một dòng (phương án, đáp án ngắn, ô nhận xét ngắn) — không toolbar, chỉ nút Σ; không bóc tách.
 * Không truyền `cheDo`: suy ra từ prop cũ (`gon` → gon, có `bocTachKhiDan` → cau-hoi, còn lại → soan-thao).
 *
 * value/onChange là chuỗi HTML; hiển thị nội dung đã soạn bằng NoiDungOEditor.
 */
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BgColorsOutlined,
  BoldOutlined,
  FontColorsOutlined,
  FunctionOutlined,
  ItalicOutlined,
  LineHeightOutlined,
  LinkOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  PaperClipOutlined,
  PictureOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
  VerticalAlignBottomOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignTopOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Button, ColorPicker, Divider, Dropdown, Input, Modal, Select, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { Placeholder } from '@tiptap/extensions';
import { bocTachCauHoi, type CauHoiBocTach } from '../oimportword';
import { chuyenDoiHtmlDan, lamSachHtml } from '../word-html/chuyenDoiWord';
import { phanTichRtfClipboard, type DuLieuRtfClipboard } from '../word-html/rtfMtef';
import { useThongBao } from './useThongBao';
import { CongThuc } from './congThuc';
import { DinhDangMoRong } from './dinhDangMoRong';
import { TepDinhKem, VideoNhung } from './mediaNodes';
import ModalCongThuc from './ModalCongThuc';
import ModalChenMedia, { type KetQuaChenMedia, type LoaiMedia } from './ModalChenMedia';
import 'katex/dist/katex.min.css';
import './oeditor.scss';

/** Định dạng soạn thảo của OEditor — xem chú thích đầu tệp */
export type CheDoOEditor = 'cau-hoi' | 'soan-thao' | 'gon';

/** Định dạng thực tế từ prop mới `cheDo` hoặc prop cũ (tương thích ngược) */
export function xacDinhCheDoOEditor(p: Pick<OEditorProps, 'cheDo' | 'gon' | 'bocTachKhiDan'>): CheDoOEditor {
  return p.cheDo ?? (p.gon ? 'gon' : p.bocTachKhiDan ? 'cau-hoi' : 'soan-thao');
}

export interface OEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /**
   * Chế độ gọn cho ô đáp án/phương án: không toolbar (chỉ nút Σ nổi bên phải),
   * cao 1 dòng, HTML phát ra bỏ thẻ <p> bao ngoài khi chỉ có 1 đoạn.
   * Vẫn dán được từ Word + chuyển công thức như chế độ đầy đủ.
   */
  gon?: boolean;
  /**
   * Cho phép kéo giãn chiều cao ô nhập ở góc dưới phải (như textarea) — dùng cho ô nhận xét, mô tả dài.
   * `minHeight` là chiều cao ban đầu (chế độ gọn mặc định 72px).
   */
  keoGian?: boolean;
  /**
   * Bóc tách tự động khi dán nguyên câu hỏi (đề + phương án + đáp án) bằng plugin
   * oImportWord theo `loaiCau` đang chọn. Tách được → `onBocTach` nhận kết quả để điền
   * các ô tương ứng, editor chỉ giữ phần đề bài; không tách được → dán nguyên văn.
   */
  bocTachKhiDan?: { loaiCau: string; onBocTach: (kq: CauHoiBocTach) => void };
  /**
   * Định dạng soạn thảo: `cau-hoi` (bóc tách khi dán — dùng kèm `bocTachKhiDan`) · `soan-thao` (không bóc tách)
   * · `gon` (ô một dòng). Bỏ trống = suy từ `gon`/`bocTachKhiDan` như trước.
   */
  cheDo?: CheDoOEditor;
}

/** Node ảnh giữ được width/height (kích thước hiển thị lấy từ Word khi paste) */
const AnhCoKichThuoc = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('width'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.width ? { width: attrs.width as string } : {},
      },
      height: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('height'),
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.height ? { height: attrs.height as string } : {},
      },
    };
  },
});

/** Bỏ <p> bao ngoài khi nội dung chỉ có 1 đoạn (giá trị đáp án nằm trong dòng) */
const boPBaoNgoai = (html: string): string => {
  const khop = html.match(/^<p>([\s\S]*)<\/p>$/);
  if (khop && !khop[1].includes('<p')) return khop[1];
  return html === '<p></p>' ? '' : html;
};

const DS_FONT = [
  'Times New Roman', 'Arial', 'Tahoma', 'Calibri', 'Cambria',
  'Verdana', 'Georgia', 'Courier New',
];
const DS_CO_CHU = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48];
const DS_GIAN_DONG = ['1', '1.15', '1.3', '1.5', '2', '2.5', '3'];

export default function OEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung…',
  minHeight = 160,
  gon: gonCu = false,
  keoGian = false,
  bocTachKhiDan,
  cheDo,
}: OEditorProps) {
  const cheDoThuc = xacDinhCheDoOEditor({ cheDo, gon: gonCu, bocTachKhiDan });
  const gon = cheDoThuc === 'gon';
  if (import.meta.env.DEV && cheDoThuc === 'cau-hoi' && !bocTachKhiDan) {
    console.warn('[OEditor] cheDo="cau-hoi" cần prop bocTachKhiDan để bóc tách khi dán — đang dán nguyên văn');
  }
  // gọi qua ref để editorProps (chốt lúc khởi tạo) luôn dùng bản mới nhất.
  // Chỉ định dạng CÂU HỎI mới bóc tách đáp án/câu con khi dán; soạn thảo thường & ô gọn dán nguyên văn.
  const bocTachRef = useRef(cheDoThuc === 'cau-hoi' ? bocTachKhiDan : undefined);
  bocTachRef.current = cheDoThuc === 'cau-hoi' ? bocTachKhiDan : undefined;
  const thongBao = useThongBao();
  const thongBaoRef = useRef(thongBao);
  thongBaoRef.current = thongBao;
  // LaTeX/ảnh giải mã từ bản RTF của clipboard — nạp ở sự kiện paste (DOM),
  // tiêu thụ ngay sau đó trong transformPastedHTML (cùng một lượt xử lý paste)
  const hangDoiLatexRef = useRef<DuLieuRtfClipboard | null>(null);
  const [congThucDangSua, setCongThucDangSua] = useState<{ viTri?: number; latex: string } | null>(
    null,
  );
  const [mediaDangChen, setMediaDangChen] = useState<LoaiMedia | null>(null);
  const [linkDangSua, setLinkDangSua] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        link: { openOnClick: false, autolink: true },
      }),
      TextStyleKit, // font chữ, cỡ chữ, màu chữ, màu nền, giãn dòng
      TextAlign.configure({
        types: ['paragraph', 'heading'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      DinhDangMoRong, // thụt lề + căn theo dòng
      Superscript,
      Subscript,
      TableKit.configure({ table: { resizable: false } }),
      AnhCoKichThuoc.configure({ inline: true, allowBase64: true }),
      VideoNhung,
      TepDinhKem,
      Placeholder.configure({ placeholder }),
      CongThuc.configure({
        onSuaCongThuc: (viTri, latex) => setCongThucDangSua({ viTri, latex }),
      }),
    ],
    content: value || '',
    editorProps: {
      handleDOMEvents: {
        paste: (view, event) => {
          const cb = event.clipboardData;
          // đọc bản RTF của clipboard: chứa dữ liệu MTEF gốc của công thức
          // MathType OLE + dữ liệu PNG/JPEG gốc của hình ảnh
          try {
            const rtf = cb?.getData('text/rtf') ?? '';
            hangDoiLatexRef.current =
              rtf.includes('\\object') || rtf.includes('\\pict') ? phanTichRtfClipboard(rtf) : null;
          } catch (loi) {
            console.error('[OEditor] không đọc được bản RTF của clipboard', loi);
            hangDoiLatexRef.current = null;
          }
          const html = cb?.getData('text/html') ?? '';
          if (html) {
            // Clipboard có bản HTML → LUÔN tự dán theo đường HTML (transformPastedHTML: chuyển công thức/ảnh, bóc tách
            // câu hỏi). KHÔNG để trình xử lý paste mặc định của ProseMirror quyết định, vì nó có 2 lối rẽ làm mất hết:
            //  - đang trong phiên gõ IME (view.composing — bộ gõ tiếng Việt kiểu IME như bàn phím Vietnamese Telex của
            //    Windows để phiên gõ mở tới khi gõ dấu cách): ProseMirror BỎ QUA, trình duyệt tự dán HTML thô vào
            //    contenteditable → ảnh file:// hỏng, công thức OLE thành ảnh chết, không bóc tách, không báo gì
            //    (đã tái hiện bằng đề thật — đúng triệu chứng người dùng báo);
            //  - cờ Shift nội bộ còn "dính" hoặc con trỏ trong khối code → dán VĂN BẢN THUẦN.
            // Dán thuần chủ ý bằng Ctrl+Shift+V thì trình duyệt không đưa text/html vào clipboard nên không qua nhánh này.
            event.preventDefault();
            view.pasteHTML(html, event);
            return true;
          }
          const vanBan = cb?.getData('text/plain') ?? '';
          if (bocTachRef.current && /\S/.test(vanBan) && !cb?.files.length) {
            // Chỉ có văn bản thuần ở ô soạn CÂU HỎI: vẫn đưa qua đường HTML để bóc tách đề / phương án / đáp án
            const thoat = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const dsDong = vanBan.split(/\r?\n/);
            event.preventDefault();
            view.pasteHTML(dsDong.map((d) => `<p>${thoat(d)}</p>`).join(''), event);
            return true;
          }
          return false; // để ProseMirror tiếp tục xử lý paste như thường
        },
      },
      transformPastedHTML: (html) => {
        if (import.meta.env.DEV) {
          // chẩn đoán lỗi paste: xem HTML gốc Word đưa vào clipboard (chỉ ở dev)
          console.debug('[OEditor] clipboard HTML (3000 ký tự đầu):', html.slice(0, 3000));
        }
        const tb = thongBaoRef.current;
        const tuRtf = hangDoiLatexRef.current ?? undefined;
        hangDoiLatexRef.current = null;
        let kq: ReturnType<typeof chuyenDoiHtmlDan>;
        try {
          kq = chuyenDoiHtmlDan(html, tuRtf);
        } catch (loi) {
          // KHÔNG để lỗi lọt ra ngoài: ProseMirror sẽ bỏ dở và trình duyệt tự dán HTML thô (mất công thức, ảnh — không báo gì)
          console.error('[OEditor] lỗi chuyển đổi nội dung dán', loi);
          setTimeout(
            () => tb.loi(`Không chuyển đổi được nội dung dán (${loi instanceof Error ? loi.message : 'lỗi không rõ'}) — đã dán phần văn bản, công thức/hình ảnh cần chèn lại`),
            0,
          );
          return lamSachHtml(new DOMParser().parseFromString(html, 'text/html').body);
        }
        // báo kết quả thật (không phải toast trang trí như bản mock cũ)
        setTimeout(() => {
          if (kq.soCongThuc > 0 || kq.soAnhDan > 0) {
            const phan: string[] = [];
            if (kq.soCongThuc > 0) phan.push(`${kq.soCongThuc} công thức thành công thức sống`);
            if (kq.soAnhDan > 0) phan.push(`${kq.soAnhDan} hình ảnh`);
            tb.thanhCong(
              `Đã chuyển đổi ${phan.join(' + ')} từ ${kq.tuWord ? 'Word' : 'nội dung dán'}${kq.soCongThuc > 0 ? ' — click vào công thức để sửa' : ''}`,
            );
          } else if (kq.tuWord && !kq.soCongThucOle) {
            tb.thanhCong('Đã dán nội dung từ Word — định dạng cơ bản được giữ nguyên');
          }
          if (kq.soCongThucOle > 0) {
            tb.canhBao(
              `${kq.soCongThucOle} công thức MathType không đọc được dữ liệu gốc — đã chèn ô công thức trống, bấm vào từng ô "Σ bấm để nhập công thức" để nhập lại`,
            );
          }
          if (kq.soCongThucChuaTron > 0) {
            tb.canhBao(
              `${kq.soCongThucChuaTron} công thức MathType có ký hiệu chưa nhận diện được (hiện ô "?") — bấm vào công thức để kiểm tra và sửa`,
            );
          }
          if (kq.soKhongChuyenDuoc > 0) {
            tb.canhBao(
              kq.soAnhVector === kq.soKhongChuyenDuoc
                ? `${kq.soKhongChuyenDuoc} hình vẽ/ảnh vector của Word (Shapes, WMF, EMF) không dán trực tiếp được — trong Word hãy chuột phải vào hình → "Lưu dưới dạng ảnh" (PNG) hoặc chụp lại, rồi chèn bằng nút Ảnh`
                : `${kq.soKhongChuyenDuoc} ảnh từ Word không dán trực tiếp được — hãy chèn lại bằng nút Ảnh`,
            );
          }
        }, 0);
        // dán nguyên câu hỏi → bóc tách bằng oImportWord (cùng định dạng với import tệp)
        const cauHinhBocTach = bocTachRef.current;
        if (cauHinhBocTach) {
          try {
            const cau = bocTachCauHoi(kq.html, { loaiCau: cauHinhBocTach.loaiCau });
            if (cau) {
              cauHinhBocTach.onBocTach(cau);
              return cau.noiDung;
            }
          } catch {
            // lỗi bóc tách → dán nguyên văn, không chặn thao tác
          }
        }
        return kq.html;
      },
    },
    // Nội dung trống → '' (không phát '<p></p>' — tránh tính nhầm là đã nhập, VD câu tự luận chưa làm)
    onUpdate: ({ editor: e }) => onChange(gon ? boPBaoNgoai(e.getHTML()) : e.isEmpty ? '' : e.getHTML()),
  });

  // Đồng bộ khi giá trị đổi từ bên ngoài (nạp dữ liệu sửa, làm trống form)
  useEffect(() => {
    // guard isDestroyed: StrictMode (dev) mount đôi — instance đầu đã bị hủy
    if (!editor || editor.isDestroyed) return;
    const hienTai = editor.getHTML();
    const soSanh = gon ? boPBaoNgoai(hienTai) : hienTai;
    if (value !== soSanh && !(value === '' && hienTai === '<p></p>')) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor, gon]);

  const trangThai = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      const kieuChu = e?.getAttributes('textStyle') ?? {};
      return {
        dam: e?.isActive('bold') ?? false,
        nghieng: e?.isActive('italic') ?? false,
        gachChan: e?.isActive('underline') ?? false,
        gachGiua: e?.isActive('strike') ?? false,
        chiSoTren: e?.isActive('superscript') ?? false,
        chiSoDuoi: e?.isActive('subscript') ?? false,
        dsCham: e?.isActive('bulletList') ?? false,
        dsSo: e?.isActive('orderedList') ?? false,
        lienKet: e?.isActive('link') ?? false,
        canTrai: e?.isActive({ textAlign: 'left' }) ?? false,
        canGiua: e?.isActive({ textAlign: 'center' }) ?? false,
        canPhai: e?.isActive({ textAlign: 'right' }) ?? false,
        canDeu: e?.isActive({ textAlign: 'justify' }) ?? false,
        font: (kieuChu.fontFamily as string) ?? '',
        coChu: (kieuChu.fontSize as string) ?? '',
        mauChu: (kieuChu.color as string) ?? '#1f2733',
        mauNen: (kieuChu.backgroundColor as string) ?? '#ffffff',
      };
    },
  });

  const chay = () => editor?.chain().focus();

  const thutVao = () => {
    if (!editor) return;
    if (editor.isActive('listItem')) editor.chain().focus().sinkListItem('listItem').run();
    else editor.chain().focus().tangThutLe().run();
  };
  const thoRa = () => {
    if (!editor) return;
    if (editor.isActive('listItem')) editor.chain().focus().liftListItem('listItem').run();
    else editor.chain().focus().giamThutLe().run();
  };

  const chenMedia = (kq: KetQuaChenMedia) => {
    if (!editor) return;
    if (kq.loaiMedia === 'anh') {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'image',
          attrs: { src: kq.src, alt: kq.ten, width: String(kq.rong), height: String(kq.cao) },
        })
        .run();
    } else if (kq.loaiMedia === 'video') {
      editor.chain().focus().chenVideo({ src: kq.src, ten: kq.ten, rong: kq.rong, cao: kq.cao }).run();
    } else {
      editor
        .chain()
        .focus()
        .chenTep({ maTep: kq.maTep, src: kq.src, ten: kq.ten, loai: kq.mime, rong: kq.rong, cao: kq.cao })
        .run();
    }
    setMediaDangChen(null);
    thongBao.thanhCong(`Đã chèn ${kq.loaiMedia === 'anh' ? 'ảnh' : kq.loaiMedia === 'video' ? 'video' : 'tệp'} "${kq.ten}" vào bài`);
  };

  const nutDinhDang = (
    key: string,
    tooltip: string,
    icon: React.ReactNode,
    onClick: () => void,
    kichHoat?: boolean,
  ) => (
    <Tooltip key={key} title={tooltip}>
      <Button
        size="small"
        type="text"
        className={kichHoat ? 'editor-soan-thao__nut--kich-hoat' : undefined}
        icon={icon}
        aria-label={tooltip}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
      />
    </Tooltip>
  );

  const vachNgan = (k: string) => (
    <Divider key={k} orientation="vertical" className="editor-soan-thao__vach" />
  );

  return (
    <div className={`editor-soan-thao${gon ? ' editor-soan-thao--gon' : ''}${keoGian ? ' editor-soan-thao--keo-gian' : ''}`}>
      {gon ? (
        <Tooltip title="Chèn công thức toán học (nhập trực quan như Word)">
          <Button
            size="small"
            type="text"
            className="editor-soan-thao__nut-gon"
            icon={<FunctionOutlined />}
            aria-label="Công thức toán học"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCongThucDangSua({ latex: '' })}
          />
        </Tooltip>
      ) : (
        <div className="editor-soan-thao__toolbar">
          {/* ===== font & cỡ chữ ===== */}
          <Select
            size="small"
            className="editor-soan-thao__chon-font"
            popupMatchSelectWidth={false}
            placeholder="Font chữ"
            value={trangThai?.font || undefined}
            options={DS_FONT.map((f) => ({ value: f, label: <span style={{ fontFamily: f }}>{f}</span> }))}
            onChange={(f) => chay()?.setFontFamily(f).run()}
            allowClear
            onClear={() => chay()?.unsetFontFamily().run()}
          />
          <Select
            size="small"
            className="editor-soan-thao__chon-co"
            popupMatchSelectWidth={false}
            placeholder="Cỡ"
            value={trangThai?.coChu ? parseInt(trangThai.coChu, 10) : undefined}
            options={DS_CO_CHU.map((c) => ({ value: c, label: c }))}
            onChange={(c) => chay()?.setFontSize(`${c}pt`).run()}
            allowClear
            onClear={() => chay()?.unsetFontSize().run()}
          />
          {vachNgan('v1')}
          {/* ===== kiểu chữ ===== */}
          {nutDinhDang('b', 'Đậm (Ctrl+B)', <BoldOutlined />, () => chay()?.toggleBold().run(), trangThai?.dam)}
          {nutDinhDang('i', 'Nghiêng (Ctrl+I)', <ItalicOutlined />, () => chay()?.toggleItalic().run(), trangThai?.nghieng)}
          {nutDinhDang('u', 'Gạch chân (Ctrl+U)', <UnderlineOutlined />, () => chay()?.toggleUnderline().run(), trangThai?.gachChan)}
          {nutDinhDang('s', 'Gạch giữa chữ', <StrikethroughOutlined />, () => chay()?.toggleStrike().run(), trangThai?.gachGiua)}
          {nutDinhDang('sup', 'Chỉ số trên (x²)', <span className="editor-soan-thao__nut-chu">x²</span>, () => chay()?.toggleSuperscript().run(), trangThai?.chiSoTren)}
          {nutDinhDang('sub', 'Chỉ số dưới (H₂O)', <span className="editor-soan-thao__nut-chu">x₂</span>, () => chay()?.toggleSubscript().run(), trangThai?.chiSoDuoi)}
          {/* ===== màu chữ / màu nền ===== */}
          <Tooltip title="Màu chữ">
            <ColorPicker
              size="small"
              value={trangThai?.mauChu}
              onChangeComplete={(mau) => chay()?.setColor(mau.toHexString()).run()}
            >
              <Button size="small" type="text" icon={<FontColorsOutlined style={{ color: trangThai?.mauChu }} />} aria-label="Màu chữ" />
            </ColorPicker>
          </Tooltip>
          <Tooltip title="Màu nền chữ">
            <ColorPicker
              size="small"
              value={trangThai?.mauNen}
              onChangeComplete={(mau) => chay()?.setBackgroundColor(mau.toHexString()).run()}
            >
              <Button size="small" type="text" icon={<BgColorsOutlined />} aria-label="Màu nền chữ" />
            </ColorPicker>
          </Tooltip>
          {vachNgan('v2')}
          {/* ===== căn lề & căn dòng ===== */}
          {nutDinhDang('ctr', 'Căn trái', <AlignLeftOutlined />, () => chay()?.setTextAlign('left').run(), trangThai?.canTrai)}
          {nutDinhDang('cgi', 'Căn giữa', <AlignCenterOutlined />, () => chay()?.setTextAlign('center').run(), trangThai?.canGiua)}
          {nutDinhDang('cph', 'Căn phải', <AlignRightOutlined />, () => chay()?.setTextAlign('right').run(), trangThai?.canPhai)}
          {nutDinhDang('cde', 'Căn đều 2 bên', <MenuOutlined />, () => chay()?.setTextAlign('justify').run(), trangThai?.canDeu)}
          <Dropdown
            menu={{
              items: [
                { key: 'top', icon: <VerticalAlignTopOutlined />, label: 'Căn trên dòng' },
                { key: 'middle', icon: <VerticalAlignMiddleOutlined />, label: 'Căn giữa dòng' },
                { key: 'bottom', icon: <VerticalAlignBottomOutlined />, label: 'Căn dưới dòng' },
                { key: 'bo', label: 'Bỏ căn theo dòng' },
              ],
              onClick: ({ key }) =>
                chay()?.datCanDoc(key === 'bo' ? null : (key as 'top' | 'middle' | 'bottom')).run(),
            }}
          >
            <Button size="small" type="text" icon={<VerticalAlignMiddleOutlined />} aria-label="Căn theo dòng (trên/giữa/dưới)" />
          </Dropdown>
          {vachNgan('v3')}
          {/* ===== danh sách, thụt lề, giãn dòng ===== */}
          {nutDinhDang('ul', 'Danh sách chấm', <UnorderedListOutlined />, () => chay()?.toggleBulletList().run(), trangThai?.dsCham)}
          {nutDinhDang('ol', 'Danh sách đánh số', <OrderedListOutlined />, () => chay()?.toggleOrderedList().run(), trangThai?.dsSo)}
          {nutDinhDang('outdent', 'Thò ra 1 tab', <MenuFoldOutlined />, thoRa)}
          {nutDinhDang('indent', 'Thụt vào 1 tab', <MenuUnfoldOutlined />, thutVao)}
          <Dropdown
            menu={{
              items: [
                ...DS_GIAN_DONG.map((g) => ({ key: g, label: `Giãn dòng ${g}` })),
                { key: 'bo', label: 'Mặc định' },
              ],
              onClick: ({ key }) =>
                key === 'bo' ? chay()?.unsetLineHeight().run() : chay()?.setLineHeight(key).run(),
            }}
          >
            <Button size="small" type="text" icon={<LineHeightOutlined />} aria-label="Khoảng cách dòng" />
          </Dropdown>
          {vachNgan('v4')}
          {/* ===== chèn ===== */}
          {nutDinhDang('table', 'Chèn bảng', <TableOutlined />, () => chay()?.insertTable({ rows: 2, cols: 3, withHeaderRow: false }).run())}
          {nutDinhDang('img', 'Chèn ảnh (xem trước & chỉnh kích thước)', <PictureOutlined />, () => setMediaDangChen('anh'))}
          {nutDinhDang('formula', 'Công thức toán học (nhập trực quan như Word)', <FunctionOutlined />, () => setCongThucDangSua({ latex: '' }))}
          {nutDinhDang('link', 'Chèn liên kết', <LinkOutlined />, () => {
            const hienTai = (editor?.getAttributes('link')?.href as string) ?? '';
            setLinkDangSua(hienTai);
          }, trangThai?.lienKet)}
          {nutDinhDang('video', 'Chèn video (phát ngay trong bài)', <VideoCameraOutlined />, () => setMediaDangChen('video'))}
          {nutDinhDang('tep', 'Chèn tệp PDF/Office/text (xem ngay trong bài)', <PaperClipOutlined />, () => setMediaDangChen('tep'))}
        </div>
      )}
      <EditorContent
        editor={editor}
        className="editor-soan-thao__noi-dung"
        style={{ minHeight: keoGian ? (gon && minHeight === 160 ? 72 : minHeight) : gon ? 40 : minHeight }}
      />
      <ModalCongThuc
        open={congThucDangSua !== null}
        latexBanDau={congThucDangSua?.latex ?? ''}
        dangSua={congThucDangSua?.viTri != null}
        onHuy={() => setCongThucDangSua(null)}
        onXong={(latex) => {
          if (!editor || !latex) {
            setCongThucDangSua(null);
            return;
          }
          if (congThucDangSua?.viTri != null) {
            editor.chain().focus().capNhatCongThuc(congThucDangSua.viTri, latex).run();
          } else {
            editor.chain().focus().chenCongThuc(latex).run();
          }
          setCongThucDangSua(null);
        }}
      />
      {mediaDangChen !== null && (
        <ModalChenMedia
          open
          loaiMedia={mediaDangChen}
          onHuy={() => setMediaDangChen(null)}
          onChen={chenMedia}
        />
      )}
      <Modal
        title="Chèn liên kết"
        open={linkDangSua !== null}
        onCancel={() => setLinkDangSua(null)}
        okText="Áp dụng"
        cancelText="Hủy"
        width={520}
        onOk={() => {
          const url = (linkDangSua ?? '').trim();
          if (!editor) return setLinkDangSua(null);
          if (!url) editor.chain().focus().extendMarkRange('link').unsetLink().run();
          else {
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: /^https?:\/\//i.test(url) ? url : `https://${url}` })
              .run();
          }
          setLinkDangSua(null);
        }}
      >
        <Input
          placeholder="https://… (để trống để gỡ liên kết)"
          value={linkDangSua ?? ''}
          onChange={(e) => setLinkDangSua(e.target.value)}
        />
      </Modal>
    </div>
  );
}
