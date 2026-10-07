import { ExclamationCircleOutlined } from '@ant-design/icons';
import { App } from 'antd';

export interface ThamSoXacNhan {
  /** Tiêu đề = hành động (VD: "Xóa câu hỏi?") */
  tieuDe: string;
  /** Tên đối tượng đang thao tác (in đậm) */
  doiTuong: string;
  /** Thông tin nhận diện thêm (mã, số lượng…) */
  nhanDien?: string;
  /** Mô tả rõ hệ quả/phạm vi ảnh hưởng */
  anhHuong: React.ReactNode;
  nhanNutXacNhan?: string;
  /** đỏ (không hoàn tác) | cam (khóa/bỏ áp dụng) | xanh (mở khóa/áp dụng lại) */
  mucDo?: 'do' | 'cam' | 'xanh';
  onXacNhan: () => void | Promise<void>;
}

/** Modal xác nhận chuẩn DS-G cho mọi thao tác thay đổi trạng thái/nguy hiểm */
export function useXacNhan() {
  const { modal } = App.useApp();

  return (thamSo: ThamSoXacNhan) => {
    const mau =
      thamSo.mucDo === 'do'
        ? 'var(--accent-red)'
        : thamSo.mucDo === 'cam'
          ? 'var(--warning)'
          : 'var(--success)';
    modal.confirm({
      title: thamSo.tieuDe,
      icon: <ExclamationCircleOutlined style={{ color: mau }} />,
      width: 560,
      content: (
        <div>
          <p style={{ marginTop: 0 }}>
            Đang thao tác với: <b>{thamSo.doiTuong}</b>
            {thamSo.nhanDien ? ` (${thamSo.nhanDien})` : ''}
          </p>
          <p style={{ marginBottom: 0 }}>Ảnh hưởng: {thamSo.anhHuong}</p>
        </div>
      ),
      okText: thamSo.nhanNutXacNhan ?? 'Xác nhận',
      cancelText: 'Hủy',
      okButtonProps: {
        danger: thamSo.mucDo === 'do',
        style:
          thamSo.mucDo === 'cam'
            ? { background: 'var(--warning)', borderColor: 'var(--warning)' }
            : thamSo.mucDo === 'xanh'
              ? { background: 'var(--success)', borderColor: 'var(--success)' }
              : undefined,
      },
      onOk: thamSo.onXacNhan,
    });
  };
}
