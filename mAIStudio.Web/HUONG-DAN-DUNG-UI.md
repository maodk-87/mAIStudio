# Hướng dẫn dựng UI mAIStudio.Web (giai đoạn UI-first)

Dự án dựng giao diện React cho mAIStudio theo bộ tài liệu thiết kế ở `e:\mAIStudio\docs\thiet-ke\` (00-muc-luc → 05 quyết định, 03 UI Flow, 04 UI). Dữ liệu là **giả lập** (mock) lưu `localStorage`; khi cắm monorepo KTS chỉ thay thân hàm trong `src/services/` (giữ nguyên chữ ký).

## 1. Chạy và kiểm tra
```
cd e:\mAIStudio\mAIStudio.Web
npx tsc -p tsconfig.app.json --noEmit     # kiểm tra kiểu — BẮT BUỘC sạch lỗi
npx vite build                            # build — BẮT BUỘC thành công
npm run dev                               # http://localhost:2512/
```
Stack: React 19, TypeScript 6 (strict, `erasableSyntaxOnly`: **không** dùng `enum`, `namespace`, tham số-thuộc-tính trong constructor), antd 6, @ant-design/icons, react-router-dom 7, zustand, dayjs, katex, recharts. `@web-shared/*` → `../WebShared/src` (bản sao WebShared của monorepo KTS, **không sửa** — khi cắm monorepo thì xóa bản sao và trỏ lại bằng `WEB_SHARED_DIR`). Dùng: `giao-dien` (BoxNoiDung, BangChuan…), `oeditor` (**OEditor** soạn nội dung, **NoiDungOEditor** hiển thị câu hỏi + công thức), `xuat-tep` (**xuất Word .docx / PDF / Excel .xlsx**, công thức → phương trình Word), `dich-vu-tep` (`taiLenTep` → `maTep`), `trinh-xem-tai-lieu` (`TrinhXemTaiLieu`: .docx, .pptx, PDF, văn bản, ảnh, video; .doc/.ppt/.xls cũ hiện hướng dẫn + Tải về).

## 2. Quy tắc bắt buộc (design system KTS — `e:\mAIStudio\docs\0-design-system.md`)
- **Mọi nội dung nằm trong `BoxNoiDung`** (`@web-shared/giao-dien`): `tieuDe`, `nutTrai` (cụm nút phải header box), `huongDan`/`ghiChu` (icon ❓), `nutQuayLai`. Dòng đầu trang chỉ có `PageHeader` với `breadcrumb`. **Mỗi màn chỉ 1 nút primary.**
- Chỉ icon `@ant-design/icons` bộ `*Outlined` (cấm Filled/TwoTone/emoji/SVG tự vẽ). Chữ ≥ 14px. Nút/ô nhập cao 40px (mặc định theme).
- **Select luôn có tìm kiếm**: dùng `FormSelect` (`luaChon: {value,label,moTa}[]`, option 2 dòng). Tag trạng thái: `TagTrangThai` hoặc preset màu antd (không mã hex).
- Bảng chuẩn: dùng `BangChuan` (`@web-shared/giao-dien`) — dòng lọc trên header, ⚙ chọn cột, sticky, phân trang 10/20/50/100, `hanhDong` (≤2 hiện cả, >2 gom ⋮), `dongBoUrl` (giữ lọc trong URL, DS-H1). Nếu cần phân trang/lọc phía "máy chủ" giả lập dùng `phanTrangMayChu` + `onLocThayDoi`, hoặc tự lọc client-side từ dữ liệu đầy đủ.
- Modal xác nhận: `useXacNhan()` (`tieuDe`, `doiTuong`, `nhanDien`, `anhHuong`, `mucDo: 'do'|'cam'|'xanh'`, `lyDoBatBuoc`, `onXacNhan`). Modal thường: 3 phần, rộng 840 (CSS chung đã ép), nút ở footer, form ≤ 6 ô; nhiều trường → **trang riêng** hoặc `Drawer` rộng 676.
- Form nhiều trường: `useDirtyGuard` (cảnh báo rời trang khi chưa lưu); nút Lưu disable + spinner khi đang gửi.
- Quyền: **không có quyền → ẩn** nút/menu (`useQuyen()` trả hàm `(ma?) => boolean`); bị chặn theo trạng thái → **disable + tooltip nêu lý do**.
- Thuật ngữ cho giáo viên (không dùng Blueprint/Job/Slot/Token/Distractor/V1…V11 làm nhãn chính): "Lượt sinh", "Thông tin phân loại", "Hướng dẫn chấm (rubric)", "Tín dụng", "Phương án nhiễu", "Kiểm định". Văn bản giao diện bằng tiếng Việt có dấu theo đúng tài liệu 04 §7.
- Tên mã (biến, hàm, file, component) bằng tiếng Việt không dấu: PascalCase component/class, camelCase biến/hàm, `kebab-case` thư mục. Công thức: `<Latex>{'... $x$ ...'}</Latex>` (`@/components/latex/Latex`) — bên trong dùng `latexSangHtml` (`@/utils/congThuc`) → `<span data-cong-thuc>` + NoiDungOEditor; xuất Word/PDF dùng cùng HTML đó qua `@/components/nhap-chung/xuat-tep`.
- **Ô soạn nội dung câu hỏi / đáp án / lời giải / hướng dẫn chấm:** BẮT BUỘC dùng `<OSoanNoiDung>` (`@/components/o-soan-noi-dung/OSoanNoiDung`, bọc OEditor; không tự viết ô nhập công thức). `cheDo="soan-thao"` (toolbar đầy đủ): phần dẫn, giải thích/lời giải, ghi chú chấm, lỗi thường gặp, lời giải tham khảo; `cheDo="gon"` (một dòng, chỉ nút Σ nhập công thức MathLive): phương án, ý đúng/sai, giá trị đáp án, đơn vị, giải thích ý, tiêu chí & mô tả mức rubric, đáp án hiệu chỉnh; `disabled` → chỉ hiển thị. Giá trị vào–ra là **dạng lưu**: chỉ chữ + xuống dòng + công thức → chuỗi `$…$`/`$$…$$`; có định dạng giàu (đậm, bảng, ảnh…) → HTML OEditor. Đọc nội dung có thể là HTML: dùng `laHtml()`, `latexSangHtml()` (trả nguyên nếu đã là HTML), `latexSangChu()` (bóc thẻ) — `@/utils/congThuc`; mảng "mỗi dòng một ý" (ghi chú chấm, lỗi thường gặp): nội dung HTML giữ thành **một** ý. Ô ghi chú/lý do và trường bản thiết kế (`TruongXacNhan`) **không** dùng OSoanNoiDung.
- Trạng thái đồng bộ URL (`useQueryState`) cho bộ lọc/phân trang/tab/bước.
- Có trạng thái: đang tải (Skeleton/Spin), rỗng (`Empty` + câu hướng dẫn + nút hành động), lỗi (thông báo tiếng Việt theo `maLoi` ở UI Flow 17.1).

## 3. Phân chia sở hữu (mỗi agent CHỈ sửa file của mình; cần đổi file dùng chung → ghi vào báo cáo cuối, không tự sửa)
Dùng chung (đã có, **không sửa**): `src/types/index.ts`, `src/constants/**`, `src/configs/**`, `src/layouts/**`, `src/routes/router.tsx`, `src/App.tsx`, `src/global.scss`, `src/stores/**`, `src/hooks/**`, `src/utils/**`, `src/components/{latex,tag-trang-thai,do-tin-cay,khung-cau-hoi,ket-qua-kiem-dinh,han-muc,chon-kho,chon-chu-de,xac-nhan-sinh,o-soan-noi-dung,hoa-don}/**`, `src/services/{mocks,ngu-canh,danh-muc,kho,luot-sinh,cau-nhap,de-nhap,chuyen,thong-bao,so-tin-dung,kho-rieng,hoa-don}/**`.
Nếu **bắt buộc** cần thêm một hàm/kiểu vào file dùng chung, hãy **tạo module mới** thuộc phần của bạn (ví dụ `src/services/<tên-mới>/index.ts`, `src/pages/<nhóm>/types.ts`) thay vì sửa. Dữ liệu mẫu riêng của nhóm bạn: `layMoRong('<khoa>', () => seed)` từ `@/services/mocks/db` (khởi tạo lười, lưu localStorage, gọi `luuDb()` sau khi sửa).

## 4. Hợp đồng dịch vụ có sẵn (async trả Promise có độ trễ; hàm `...DongBo` đọc đồng bộ)
- Ngữ cảnh/vai trò: `useNguCanhStore((s) => s.nguCanh)` → `NguCanhMai` {nguoiDung, chuThe{loai:'tenant'|'dvcc'}, trangThaiTruyCap, vaiTro[], quyen[], goi{ma,ten,ngayHetHan,tinhNang}, hanMuc, coKhoRiengDonVi, coKhoRiengCaNhan}; `useQuyen()`.
- Danh mục theo đơn vị: `layDanhMucDongBo()` (`@/services/danh-muc`) → {mon, khoi, chuDe, tieuMuc (có `gocId`, `nutBaiId`; null = đơn vị tự thêm/chưa ánh xạ), nangLuc, capDo}.
- Kho hệ thống (chỉ đọc): `layDanhSachKho`, `layChiTietKho`, `layCayNoiDung`, `monKhoiCoDuLieu(monId,khoiId)` (`@/services/kho`).
- Kho riêng: `@/services/kho-rieng` (`layTaiLieuRieng`, `themTaiLieuRieng`, `botTaiLieuRieng`, `khoiPhucTaiLieuRieng`, `datChiaSeKhoDonVi`, `layKhoRiengTom`, `layTaiLieuDungDuocChoSinh`, `demTaiLieuTheoMonKhoi`, `coKhoRieng`…). Nhận Word, **PowerPoint** (`dinhDang: 'powerpoint'`), Text, PDF (`DINH_DANG_CHAP_NHAN`), 50 MB/tệp; `themTaiLieuRieng` tải tệp gốc lên Dịch vụ Tệp → `TaiLieuRieng.maTep` (lỗi tải không chặn việc thêm). Kho hệ thống (CoreAdmin): `ghiCayNhap` nhận `maTep` → `TaiLieuKho.maTep`; Nạp SGK chỉ Word/Text/PDF.
- **Xem tệp gốc:** `<TrinhXemTaiLieu nguon={{ maTep, ten }} />` (`@web-shared/trinh-xem-tai-lieu`) đặt trong khung có chiều cao cố định (Kho riêng: 70vh); `maTep` rỗng → `Alert` "Chưa có bản gốc để xem trực tuyến". **Giới hạn giai đoạn UI-first:** Dịch vụ Tệp là **giả lập lưu trong bộ nhớ** — tải lại trang là mất bản gốc (dữ liệu kho vẫn còn); giới hạn **25 MB/tệp** của Dịch vụ Tệp nhỏ hơn 50 MB/tệp của Kho riêng — tệp lớn hơn vẫn thêm được vào kho nhưng không xem trực tuyến được.
- Hóa đơn: `@/services/hoa-don` (`xacNhanThanhToanVaTaoHoaDon` — dùng thay `xacNhanThanhToan` ở MA-27 để mỗi giao dịch tạo đúng một hóa đơn `chua-xuat`; `layDanhSachHoaDon(chuThe?)`; `layHoaDonTheoThanhToan(dangKyId)`; `xuatHoaDon(id, thongTin, nguoiXuat)` — ném `LoiMock` `THIEU_MST`/`MST_KHONG_HOP_LE`/`HOA_DON_DA_XUAT`; không có hàm hủy). Trang dùng chung `@/components/hoa-don/TrangHoaDon` (props `chuThe?`, `coQuyenXuat`, `nguoiXuat`): CoreAdmin MA-39 (`/core-admin/hoa-don`, quyền xuất `core_admin.mai_dang_ky_goi.sua`) và "Hóa đơn của tôi" MA-40 (`/hoa-don`, quyền `mai_studio.hoa_don.xem`/`.xuat` — Admin đơn vị; DVCC `dvcc.mai_hoa_don.*`).
- Lượt sinh: `@/services/luot-sinh` — `duTinhTinDung`, `kiemTraTruocKhiSinh`, `taoLuotSinh(YeuCauSinh, khoaIdem?)` (ném `LoiMock` có `maLoi`), `layDanhSachLuotSinh`, `layChiTietLuotSinh`, `layLuotSinhDongBo`, `layCauCuaLuotDongBo`, `huyLuotSinh`, `chayLaiLuotSinh`, `sinhBuViTriThieu`. Tiến độ cập nhật tự động qua `useDuLieuMock` (bộ đếm giờ giả lập trong `mocks/engine.ts`).
- Câu/đề nháp: `@/services/cau-nhap` (`layDanhSachCauNhap`, `layChiTietCauNhap`, `demCauTheoTrangThai`, `capNhatCauNhap`, `kiemDinhLai`, `duyetCauNhap`, `huyDuyetCauNhap`, `loaiBoCauNhap`, `khoiPhucCauNhap`, `sinhLaiCauNhap`, `guiChuyenGia`…), `@/services/de-nhap` (`layDanhSachDeNhap`, `layChiTietDeNhap`, `duyetTatCaCauTrongDe`, `loaiBoDeNhap`, `khoiPhucDeNhap`…).
- Chuyển: `@/services/chuyen` (`layDichChuyenHopLe`, `kiemTraTruocChuyen`, `chuyenDuLieu`, `layNhatKyChuyen`, `chuyenLai`, `KHO_DICH_MAU`, `nguonGocCuaCau`).
- Hạn mức/thông báo: `laySoTinDung`, `layThongBao`.
- Nguồn ngoài (ma trận, câu gốc): dữ liệu tĩnh `MA_TRAN_NGUON`, `CAU_GOC_NGUON` ở `@/services/mocks/seedNguon`; **agent M2/M3 viết** `@/services/nguon-ngoai` (đọc/kiểm tra ma trận, đọc câu gốc, phân tích).
- Nhật ký quản trị dùng chung: `@/services/nhat-ky-quan-tri` (`ghiNhatKyQuanTri`, `layNhatKyQuanTri`, `danhSachHanhDongNhatKy`) — mọi thao tác quản trị (CoreAdmin/Admin đơn vị) PHẢI ghi vào đây.
- Passcode giả lập: `@/components/passcode-mock/ModalPasscodeMock` (mã mẫu 123456) cho thao tác tác động toàn hệ thống.
- Modal xác nhận sinh dùng chung: `@/components/xac-nhan-sinh/ModalXacNhanSinh` (MD-01).
- `@/components/drawer-chuyen/DrawerChuyen` (MD-05): hợp đồng props `{ open, onClose, loai: 'cau'|'de', cauIds?, deId?, onXong? }` — nhóm "nháp & chuyển" viết bản đầy đủ; các nhóm khác chỉ import.
- Hook: `useDuLieuMock(tai, phuThuoc, theoDoi=true)` (tự tải lại khi dữ liệu giả lập đổi), `useQueryState`.
- `LoiMock` (`maLoi`, message) + `thongDiepLoi(e)` (`@/utils/loi`): hiển thị lỗi theo UI Flow 17.1 (toast/Alert tại chỗ).
- Vai trò mẫu & kịch bản: nút tròn góc phải dưới ("Công cụ duyệt giao diện") đổi vai trò (GV Miễn phí/Nâng cao/Trường, Tổ trưởng, Chuyên gia, CV khảo thí, Admin Trường, Admin DVCC, CoreAdmin, chưa có quyền, chờ duyệt, tạm khóa), kịch bản lượt sinh/chuyển, đặt lại dữ liệu.

## 5. Định nghĩa hoàn thành cho mỗi nhóm màn
1. Mọi trang/route của nhóm hiển thị **bản đầy đủ** (không còn chữ "Đang xây dựng…").
2. Bám đúng đặc tả `04-ui-mAIStudio.md` (bố cục, ô, cột, nút, văn bản) và luồng `03-ui-flow-mAIStudio.md`; đủ trạng thái đặc biệt/lỗi/rỗng nêu ở đó.
3. `npx tsc -p tsconfig.app.json --noEmit` sạch lỗi toàn dự án (không để lỗi của agent khác làm hỏng — nếu lỗi ngoài phần mình, ghi vào báo cáo).
4. `npx vite build` thành công.
5. Không để lại `console.log`, không có `any` không cần thiết.
