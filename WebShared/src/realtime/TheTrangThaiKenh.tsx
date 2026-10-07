import { Tag, Tooltip } from 'antd';
import { SyncOutlined, ThunderboltOutlined } from '@ant-design/icons';
import type { KenhCapNhat } from './types';

export interface TheTrangThaiKenhProps {
  kenh: KenhCapNhat;
  /** Chu kỳ tự làm mới khi polling (ms) — hiển thị trên nhãn */
  chuKyPollingMs?: number;
}

/** Nhãn nhỏ cho biết màn đang nhận cập nhật trực tiếp (hub) hay tự làm mới định kỳ */
export default function TheTrangThaiKenh({ kenh, chuKyPollingMs = 5000 }: TheTrangThaiKenhProps) {
  if (kenh === 'realtime') {
    return (
      <Tooltip title="Dữ liệu cập nhật ngay khi có thay đổi">
        <Tag color="success" icon={<ThunderboltOutlined />}>
          Trực tiếp
        </Tag>
      </Tooltip>
    );
  }
  const giay = Math.max(1, Math.round(chuKyPollingMs / 1000));
  return (
    <Tooltip title="Chưa kết nối được kênh trực tiếp — tự làm mới định kỳ, hệ thống sẽ thử kết nối lại">
      <Tag icon={<SyncOutlined />}>Tự làm mới {giay} s</Tag>
    </Tooltip>
  );
}
