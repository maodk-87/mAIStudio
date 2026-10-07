import { useCallback, useRef, useState, type ReactNode } from 'react';
import {
  laLoiCanPasscode,
  layTokenPhienPasscode,
  xoaTokenPhienPasscode,
  type TuyChonPasscode,
} from '../api';
import ModalXacMinhPasscode from './ModalXacMinhPasscode';

/**
 * Hook tiện dụng: `const { yeuCauPasscode, modalPasscode } = useXacMinhPasscode('dat-lai-mat-khau')`
 * → `const token = await yeuCauPasscode(moTa)` (null khi người dùng hủy); render `{modalPasscode}`.
 *
 * Chế độ "phiên xem nhạy cảm" (Z4, apis/20 §7.3): `useXacMinhPasscode('xem-rubric-khoa', { cheDo: 'phien' })` —
 * token dùng nhiều lần tới hết hạn (15′), giữ trong bộ nhớ; `yeuCauPasscode` trả ngay token còn hạn (không mở modal);
 * `chayVoiPasscode(goi)` gọi API với token sẵn có (hoặc không token), gặp 401 `CAN_PASSCODE` mới mở modal rồi gọi lại một lần.
 */
export function useXacMinhPasscode(mucDich: string, tuyChon?: TuyChonPasscode) {
  const [trangThai, setTrangThai] = useState<{ open: boolean; moTa?: ReactNode }>({ open: false });
  const giaiQuyet = useRef<((token: string | null) => void) | null>(null);
  /** Nhiều lời gọi song song (VD tải nhiều môn cùng lúc) dùng chung MỘT lần hỏi Passcode */
  const dangCho = useRef<Promise<string | null> | null>(null);
  const phien = tuyChon?.cheDo === 'phien';
  const doiTuong = tuyChon?.doiTuong;

  const moModal = useCallback((moTa?: ReactNode) => {
    if (dangCho.current) return dangCho.current;
    const hua = new Promise<string | null>((resolve) => {
      giaiQuyet.current = resolve;
      setTrangThai({ open: true, moTa });
    }).finally(() => {
      dangCho.current = null;
    });
    dangCho.current = hua;
    return hua;
  }, []);

  const yeuCauPasscode = useCallback(
    (moTa?: ReactNode) => {
      if (phien) {
        const coSan = layTokenPhienPasscode(mucDich, doiTuong);
        if (coSan) return Promise.resolve<string | null>(coSan);
      }
      return moModal(moTa);
    },
    [phien, mucDich, doiTuong, moModal],
  );

  /** Bỏ token phiên của mục đích (máy chủ báo hết hạn/thu hồi) — lần sau hỏi lại Passcode */
  const boTokenPhien = useCallback(() => xoaTokenPhienPasscode(mucDich), [mucDich]);

  /**
   * Gọi API cần Passcode: chế độ phiên thử trước với token còn hạn (hoặc không token — tài nguyên không nhạy cảm máy chủ trả luôn);
   * 401 `CAN_PASSCODE` → bỏ token cũ, mở modal, gọi lại với token mới. Trả `null` khi người dùng hủy.
   */
  const chayVoiPasscode = useCallback(
    async <T,>(goi: (token?: string) => Promise<T>, moTa?: ReactNode): Promise<T | null> => {
      if (phien) {
        try {
          return await goi(layTokenPhienPasscode(mucDich, doiTuong) ?? undefined);
        } catch (e) {
          if (!laLoiCanPasscode(e)) throw e;
          xoaTokenPhienPasscode(mucDich);
        }
      }
      const token = await moModal(moTa);
      if (!token) return null;
      return goi(token);
    },
    [phien, mucDich, doiTuong, moModal],
  );

  const ketThuc = (token: string | null) => {
    setTrangThai({ open: false });
    giaiQuyet.current?.(token);
    giaiQuyet.current = null;
  };

  const modalPasscode = (
    <ModalXacMinhPasscode
      open={trangThai.open}
      mucDich={mucDich}
      cheDo={tuyChon?.cheDo}
      doiTuong={doiTuong}
      moTa={trangThai.moTa}
      onXong={(token) => ketThuc(token)}
      onHuy={() => ketThuc(null)}
    />
  );

  return { yeuCauPasscode, chayVoiPasscode, boTokenPhien, modalPasscode };
}
