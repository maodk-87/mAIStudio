/** Node view của tệp đính kèm trong editor — nhúng Trình xem tài liệu trực tuyến */
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { TrinhXemTaiLieu } from '../trinh-xem-tai-lieu';

export default function NodeViewTep({ node, selected }: ReactNodeViewProps) {
  const { maTep, src, ten, loai, rong, cao } = node.attrs as {
    maTep: string | null;
    src: string;
    ten: string;
    loai: string;
    rong: number;
    cao: number;
  };
  return (
    <NodeViewWrapper
      className={`tep-dinh-kem${selected ? ' ProseMirror-selectednode' : ''}`}
      style={{ width: rong, height: cao }}
      contentEditable={false}
    >
      <TrinhXemTaiLieu nguon={{ maTep: maTep ?? undefined, src, ten, mime: loai }} />
    </NodeViewWrapper>
  );
}
