import { useEffect } from 'react';
import { App } from 'antd';
import { useBlocker } from 'react-router-dom';

const DU_LIEU_CHUA_LUU = 'Bạn có dữ liệu chưa lưu. Rời đi sẽ mất dữ liệu đã nhập.';

/**
 * Dirty-form guard (DS-F5): form đã nhập dữ liệu → chặn đóng/reload/back,
 * hiện xác nhận "Ở lại / Rời đi". Kết hợp beforeunload + router blocker.
 */
export function useDirtyGuard(dang_ban: boolean) {
  const { modal } = App.useApp();

  useEffect(() => {
    if (!dang_ban) return;
    const xuLy = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', xuLy);
    return () => window.removeEventListener('beforeunload', xuLy);
  }, [dang_ban]);

  const blocker = useBlocker(dang_ban);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      modal.confirm({
        title: 'Dữ liệu chưa lưu',
        content: DU_LIEU_CHUA_LUU,
        okText: 'Rời đi',
        okButtonProps: { danger: true },
        cancelText: 'Ở lại',
        onOk: () => blocker.proceed(),
        onCancel: () => blocker.reset(),
      });
    }
  }, [blocker, modal]);
}
