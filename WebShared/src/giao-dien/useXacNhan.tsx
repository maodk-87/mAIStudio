import { ExclamationCircleOutlined } from '@ant-design/icons';
import { App, Input } from 'antd';

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
  /**
   * Bắt buộc nhập lý do (VD thu hồi): hiện ô nhập, nút xác nhận chỉ bật khi đã nhập;
   * lý do (đã trim) truyền vào `onXacNhan`.
   */
  lyDoBatBuoc?: { nhan: string; placeholder?: string };
  onXacNhan: (lyDo?: string) => void | Promise<void>;
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
    const kieuNut =
      thamSo.mucDo === 'cam'
        ? { background: 'var(--warning)', borderColor: 'var(--warning)' }
        : thamSo.mucDo === 'xanh'
          ? { background: 'var(--success)', borderColor: 'var(--success)' }
          : undefined;
    const nutXacNhan = (disabled: boolean) => ({
      danger: thamSo.mucDo === 'do',
      disabled,
      style: disabled ? undefined : kieuNut,
    });
    let lyDo = '';

    const hopThoai = modal.confirm({
      title: thamSo.tieuDe,
      icon: <ExclamationCircleOutlined style={{ color: mau }} />,
      width: 560,
      content: (
        <div>
          <p style={{ marginTop: 0 }}>
            Đang thao tác với: <b>{thamSo.doiTuong}</b>
            {thamSo.nhanDien ? ` (${thamSo.nhanDien})` : ''}
          </p>
          <p style={{ marginBottom: thamSo.lyDoBatBuoc ? 12 : 0 }}>Ảnh hưởng: {thamSo.anhHuong}</p>
          {thamSo.lyDoBatBuoc && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                {thamSo.lyDoBatBuoc.nhan}
                <span style={{ color: 'var(--accent-red)' }}> *</span>
              </div>
              <Input.TextArea
                rows={3}
                maxLength={500}
                showCount
                placeholder={thamSo.lyDoBatBuoc.placeholder}
                onChange={(e) => {
                  lyDo = e.target.value;
                  hopThoai.update({ okButtonProps: nutXacNhan(!lyDo.trim()) });
                }}
              />
            </div>
          )}
        </div>
      ),
      okText: thamSo.nhanNutXacNhan ?? 'Xác nhận',
      cancelText: 'Hủy',
      okButtonProps: nutXacNhan(!!thamSo.lyDoBatBuoc),
      onOk: () => thamSo.onXacNhan(thamSo.lyDoBatBuoc ? lyDo.trim() : undefined),
    });
  };
}
