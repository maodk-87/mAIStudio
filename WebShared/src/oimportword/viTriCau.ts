/**
 * Đánh số VỊ TRÍ khi SINH ĐỀ cho các ký hiệu N** trong câu hỏi nhóm — lúc import chưa biết câu con sẽ nằm ở vị trí nào
 * (phụ thuộc hoán vị), nên nội dung lưu dạng ký hiệu. Hiện thực GỐC nằm ở `@web-shared/hoan-vi` (cùng đặc tả với
 * `KTDG.CauHoi.DanhSoViTri` của BE); tệp này giữ lại để các nơi đang import từ oimportword không phải đổi.
 */
export { coKyHieuViTri, danhSoViTri, type ViTriNhom } from '../hoan-vi/danhSoViTri';
