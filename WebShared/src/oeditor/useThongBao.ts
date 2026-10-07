/**
 * Thông báo (toast) cho plugin — package không dùng `@/utils/notification` của từng web.
 * Lấy `message` từ <App> của antd (web đã bọc sẵn) để nhận theme; nằm ngoài <App>
 * thì dùng `message` tĩnh của antd.
 */
import { App, message as messageTinh } from 'antd';

export function useThongBao() {
  const { message } = App.useApp();
  const api = typeof message?.success === 'function' ? message : messageTinh;
  return {
    thanhCong: (noiDung: string) => api.success(noiDung),
    canhBao: (noiDung: string) => api.warning(noiDung),
    loi: (noiDung: string) => api.error(noiDung),
  };
}
