/**
 * @web-shared/passcode — xác minh Passcode cho thao tác nhạy cảm (YC-HT-03a, apis/20 §7).
 * Rule khớp backend `ChinhSachPasscode` (đúng 6 chữ số). Token dùng một lần: `voiPasscode(token)`;
 * chế độ `phien` (Z4 — phiên xem nhạy cảm 15′, lưu bộ nhớ): `useXacMinhPasscode(mucDich, { cheDo: 'phien' }).chayVoiPasscode(goi)`.
 */
export { default as ModalXacMinhPasscode, type ModalXacMinhPasscodeProps } from './ModalXacMinhPasscode';
export { useXacMinhPasscode } from './useXacMinhPasscode';
export {
  MAU_PASSCODE,
  MA_LOI_CHUA_THIET_LAP_PASSCODE,
  xacMinhPasscode,
  xacMinhPasscodeDayDu,
  layTokenPhienPasscode,
  luuTokenPhienPasscode,
  xoaTokenPhienPasscode,
  laLoiCanPasscode,
  type CheDoPasscode,
  type TuyChonPasscode,
  type KetQuaXacMinhPasscode,
} from '../api';
