import { FileProtectOutlined, InboxOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Descriptions, Modal, Space, Tag, Typography, Upload } from 'antd';
import { useState } from 'react';
import { thongBaoLoi } from '../api';
import {
  docTepBase64,
  nhanMucDichKy,
  nhanTrangThaiXacMinh,
  xacMinhChuKy,
  xacMinhChuKyTheoId,
  type KetQuaXacMinh,
  type TrangThaiXacMinh,
} from './api';

const dinhDang = (s?: string) => (s ? new Date(s).toLocaleString('vi-VN', { hour12: false }) : '—');

/** Nhãn trạng thái xác minh chữ ký (DS nhãn trạng thái). */
export function NhanChuKySo({ trangThai, tieuDe }: { trangThai: TrangThaiXacMinh; tieuDe?: string }) {
  const n = nhanTrangThaiXacMinh[trangThai] ?? { nhan: trangThai, mau: 'default' };
  return (
    <Tag color={n.mau} icon={<SafetyCertificateOutlined />} title={tieuDe}>
      {n.nhan}
    </Tag>
  );
}

/** Kết quả xác minh: thông báo + chi tiết người ký, thời điểm, chuỗi chứng thư. */
export function KetQuaXacMinhChuKy({ ketQua }: { ketQua: KetQuaXacMinh }) {
  const n = nhanTrangThaiXacMinh[ketQua.trangThai];
  return (
    <Space orientation="vertical" style={{ width: '100%' }}>
      <Alert
        type={ketQua.hopLe ? 'success' : ketQua.trangThai === 'chung-thu-het-han' ? 'warning' : 'error'}
        showIcon
        title={n?.nhan ?? ketQua.trangThai}
        description={ketQua.lyDo}
      />
      <Descriptions size="small" column={1} bordered>
        <Descriptions.Item label="Người / đơn vị ký">{ketQua.hoTenNguoiKy ?? '—'}</Descriptions.Item>
        <Descriptions.Item label="Mục đích">{ketQua.mucDich ? nhanMucDichKy[ketQua.mucDich] ?? ketQua.mucDich : '—'}</Descriptions.Item>
        <Descriptions.Item label="Thời điểm ký">
          {dinhDang(ketQua.thoiDiemKy)} {ketQua.coDauThoiGian && <Tag color="blue">Dấu thời gian TSA</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="Số serial chứng thư">
          <Typography.Text code copyable={!!ketQua.soSerial}>
            {ketQua.soSerial ?? '—'}
          </Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Chuỗi chứng thư">
          {ketQua.chuoiChungThu.length ? (
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {ketQua.chuoiChungThu.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          ) : (
            '—'
          )}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}

export interface ModalXacMinhTepProps {
  open: boolean;
  onDong: () => void;
  /** Có id chữ ký đã lưu → chỉ cần chọn tệp dữ liệu gốc; không có → chọn cả tệp .p7s. */
  chuKyId?: string;
  tieuDe?: string;
  /** Gợi ý tên tệp dữ liệu (VD `goi-diem-hoc-ba-DT-2025-001.json`). */
  goiYTepDuLieu?: string;
}

/**
 * Xác minh chữ ký số trên tệp: chọn tệp dữ liệu gốc (+ tệp chữ ký .p7s khi không có id) → `POST /nen-tang/ky-so/xac-minh`
 * (hoặc `…/chu-ky/{id}/xac-minh`). Tệp chỉ đọc ở trình duyệt rồi gửi Base64 — tối đa 20 MB.
 */
export function ModalXacMinhTep({ open, onDong, chuKyId, tieuDe, goiYTepDuLieu }: ModalXacMinhTepProps) {
  const [tepDuLieu, setTepDuLieu] = useState<File>();
  const [tepChuKy, setTepChuKy] = useState<File>();
  const [dangXacMinh, setDangXacMinh] = useState(false);
  const [ketQua, setKetQua] = useState<KetQuaXacMinh>();
  const [loi, setLoi] = useState<string>();

  const dong = () => {
    setTepDuLieu(undefined);
    setTepChuKy(undefined);
    setKetQua(undefined);
    setLoi(undefined);
    onDong();
  };

  const xacMinh = async () => {
    if (!tepDuLieu || (!chuKyId && !tepChuKy)) return;
    setDangXacMinh(true);
    setLoi(undefined);
    try {
      const duLieu = await docTepBase64(tepDuLieu);
      setKetQua(chuKyId ? await xacMinhChuKyTheoId(chuKyId, duLieu) : await xacMinhChuKy(duLieu, await docTepBase64(tepChuKy!)));
    } catch (e) {
      setLoi(thongBaoLoi(e, 'Không xác minh được chữ ký.'));
    } finally {
      setDangXacMinh(false);
    }
  };

  const chon = (dat: (f: File) => void) => (f: File) => {
    dat(f);
    setKetQua(undefined);
    return false;
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <FileProtectOutlined />
          {tieuDe ?? 'Xác minh chữ ký số'}
        </Space>
      }
      onCancel={dong}
      footer={[
        <Button key="dong" onClick={dong}>
          Đóng
        </Button>,
        <Button key="xm" type="primary" loading={dangXacMinh} disabled={!tepDuLieu || (!chuKyId && !tepChuKy)} onClick={xacMinh}>
          Xác minh
        </Button>,
      ]}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size={12}>
        <Upload.Dragger maxCount={1} beforeUpload={chon(setTepDuLieu)} showUploadList={tepDuLieu ? { showRemoveIcon: false } : false}
          fileList={tepDuLieu ? [{ uid: 'dl', name: tepDuLieu.name, status: 'done' }] : []}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p>Tệp dữ liệu gốc đã ký{goiYTepDuLieu ? ` (${goiYTepDuLieu})` : ''}</p>
        </Upload.Dragger>
        {!chuKyId && (
          <Upload.Dragger accept=".p7s,.p7m,.pem" maxCount={1} beforeUpload={chon(setTepChuKy)}
            fileList={tepChuKy ? [{ uid: 'ck', name: tepChuKy.name, status: 'done' }] : []} showUploadList={tepChuKy ? { showRemoveIcon: false } : false}>
            <p className="ant-upload-drag-icon">
              <SafetyCertificateOutlined />
            </p>
            <p>Tệp chữ ký CMS/PKCS#7 (.p7s)</p>
          </Upload.Dragger>
        )}
        {loi && <Alert type="error" showIcon title={loi} />}
        {ketQua && <KetQuaXacMinhChuKy ketQua={ketQua} />}
      </Space>
    </Modal>
  );
}
