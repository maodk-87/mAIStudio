/** Khu tải lên bản đọc đề bài (.mp3) trong màn thêm/sửa câu hỏi Khối 1–3 */
import { DeleteOutlined, SoundOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Upload } from 'antd';
import { useState } from 'react';
import { taiLenTep } from '../dich-vu-tep';
import { useThongBao } from '../oeditor/useThongBao';
import { GIOI_HAN_BAN_DOC_MB, type BanDocDeBai } from './banDoc';
import './ban-doc-de-bai.scss';

export interface KhuBanDocDeBaiProps {
  value?: BanDocDeBai;
  onChange: (banDoc?: BanDocDeBai) => void;
}

const docDataUrl = (tep: Blob) =>
  new Promise<string>((resolve, reject) => {
    const doc = new FileReader();
    doc.onload = () => resolve(String(doc.result));
    doc.onerror = () => reject(doc.error);
    doc.readAsDataURL(tep);
  });

const laMp3 = (tep: File) =>
  tep.name.toLowerCase().endsWith('.mp3') && (!tep.type || tep.type === 'audio/mpeg' || tep.type === 'audio/mp3');

export default function KhuBanDocDeBai({ value, onChange }: KhuBanDocDeBaiProps) {
  const thongBao = useThongBao();
  const [dangTai, setDangTai] = useState(false);

  const taiLen = async (tep: File) => {
    if (!laMp3(tep)) {
      thongBao.loi('Chỉ cho phép tệp âm thanh định dạng .mp3');
      return;
    }
    if (tep.size > GIOI_HAN_BAN_DOC_MB * 1024 * 1024) {
      thongBao.loi(`Tệp bản đọc vượt quá ${GIOI_HAN_BAN_DOC_MB}MB`);
      return;
    }
    setDangTai(true);
    try {
      const [thongTin, duongDan] = await Promise.all([taiLenTep(tep, tep.name), docDataUrl(tep)]);
      onChange({ maTep: thongTin.maTep, ten: tep.name, kichThuoc: tep.size, duongDan });
      thongBao.thanhCong('Đã tải lên bản đọc đề bài — câu hỏi sẽ không đảo đáp án');
    } catch (e) {
      thongBao.loi((e as Error).message || 'Tải lên bản đọc thất bại');
    } finally {
      setDangTai(false);
    }
  };

  const nutChon = (nhan: string) => (
    <Upload
      accept=".mp3,audio/mpeg"
      showUploadList={false}
      beforeUpload={(tep) => {
        taiLen(tep);
        return false;
      }}
    >
      <Button icon={<UploadOutlined />} loading={dangTai}>
        {nhan}
      </Button>
    </Upload>
  );

  return (
    <div className="ban-doc-de-bai">
      <Alert
        type="info"
        showIcon
        icon={<SoundOutlined />}
        title={`Câu hỏi Khối 1–3: có thể đính kèm bản đọc đề bài (tệp .mp3, tối đa ${GIOI_HAN_BAN_DOC_MB}MB). Trên đề thi, học sinh bấm biểu tượng loa để nghe. Khi đã có bản đọc, câu hỏi không được đảo đáp án.`}
      />
      {value ? (
        <div className="ban-doc-de-bai__tep">
          <audio controls preload="none" src={value.duongDan} className="ban-doc-de-bai__audio" />
          <span className="ban-doc-de-bai__ten" title={value.ten}>
            {value.ten}
          </span>
          {nutChon('Thay tệp')}
          <Button danger icon={<DeleteOutlined />} onClick={() => onChange(undefined)}>
            Xóa
          </Button>
        </div>
      ) : (
        <div className="ban-doc-de-bai__tep">{nutChon('Tải lên bản đọc (.mp3)')}</div>
      )}
    </div>
  );
}
