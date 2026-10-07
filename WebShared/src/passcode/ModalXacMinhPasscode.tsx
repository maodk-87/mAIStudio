import { SafetyOutlined } from '@ant-design/icons';
import { Alert, Form, Input, Modal } from 'antd';
import { useState, type ReactNode } from 'react';
import {
  LoiApi,
  MAU_PASSCODE,
  MA_LOI_CHUA_THIET_LAP_PASSCODE,
  thongBaoLoi,
  xacMinhPasscode,
  type CheDoPasscode,
} from '../api';

export interface ModalXacMinhPasscodeProps {
  open: boolean;
  /** Mục đích xác minh (VD `dat-lai-mat-khau`, `khoa-so`, `chot-diem`) */
  mucDich: string;
  /** Mô tả thao tác cần xác minh, hiển thị trong modal */
  moTa?: ReactNode;
  /** `phien` — "phiên xem nhạy cảm" (Z4): token dùng nhiều lần 15′, lưu bộ nhớ; mặc định một lần */
  cheDo?: CheDoPasscode;
  /** Chỉ chế độ `phien`: gắn token với đối tượng (bỏ trống = mọi đối tượng cùng mục đích) */
  doiTuong?: string;
  onXong: (token: string) => void;
  onHuy: () => void;
}

/**
 * Nhập Passcode 6 chữ số → `POST /nen-tang/passcode/xac-minh` → trả token một lần cho thao tác nhạy cảm
 * (gửi kèm header bằng `voiPasscode(token)`). Dùng chung KTDG.Web/ADMIN.Web/CSDL.Web; gọi API qua
 * client mặc định của web (`taoApiClient`).
 */
export default function ModalXacMinhPasscode({ open, mucDich, moTa, cheDo, doiTuong, onXong, onHuy }: ModalXacMinhPasscodeProps) {
  const [form] = Form.useForm<{ passcode: string }>();
  const [dangXacMinh, setDangXacMinh] = useState(false);
  const [loi, setLoi] = useState('');

  const xacMinh = async () => {
    let passcode: string;
    try {
      ({ passcode } = await form.validateFields());
    } catch {
      return;
    }
    setDangXacMinh(true);
    setLoi('');
    try {
      const token = await xacMinhPasscode(passcode, mucDich, { cheDo, doiTuong });
      form.resetFields();
      onXong(token);
    } catch (e) {
      const chuaThietLap = e instanceof LoiApi && e.maLoi === MA_LOI_CHUA_THIET_LAP_PASSCODE;
      setLoi(
        chuaThietLap
          ? 'Bạn chưa thiết lập Passcode — vào Hồ sơ cá nhân › Bảo mật để thiết lập trước.'
          : thongBaoLoi(e, 'Passcode không đúng'),
      );
    } finally {
      setDangXacMinh(false);
    }
  };

  return (
    <Modal
      title={
        <span>
          <SafetyOutlined /> Xác minh Passcode
        </span>
      }
      open={open}
      destroyOnHidden
      okText="Xác minh"
      cancelText="Hủy"
      confirmLoading={dangXacMinh}
      onOk={xacMinh}
      onCancel={() => {
        form.resetFields();
        setLoi('');
        onHuy();
      }}
    >
      {moTa && <p style={{ marginTop: 0 }}>{moTa}</p>}
      {cheDo === 'phien' && (
        <p style={{ marginTop: 0, color: 'var(--ant-color-text-secondary)' }}>
          Phiên xem nhạy cảm: nhập một lần, dùng tiếp trong 15 phút (đăng xuất hoặc đổi Passcode sẽ kết thúc phiên).
        </p>
      )}
      <Form form={form} layout="vertical" preserve={false} onFinish={xacMinh}>
        <Form.Item
          name="passcode"
          label="Passcode (6 chữ số)"
          rules={[
            { required: true, message: 'Vui lòng nhập Passcode' },
            { pattern: MAU_PASSCODE, message: 'Passcode gồm đúng 6 chữ số' },
          ]}
        >
          <Input.Password
            autoFocus
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            onPressEnter={xacMinh}
          />
        </Form.Item>
      </Form>
      {loi && <Alert type="error" showIcon title={loi} />}
    </Modal>
  );
}
