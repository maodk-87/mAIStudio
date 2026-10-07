/**
 * Các định dạng câu hỏi MẶC ĐỊNH — mỗi loại một hàm bóc tách riêng, đăng ký tự động khi nạp
 * plugin oImportWord. Thêm định dạng mặc định mới: tạo tệp trong thư mục này + thêm vào danh
 * sách dưới. Định dạng riêng của một web: gọi `dangKyDinhDang()` ở web đó.
 */
import type { DinhDangCauHoi } from '../kieu';
import { dinhDangCauChum } from './cauChum';
import { dinhDangDienKhuyet } from './dienKhuyet';
import { dinhDangDungSai4Y } from './dungSai4Y';
import { dinhDangDungSaiDon } from './dungSaiDon';
import { dinhDangTraLoiNgan } from './traLoiNgan';
import { dinhDangTracNghiemAbcd } from './tracNghiemAbcd';
import { dinhDangTuLuan } from './tuLuan';

export const DINH_DANG_MAC_DINH: DinhDangCauHoi[] = [
  dinhDangTracNghiemAbcd,
  dinhDangDungSai4Y,
  dinhDangDungSaiDon,
  dinhDangTraLoiNgan,
  dinhDangDienKhuyet,
  dinhDangTuLuan,
  dinhDangCauChum,
];

export {
  dinhDangCauChum,
  dinhDangDienKhuyet,
  dinhDangDungSai4Y,
  dinhDangDungSaiDon,
  dinhDangTraLoiNgan,
  dinhDangTracNghiemAbcd,
  dinhDangTuLuan,
};
