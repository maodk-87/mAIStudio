/**
 * Định dạng tệp import Word đang chọn (3 mẫu cố định — @web-shared/oimportword `MAU_IMPORT`), nhớ lựa chọn lần trước
 * theo trình duyệt — dùng chung màn nhập câu hỏi và các màn nhập đề. Chỉ là tiện ích theo người xem: bộ nhớ trình duyệt
 * bị chặn thì quay về mẫu mặc định.
 */
import { useState } from 'react';
import { MAU_IMPORT, MAU_IMPORT_MAC_DINH, type MaMauImport } from '../oimportword';

const KHOA_MAU_IMPORT = 'import-word:mau';

export function useMauImport(): [MaMauImport, (ma: MaMauImport) => void] {
  const [mau, setMau] = useState<MaMauImport>(() => {
    try {
      const daLuu = localStorage.getItem(KHOA_MAU_IMPORT);
      return MAU_IMPORT.some((m) => m.ma === daLuu) ? (daLuu as MaMauImport) : MAU_IMPORT_MAC_DINH;
    } catch {
      return MAU_IMPORT_MAC_DINH;
    }
  });
  const chonMau = (ma: MaMauImport) => {
    setMau(ma);
    try {
      localStorage.setItem(KHOA_MAU_IMPORT, ma);
    } catch {
      // trình duyệt chặn lưu trữ — chỉ mất ghi nhớ lựa chọn
    }
  };
  return [mau, chonMau];
}

/** Lựa chọn cho ô "Định dạng" (FormSelect: tên + mô tả 2 dòng) */
export const luaChonMauImport = MAU_IMPORT.map((m) => ({ value: m.ma, label: m.ten, moTa: m.tomTat }));
