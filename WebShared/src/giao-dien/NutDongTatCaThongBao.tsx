import { CloseOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import { useEffect, useState } from 'react';
import './nut-dong-tat-ca-thong-bao.scss';

/** Thông báo đang hiện (bỏ qua cái đang chạy hiệu ứng đóng) */
const CHON_THONG_BAO = '.ant-notification-notice-wrapper:not([class*="-leave"])';
/** Class gắn lên body để đẩy chồng thông báo xuống, chừa chỗ cho nút */
const CLASS_BODY = 'co-nhieu-thong-bao';
/** Từ bao nhiêu thông báo thì hiện nút */
const NGUONG_HIEN = 2;

/**
 * Nút "Đóng tất cả" nổi phía trên chồng toast (notification) khi đang có từ 2 thông báo trở lên.
 * Đặt một lần trong `<AntApp>` ở App.tsx của từng web.
 */
export default function NutDongTatCaThongBao() {
  const { notification, message } = App.useApp();
  const [soThongBao, setSoThongBao] = useState(0);

  useEffect(() => {
    let khung = 0;
    const demLai = () => {
      cancelAnimationFrame(khung);
      khung = requestAnimationFrame(() => setSoThongBao(document.querySelectorAll(CHON_THONG_BAO).length));
    };
    const quanSat = new MutationObserver(demLai);
    quanSat.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    demLai();
    return () => {
      quanSat.disconnect();
      cancelAnimationFrame(khung);
    };
  }, []);

  const hien = soThongBao >= NGUONG_HIEN;

  useEffect(() => {
    document.body.classList.toggle(CLASS_BODY, hien);
    return () => document.body.classList.remove(CLASS_BODY);
  }, [hien]);

  if (!hien) return null;

  return (
    <Button
      className="nut-dong-tat-ca-thong-bao"
      size="small"
      shape="round"
      icon={<CloseOutlined />}
      onClick={() => {
        notification.destroy();
        message.destroy();
      }}
    >
      Đóng tất cả ({soThongBao})
    </Button>
  );
}
