/**
 * Nút xuất tệp chuẩn: một định dạng → nút thường; nhiều định dạng → nút có menu chọn (Excel / Word / PDF / In…).
 * Tự hiện trạng thái "Đang xuất…", báo thành công/lỗi (thông điệp lỗi của hàm xuất hiển thị nguyên văn).
 * PDF = hộp in của trình duyệt → chọn "Lưu dưới dạng PDF" (gợi ý hiện kèm).
 */
import { DownOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined, FileTextOutlined, FileWordOutlined, PrinterOutlined } from '@ant-design/icons';
import { App, Button, Dropdown, Space, Tooltip } from 'antd';
import type { ButtonProps } from 'antd';
import { useState, type ReactNode } from 'react';
import { nhanDinhDang, type DinhDangBang } from './xuatBang';

const ICON: Record<DinhDangBang, ReactNode> = {
  xlsx: <FileExcelOutlined />,
  csv: <FileTextOutlined />,
  docx: <FileWordOutlined />,
  pdf: <FilePdfOutlined />,
  in: <PrinterOutlined />,
};

export interface NutXuatTepProps {
  /** Nhãn nút (mặc định "Xuất") */
  nhan?: ReactNode;
  dinhDang: DinhDangBang[];
  /** Thực hiện xuất; ném Error để báo lỗi cho người dùng */
  onXuat: (dinhDang: DinhDangBang) => Promise<void> | void;
  /** Thông báo sau khi xuất (mặc định theo định dạng) */
  thongBaoXong?: (dinhDang: DinhDangBang) => string;
  disabled?: boolean;
  /** Lý do không xuất được (tooltip khi disabled) */
  lyDoKhoa?: string;
  type?: ButtonProps['type'];
  size?: ButtonProps['size'];
  icon?: ReactNode;
}

export default function NutXuatTep({ nhan = 'Xuất', dinhDang, onXuat, thongBaoXong, disabled, lyDoKhoa, type, size, icon }: NutXuatTepProps) {
  const { message } = App.useApp();
  const [dangXuat, setDangXuat] = useState(false);

  const chay = async (dd: DinhDangBang) => {
    setDangXuat(true);
    try {
      await onXuat(dd);
      message.success(
        thongBaoXong?.(dd) ??
          (dd === 'in' ? 'Đã mở hộp thoại in' : dd === 'pdf' ? 'Đã mở hộp thoại in — chọn máy in "Lưu dưới dạng PDF" để lưu tệp PDF' : `Đã tạo tệp ${nhanDinhDang[dd]} — kiểm tra thư mục Tải xuống`),
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Xuất tệp không thành công');
    } finally {
      setDangXuat(false);
    }
  };

  const nut =
    dinhDang.length === 1 ? (
      <Button type={type} size={size} icon={icon ?? ICON[dinhDang[0]] ?? <DownloadOutlined />} loading={dangXuat} disabled={disabled} onClick={() => chay(dinhDang[0])}>
        {nhan}
      </Button>
    ) : (
      <Dropdown
        disabled={disabled || dangXuat}
        trigger={['click']}
        menu={{ items: dinhDang.map((dd) => ({ key: dd, icon: ICON[dd], label: nhanDinhDang[dd] })), onClick: ({ key }) => chay(key as DinhDangBang) }}
      >
        <Button type={type} size={size} icon={icon ?? <DownloadOutlined />} loading={dangXuat} disabled={disabled}>
          <Space size={6}>
            {nhan}
            <DownOutlined />
          </Space>
        </Button>
      </Dropdown>
    );
  return disabled && lyDoKhoa ? <Tooltip title={lyDoKhoa}>{nut}</Tooltip> : nut;
}
