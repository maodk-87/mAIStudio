/**
 * Modal chèn Ảnh / Video / Tệp vào bài theo luồng chuẩn:
 * chọn tệp → XEM TRƯỚC ngay trong modal → chỉnh ĐỘ RỘNG / ĐỘ CAO khung hiển thị
 * → bấm Xác nhận mới đưa xuống bài.
 * Tệp (Word/PowerPoint/PDF/văn bản…) được tải lên Dịch vụ Tệp ngay khi chọn
 * (@web-shared/dich-vu-tep — API giả lập) và xem trước bằng Trình xem tài liệu trực tuyến.
 */
import { InboxOutlined } from '@ant-design/icons';
import { Checkbox, InputNumber, Modal, Spin, Upload } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { GIOI_HAN_TEP_MB, taiLenTep } from '../dich-vu-tep';
import { TrinhXemTaiLieu } from '../trinh-xem-tai-lieu';
import { useThongBao } from './useThongBao';

export type LoaiMedia = 'anh' | 'video' | 'tep';

export interface KetQuaChenMedia {
  loaiMedia: LoaiMedia;
  /** data URL — dự phòng khi Dịch vụ Tệp chưa có (mock) */
  src: string;
  /** Mã tệp trên Dịch vụ Tệp (chỉ loại 'tep') */
  maTep?: string;
  ten: string;
  mime: string;
  rong: number;
  cao: number;
}

interface ModalChenMediaProps {
  open: boolean;
  loaiMedia: LoaiMedia;
  onHuy: () => void;
  onChen: (kq: KetQuaChenMedia) => void;
}

const CAU_HINH: Record<LoaiMedia, { tieuDe: string; accept: string; goiY: string; rong: number; cao: number }> = {
  anh: {
    tieuDe: 'Chèn ảnh',
    accept: 'image/*',
    goiY: 'Kéo thả hoặc bấm để chọn ảnh (PNG, JPG, GIF…)',
    rong: 480, cao: 360,
  },
  video: {
    tieuDe: 'Chèn video',
    accept: 'video/mp4,video/webm,video/ogg',
    goiY: 'Kéo thả hoặc bấm để chọn video (MP4, WebM…)',
    rong: 640, cao: 360,
  },
  tep: {
    tieuDe: 'Chèn tài liệu (xem ngay trong bài)',
    accept: '.docx,.pptx,.pdf,.doc,.ppt,.xls,.xlsx,.txt,.json,.html,.css,.js,.ts,.py,.c,.cpp,.cs,.java,.sql,.md,.csv,.xml,.pas',
    goiY: 'Word (.docx), PowerPoint (.pptx), PDF, văn bản/mã nguồn — xem trực tiếp trong bài',
    rong: 720, cao: 520,
  },
};

const docDataUrl = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject());
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export default function ModalChenMedia({ open, loaiMedia, onHuy, onChen }: ModalChenMediaProps) {
  const ch = CAU_HINH[loaiMedia];
  const thongBao = useThongBao();
  const [tep, setTep] = useState<{ src: string; ten: string; mime: string; maTep?: string } | null>(null);
  const [dangTaiLen, setDangTaiLen] = useState(false);
  const [rong, setRong] = useState(ch.rong);
  const [cao, setCao] = useState(ch.cao);
  const [giuTiLe, setGiuTiLe] = useState(loaiMedia !== 'tep');
  const tiLeRef = useRef(ch.rong / ch.cao);

  useEffect(() => {
    if (open) {
      setTep(null);
      setRong(ch.rong);
      setCao(ch.cao);
      setGiuTiLe(loaiMedia !== 'tep');
      tiLeRef.current = ch.rong / ch.cao;
    }
  }, [open, ch.rong, ch.cao, loaiMedia]);

  const chonTep = (file: File): boolean => {
    if (file.size > GIOI_HAN_TEP_MB * 1024 * 1024) {
      thongBao.loi(`Tệp vượt quá ${GIOI_HAN_TEP_MB}MB — hãy nén/thu nhỏ trước khi chèn`);
      return false;
    }
    (async () => {
      setDangTaiLen(true);
      try {
        const src = await docDataUrl(file);
        let maTep: string | undefined;
        if (loaiMedia === 'tep') {
          maTep = (await taiLenTep(file, file.name)).maTep;
        }
        setTep({ src, ten: file.name, mime: file.type, maTep });
        if (loaiMedia === 'anh') {
          const anh = new Image();
          anh.onload = () => {
            const r = Math.min(anh.naturalWidth, 480);
            const c = Math.round((r * anh.naturalHeight) / anh.naturalWidth);
            tiLeRef.current = r / c;
            setRong(r);
            setCao(c);
          };
          anh.src = src;
        }
      } catch (e) {
        thongBao.loi(e instanceof Error ? e.message : 'Không tải được tệp');
      } finally {
        setDangTaiLen(false);
      }
    })();
    return false; // tự xử lý, không dùng cơ chế upload của antd
  };

  const doiRong = (v: number | null) => {
    const r = v ?? ch.rong;
    setRong(r);
    if (giuTiLe) setCao(Math.max(40, Math.round(r / tiLeRef.current)));
  };
  const doiCao = (v: number | null) => {
    const c = v ?? ch.cao;
    setCao(c);
    if (giuTiLe) setRong(Math.max(60, Math.round(c * tiLeRef.current)));
  };

  return (
    <Modal
      title={ch.tieuDe}
      open={open}
      onCancel={onHuy}
      onOk={() => {
        if (!tep) return;
        onChen({ loaiMedia, src: tep.src, maTep: tep.maTep, ten: tep.ten, mime: tep.mime, rong, cao });
      }}
      okText="Xác nhận chèn vào bài"
      cancelText="Hủy"
      okButtonProps={{ disabled: !tep }}
      width="min(1040px, 94vw)"
      destroyOnHidden
    >
      {!tep ? (
        <Spin spinning={dangTaiLen} description="Đang tải tệp lên…">
          <Upload.Dragger accept={ch.accept} showUploadList={false} beforeUpload={chonTep} multiple={false}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">{ch.goiY}</p>
            <p className="ant-upload-hint">Tối đa {GIOI_HAN_TEP_MB}MB</p>
          </Upload.Dragger>
        </Spin>
      ) : (
        <div className="chen-media">
          <div className="chen-media__thanh">
            <span className="chen-media__ten">{tep.ten}</span>
            <span className="chen-media__chinh">
              Rộng
              <InputNumber min={60} max={1600} value={rong} onChange={doiRong} style={{ width: 90 }} />
              Cao
              <InputNumber min={40} max={1600} value={cao} onChange={doiCao} style={{ width: 90 }} />
              <Checkbox
                checked={giuTiLe}
                onChange={(e) => {
                  setGiuTiLe(e.target.checked);
                  tiLeRef.current = rong / cao;
                }}
              >
                Giữ tỉ lệ
              </Checkbox>
            </span>
          </div>
          <div className="chen-media__xem-truoc">
            {loaiMedia === 'anh' && <img src={tep.src} alt={tep.ten} width={rong} height={cao} />}
            {loaiMedia === 'video' && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={tep.src} controls width={rong} height={cao} />
            )}
            {loaiMedia === 'tep' && (
              <div className="chen-media__khung-tep" style={{ width: rong, height: cao }}>
                <TrinhXemTaiLieu
                  nguon={{ maTep: tep.maTep, src: tep.src, ten: tep.ten, mime: tep.mime }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
