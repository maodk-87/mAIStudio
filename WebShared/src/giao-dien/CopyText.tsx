import { CopyOutlined } from '@ant-design/icons';
import { App, Tooltip } from 'antd';

export interface CopyTextProps {
  /** Giá trị copy vào clipboard */
  giaTri: string;
  /** Nội dung hiển thị (mặc định = giaTri) */
  hienThi?: React.ReactNode;
  /** Chỉ hiện icon, không hiện giá trị */
  chiIcon?: boolean;
}

/** Giá trị kèm icon copy (DS-C8) — click copy ngay, không cần bôi đen */
export default function CopyText({ giaTri, hienThi, chiIcon }: CopyTextProps) {
  const { message } = App.useApp();
  const saoChep = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(giaTri);
    } catch {
      // fallback môi trường không có clipboard API
      const ta = document.createElement('textarea');
      ta.value = giaTri;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    message.success('Đã sao chép');
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {!chiIcon && (hienThi ?? giaTri)}
      <Tooltip title="Sao chép">
        <CopyOutlined
          onClick={saoChep}
          aria-label="Sao chép"
          style={{ color: 'var(--text-sub)', cursor: 'pointer', fontSize: 14 }}
        />
      </Tooltip>
    </span>
  );
}
