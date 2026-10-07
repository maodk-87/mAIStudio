# WebShared (`@web-shared`) — package FE dùng chung

Mã frontend dùng ở **từ 2 web trở lên** (docs/10-quy-tac-lap-trinh.md mục 6.1). Không build riêng:
mỗi web import thẳng mã nguồn qua alias `@web-shared/...`, Vite của web biên dịch cùng app.

Đang dùng: `KTDG.Web`, `NHCH.Web`, `QLTHI.Web`, `CSDL.Web`, `ADMIN.Web`, `CoreAdmin.Web`, `DVCC.Web`, `LMS.Web`.

## Mô-đun

| Import | Nội dung |
|---|---|
| `@web-shared/oeditor` | **Plugin OEditor** — `OEditor` (soạn thảo kiểu Word, dán Word giữ công thức MathType/OMML + ảnh, chèn ảnh/video/tệp xem ngay, công thức MathLive), `NoiDungOEditor` (hiển thị nội dung đã soạn: KaTeX + trình xem tệp) |
| `@web-shared/oimportword` | **Plugin oImportWord** — bóc tách câu hỏi từ Word, **dùng chung cho DÁN (OEditor) và IMPORT tệp .docx**, sổ định dạng mở rộng được |
| `@web-shared/hoan-vi` | **Engine hoán vị đề** (docs/nghiep-vu-hoan-vi-de.md) — soi gương `KTDG.CauHoi.HoanVi`/`DanhSoViTri` của BE, cùng hạt giống cho cùng mã đề: `sinhBoMaDe` (kiểm tra đáp án liên tiếp, không trùng, số hoán vị khả dĩ), `sinhMaDe`, `bangDapAn`, `doiChieu`, `phanBo`/`xepXenKe` (nhóm đề), `nguyenTacHoanVi`; `danhSoDe`/`danhSoCau`/`danhSoViTri` thay ký hiệu `N**`, `N***`, `N**+k`, `(N**)` bằng số câu thật khi hiển thị/xuất. Thuần TypeScript, không phụ thuộc React/DOM |
| `@web-shared/trinh-xem-tai-lieu` | `TrinhXemTaiLieu` — xem trực tuyến Word/PowerPoint/PDF/văn bản/ảnh/video (docs/11) |
| `@web-shared/dich-vu-tep` | Client Dịch vụ Tệp (`taiLenTep`, `layThongTinTep`, `layBanXemTep`, `layTepGoc`) — hiện là **API giả lập** |
| `@web-shared/word-html` | Chuẩn hóa HTML nguồn Word (clipboard + .docx) — cùng một bộ lọc cho dán và import |
| `@web-shared/mathtype` | Giải mã công thức MathType: WMF → MTEF → LaTeX |
| `@web-shared/giao-dien` | **Giao diện KHẢO THÍ SỐ** (docs/ui/0-design-system.md): `themeKhaoThiSo`/`moRongTheme` (theme antd), `thuongHieu` (tên, tên miền, logo), `bangMau`, `BoxNoiDung`, `PageHeader`, `LogoThuongHieu`, `FormSelect` (Select chuẩn DS-C6), `BangChuan` (bảng chuẩn DS-D — KTDG/NHCH/DVCC; QLTHI/CSDL/ADMIN/CoreAdmin còn bản riêng), `useXacNhan` (modal xác nhận DS-G), `CopyText` (DS-C8), `useDirtyGuard` (DS-F5), `khopTimKiem`/`chuanHoaKhongDau`. CSS nền `@web-shared/giao-dien/giao-dien.scss` (token `:root`, modal 3 phần + rộng tối thiểu 840px, nhãn trạng thái, sàn chữ 14px) nạp ở `index.tsx` của mọi web **trước** `global.scss`. `@/components/layout-parts/{box-noi-dung,page-header}`, `@/components/form/form-select`, `@/components/base/copy-text`, `@/hooks/useDirtyGuard`, `@/hooks/useXacNhan` (và `@/components/data-display/bang-chuan` ở KTDG/NHCH/DVCC) của từng web chỉ re-export từ đây |
| `@web-shared/rubric` | **Rubric chấm tự luận** (SRS rubric, API docs/apis/19): kiểu `CayRubric`/`NutRubric`…, bộ máy thuần `tinhToan` (tính điểm số nguyên 0,01, VR-01…13, so khác biệt phiên bản, xuất hướng dẫn chấm) + `thaoTac` (thao tác cây); component `TrinhSoanRubric`, `XemRubric`, `NoiDungRubric`, `BangChamRubric`, `ManChamRubric`. Không gọi API: web truyền `nguon` (`NguonSoanRubric` — nhãn, mẫu; `NguonChamRubric` — phiếu chấm, bài làm) cài trong `services/rubric` của web |
| `@web-shared/lms` | **Lõi hệ LMS** (docs/lms) dùng chung `LMS.Web` và phân hệ Học sinh/không gian Phụ huynh của `KTDG.Web` — **chỉ gọi API thật**, không có chế độ giả lập: `types` (DTO), `hang` (permission `lms.*`, nhãn, `MaLoiLms`), `api` (`goiApi` → axios client mặc định của web: chung token/làm mới/hết phiên của cổng đăng nhập chung, header `X-Vai-Tro-Lms`, `X-Idempotency-Key`; `datApiClientLms`, `layApiLms`), `phien` (`datNguonPhienLms` — web đăng ký người dùng/vai trò), `dich-vu/<mien>` (service = hợp đồng API docs/lms/05, gồm `thuHoiCongBo`, `xuatSoDiem` tải blob), `noiDungTep` (tải nội dung qua endpoint có kiểm quyền `/api/v1/lms/tep/{id}/noi-dung`, `/api/v1/lms/bai-nop/{id}/tep/{i}` bằng fetch blob kèm token → object URL tự giải phóng — `moUrlTep`), `giao-dien` (`XemTepLms`, `ModalXemTep`, `DanhSachTepXem` — bấm là xem ngay ảnh/video/âm thanh/PDF/docx/pptx) |
| `@web-shared/soan-cau-hoi` | **Màn soạn câu hỏi dùng chung KTĐG/NHCH/DVCC** (docs/task/phuong-an-soan-cau-hoi-web-shared.md): `SoanCauHoi` (lưới phân loại, khu đáp án theo loại câu, câu con có phân loại riêng, thiết lập, xem trước, nhập nhanh, bóc tách khi dán Word), `ImportWordCauHoi` (import Word — lưu từng câu qua `nguon.tao` hoặc `onLuu` tùy biến), `ChiTietCauHoi` + `ModalChiTietCauHoi` (trang / modal XXL), `DuyetNoiDung` (hàng chờ + duyệt nhanh; `anNoiDungCauThi` cho NHCH/DVCC), `SoSanhPhienBan`, `XemTruocCauHoi`, `TomTatCauHoi`, nhãn `nhan`; hằng gốc `hang` (`LoaiCauHoi`, `CapDoTuDuy`, `CheDoDaoCauHoi`, `TrangThaiNoiDung` — `constants/enum.ts` của web re-export). Không gọi API: web truyền `nguon` (`NguonSoanCauHoi` — danh mục, nạp/tạo/cập nhật câu) (+ `NguonQuanLyCauHoi` cho chi tiết/duyệt, `thanhPhan` — nhãn trạng thái/nguồn của web) + `cauHinh` (`khoaNguCanh`, `phamVi`, `coPheDuyet`, `coRubric`, `khoMacDinh`, `truongMoRong` — trường riêng của hệ: Mục đích sử dụng, Loại hình thi, Nhóm câu neo…) qua wrapper `components/nghiep-vu/nhch/SoanCauHoiChuan` + `services/soan-cau-hoi` của web. **Cấm** chép màn soạn vào web — khác biệt theo hệ đưa vào `cauHinh`/`truongMoRong` |
| `@web-shared/api` | Tầng gọi API chung (docs/15 mục 7): `taoApiClient` (token + tự làm mới, header không gian/năm học; instance đầu tiên thành **client mặc định** — `layApiMacDinh`, `layAccessTokenMacDinh`), `LoiApi`, `datBoHienThiLoi`, `ganLoiVaoForm(form, loi)` (nhận `FormInstance<T>` có kiểu), `voiPasscode`, `voiIdempotency`, `xacMinhPasscode`, `MAU_PASSCODE` (đúng 6 chữ số — khớp `ChinhSachPasscode`), `taoQuery`, `PhanTrang` |
| `@web-shared/passcode` | `ModalXacMinhPasscode` + hook `useXacMinhPasscode(mucDich)` → `const token = await yeuCauPasscode(moTa)` (null khi hủy) cho mọi thao tác cần `X-Passcode-Token` (đặt lại mật khẩu, đổi lùi năm học, khóa sổ, chốt điểm…). Gọi `POST /nen-tang/passcode/xac-minh` qua client mặc định |
| `@web-shared/thong-bao` | Thông báo cá nhân: API `/nen-tang/thong-bao` (`layTrangThongBao`, `laySoThongBaoChuaDoc`, `danhDauDaDoc`…, sự kiện `baoThongBaoThayDoi`/`ngheThongBaoThayDoi`), kết nối realtime SignalR hub `/hubs/thong-bao` (`dangKyThongBaoRealtime` — một kết nối/trang, tự nối lại, rơi về polling 60 s khi hub lỗi) và `ChuongThongBao` (chuông header). Web dùng module phải cài `@microsoft/signalr`; `layouts/header/ChuongThongBao.tsx` của KTDG/ADMIN/CSDL chỉ gắn phiên đăng nhập |
| `@web-shared/ky-so` | **Chữ ký số** (X5, apis/02 §11): API chứng thư (`layDanhSachChungThu`, `capChungThu`, `thuHoiChungThu`, `dangKyChungThuTuXa`), xác minh (`xacMinhChuKy`, `xacMinhChuKyTheoId`), nhật ký (`layNhatKyChuKy`), CA/CRL (`layDanhSachCa`, `taiCa`, `taiCrl`), tải `.cer`/`.p7s`; `docTepBase64`; nhãn trạng thái/lý do/mục đích; component `NhanChuKySo`, `KetQuaXacMinhChuKy`, `ModalXacMinhTep` (chọn tệp dữ liệu gốc + `.p7s` → xác minh). Dùng: ADMIN.Web (Chữ ký số), KTDG.Web (kỳ ĐGĐK), QLTHI.Web (gói học bạ) |

Phụ thuộc giữa các mô-đun: `oeditor → oimportword → word-html → trinh-xem-tai-lieu/mathtype`; `oimportword → hoan-vi` (re-export `danhSoViTri`); `rubric → oeditor`; `soan-cau-hoi → giao-dien, oeditor, oimportword, ban-doc-de-bai, rubric`; `passcode, thong-bao → api`
(không vòng). Trong package chỉ import tương đối — cấm `@/...` (alias riêng của từng web).

## Plugin OEditor

```tsx
import { OEditor, NoiDungOEditor } from '@web-shared/oeditor';

// 1) CÂU HỎI — dán NGUYÊN câu từ Word → oImportWord bóc tách đề / phương án / đáp án / câu con
<OEditor
  cheDo="cau-hoi"
  value={noiDung}
  onChange={setNoiDung}
  placeholder="Soạn đề bài…"
  bocTachKhiDan={{ loaiCau, onBocTach: (kq) => { /* điền phương án, đáp án… */ } }}
/>
// 2) SOẠN THẢO THÔNG THƯỜNG — trang nội dung, mô tả, thông báo, bài làm tự luận, thảo luận…
//    dán Word giữ nội dung/ảnh/công thức/bảng, KHÔNG bóc tách ("A.", "Đáp án:", "CH-TN" giữ nguyên là chữ)
<OEditor cheDo="soan-thao" value={baiLam} onChange={setBaiLam} />
// 3) GỌN — ô 1 dòng (phương án, đáp án ngắn) + nút Σ, không bóc tách
<OEditor cheDo="gon" value={pa} onChange={setPa} />

<NoiDungOEditor html={cauHoi.noiDung} />       {/* hiển thị ở mọi màn xem/làm bài */}
```

Thông báo (toast) lấy từ `<App>` của antd mà web đã bọc sẵn.

**Ba định dạng (`cheDo`)** — không truyền thì suy từ prop cũ (`gon` → `gon`, có `bocTachKhiDan` → `cau-hoi`, còn lại → `soan-thao`), mọi chỗ dùng cũ giữ nguyên hành vi. Nội dung trống phát `''` (không phải `<p></p>`). Chỉ `cau-hoi` mới bóc tách khi dán.

**Dán ảnh từ Word** (sửa 30/09/2026): ảnh thường Word đưa vào clipboard dạng `<v:shape id="Picture_…">` + ảnh gốc trong bản RTF. Trước đây khi clipboard không có `<o:OLEObject>` (tài liệu chỉ có hình), mọi `v:shape` bị coi là công thức MathType → ảnh thành ô công thức trống. Nay chỉ coi là công thức khi RTF có công thức **và** mã shape dạng đối tượng OLE (`_x0000_i1025`) — `word-html/chuyenDoiWord.ts`.

**OEditor tự nhận sự kiện paste** (sửa 01/10/2026 — `handleDOMEvents.paste` gọi `view.pasteHTML`): trình xử lý paste mặc định của ProseMirror **bỏ qua** khi đang trong phiên gõ IME (`view.composing` — bàn phím Vietnamese Telex của Windows giữ phiên gõ mở tới khi gõ dấu cách) và để trình duyệt dán HTML thô → ảnh `file://` hỏng, công thức OLE thành ảnh chết, không bóc tách, không báo gì. Đã tái hiện bằng đề thật (Ctrl+V thật, Playwright) và xác nhận sửa xong. Lỗi chuyển đổi trong `transformPastedHTML` cũng được bắt lại (báo toast, dán phần chữ) thay vì rơi về dán thô.

**Ảnh NỔI của Word** (wrap text khác In line — `v:shape` có `position:absolute`): Word đặt điểm ảnh ở chỗ NEO (đầu đoạn "Câu 1. …" hoặc đầu dòng phương án), không phải chỗ hiện trên trang. `chuyenDoiWord.ts` đưa ảnh thành khối riêng ngay sau đoạn neo, đánh dấu `data-anh-noi`; định dạng trắc nghiệm / Đúng-Sai 4 ý (`tienIch.tachAnhNoi`) rút ảnh nổi rơi vào phương án về đề bài. Ảnh vector (EMF/WMF, hình vẽ Shapes) vẫn không dán được — chip cảnh báo + toast hướng dẫn lưu PNG.

## Plugin oImportWord

**Ba mẫu tệp Word** (người dùng chọn ở bước 1 — docs/nghiep-vu-import-cau-hoi-word.md mục 6.0): `docTepWord(tep, { mau })` / `bocTachTheoMau(html, mau)` với `mau` ∈ `MAU_IMPORT` = `khao-thi-so` (mặc định — mã `CH-…`) · `thi-tn-thpt` (dòng mã `ChủĐề.TiểuMục_CấpĐộ_TPNL_Đảo.`, trả thêm `CauHoiBocTach.phanLoai`) · `mac-dinh` (`Câu N.` + A–D + `Đáp án: A` / `Đáp án: A, C`). `DANH_SACH_MAU_IMPORT` (tên, tóm tắt, quy ước) cho ô chọn; `xuatTepMauTheoMau(mau)` tải tệp mẫu đúng mẫu.

```ts
import { docTepWord, bocTachCauHoi, moTaQuyUoc } from '@web-shared/oimportword';

// IMPORT tệp .docx — chạy hoàn toàn trên trình duyệt
const { cauHoi, ghiChu, soCongThuc } = await docTepWord(tep, { onTienTrinh: setPhanTram });

// DÁN — OEditor tự gọi khi có prop bocTachKhiDan; gọi tay:
const cau = bocTachCauHoi(html, { loaiCau: 'trac-nghiem-1' }); // null = không có gì để tách
```

Kết quả mỗi câu (`CauHoiBocTach`) trung lập với nghiệp vụ: `loaiCau` (trùng giá trị `LoaiCauHoi`
của web), `noiDung`, `phuongAn[{noiDung, dung}]`, `dapAn`, `loiGiai`, `nguLieu`, `cauCon`,
`trangThai` (`ok` / `canh-bao` / `loi`) + `lyDo[]`, `nhan` ("Câu 9"), `phan` ("PHẦN II…").
Web tự ánh xạ vào mô hình của mình (xem `SoanCauHoiChuan.tsx`, `ImportWordCauHoi.tsx`).

**Cách tách tài liệu** (quy ước đầy đủ cho người soạn đề: [docs/13](../../docs/13-quy-uoc-import-word.md)):
- Mỗi câu bắt đầu bằng mã loại câu `CH-<mã>` (VD `CH-TN`); câu hỏi con bắt đầu bằng `CHC-<mã>` (VD `CHC-TLN`). Danh mục mã có trong `maLoaiCau.ts`, mở rộng bằng `dangKyMaLoaiCau`. Cách đánh số cũ `Câu N.` vẫn được chấp nhận.
- Câu hỏi nhóm mở bằng một trong các dấu hiệu: `CH-NHOM`, câu dẫn `##…##`, lời dẫn "…trả lời câu N** – câu N***", `Ngữ liệu N.`, hoặc một đoạn văn nằm ngay trên các câu `CHC-…`.
- Tiêu đề `PHẦN …` được ghi lại làm gợi ý loại câu. Việc đọc dừng ở `HẾT` hoặc `ĐÁP ÁN`.

**Phân loại:**
- **Import:** có mã thì loại câu theo mã, và chỉ các định dạng của loại đó được thử. Không có mã thì hệ thống hỏi mọi định dạng và chọn định dạng có điểm cao nhất. Không phân biệt được thì trả `loaiCau: ''` với `trangThai: 'loi'` ("cần cập nhật bổ sung loại câu"). `maCauHoi` giữ mã trong tệp, hoặc được sinh theo loại (`taoMaCauHoi`).
- **Dán:** loại câu do người dùng chọn; mã đầu câu chỉ bị cắt bỏ.

Ký hiệu vị trí `N**`, `N**+k` và `N***` được giữ nguyên trong nội dung. Khi sinh đề, gọi `danhSoViTri(html, { soBatDau, soKetThuc })` để thay bằng số thật.

### Định dạng mặc định (`src/oimportword/dinh-dang/`) — mỗi loại một hàm

| Mã | Loại câu | Nhận diện |
|---|---|---|
| `trac-nghiem-abcd` | 1 / nhiều đáp án | Mốc `A.` `B.` `C.` `D.` tuần tự. Mỗi mốc đứng đầu dòng, sau Tab hoặc sau ≥ 2 dấu cách; phương án cũng có thể nằm trong bảng. Đáp án: `Đáp án: B` (dòng riêng hoặc cuối câu), gạch chân, hoặc in đậm riêng. |
| `dung-sai-4-y` | Đúng/Sai 4 ý | Mốc `a)` `b)` `c)` `d)`. Đáp án ghi ở cuối từng ý (`… Đáp án: Đúng`), hoặc gộp (`a) Đ, b) S…`), hoặc gạch chân. |
| `dung-sai` | Đúng/Sai đơn | Nhận định kèm `Đáp án: Đúng` hoặc `Sai`. |
| `tra-loi-ngan` | Trả lời ngắn | `Đáp án: <giá trị>`, được kiểm tra: ≤ 4 ký tự, dấu phẩy thập phân ở vị trí 2 hoặc 3. Cũng nhận diện qua phần "trả lời ngắn" hoặc cách hỏi "bằng bao nhiêu". |
| `dien-khuyet` | Điền khuyết | Ô trống `(1)______` hoặc `(N**)`. Đáp án: `(1) …; (2) …`. |
| `tu-luan` | Tự luận | `Lời giải:` / `Hướng dẫn chấm:`, cách hỏi "chứng minh", "giải thích"…, hoặc mã `CH-TL`. **Không** còn là phương án dự phòng. |
| `cau-chum` | Câu hỏi nhóm | Khối có câu con; tách `cauDan`, `nguLieu` (ô trống được chuẩn hóa về `(N**+k)`) và `cauCon` (mỗi câu con bóc tách lại theo loại của nó). |

Khi import, tab trong .docx được giữ thành ký tự tab (`tienXuLyCongThucDocx(tep, { tabThanhKyTu: true })`); trình xem tài liệu không bật tùy chọn này.

Mọi định dạng đều tách `Lời giải:` ra `loiGiai` và cắt tiền tố `Câu N.`.

### Thêm định dạng mới

Một định dạng là một đối tượng `DinhDangCauHoi` (`src/oimportword/kieu.ts`):

```ts
import { dangKyDinhDang, tienIchBocTach as ti, type DinhDangCauHoi } from '@web-shared/oimportword';

const dinhDangGhepDoi: DinhDangCauHoi = {
  ma: 'ghep-doi-bang',
  ten: 'Ghép đôi (bảng 2 cột)',
  quyUoc: 'Đề bài, rồi bảng 2 cột: cột trái các mục cần ghép, cột phải đáp án ghép đúng.',
  loaiCau: ['ghep-doi'],
  uuTien: 8,
  nhanDien: (khoi) => (/<table/i.test(khoi.html) && /ghép/i.test(khoi.vanBan) ? 0.8 : 0),
  bocTach: (khoi, nguCanh) => {
    const { goc } = ti.phanTich(khoi.html);
    // … tách bảng thành các cặp …
    return { maDinhDang: 'ghep-doi-bang', loaiCau: 'ghep-doi', noiDung: '…', phuongAn: [], trangThai: 'ok', lyDo: [] };
  },
};
dangKyDinhDang(dinhDangGhepDoi); // cả DÁN lẫn IMPORT dùng được ngay
```

- **Định dạng dùng cho mọi web**: tạo tệp trong `src/oimportword/dinh-dang/` và thêm vào
  `DINH_DANG_MAC_DINH` (`dinh-dang/index.ts`).
- **Định dạng riêng một web**: gọi `dangKyDinhDang()` khi khởi động web đó (VD trong `App.tsx`),
  không phải sửa package. Trùng `ma` với định dạng mặc định = ghi đè định dạng đó.
- `nhanDien` trả điểm 0…1 (0 = không khớp); `bocTach` trả `null` nếu thực ra không tách được —
  bộ máy thử định dạng kế tiếp. Với nguồn `'dan'` mà không có gì để tách, nên trả `null` để
  OEditor dán nguyên văn.
- Tiện ích sẵn có (`tienIchBocTach`): `phanTich`, `timMocTuanTu`, `catTheoMoc` (cắt theo Range,
  giữ công thức/ảnh), `tachDongDapAn`, `tachLoiGiai`, `dapAnTheoY`, `chuCaiDapAn`,
  `traiPhangBangPhuongAn`, `catTienToCau`, `donPhanDoan`.
- `moTaQuyUoc()` liệt kê quy ước của mọi định dạng đã đăng ký — màn import dùng làm hướng dẫn.

## Nhúng vào một web mới (3 bước)

**1. `vite.config.ts`**

```ts
import { PHU_THUOC_WEB_SHARED, THU_MUC_WEB_SHARED } from '../WebShared/cau-hinh-vite.ts';

const webShared = path.resolve(__dirname, THU_MUC_WEB_SHARED);

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src'), '@web-shared': path.join(webShared, 'src') },
    dedupe: PHU_THUOC_WEB_SHARED,
  },
  server: { fs: { allow: [__dirname, webShared] } },
});
```

**2. `tsconfig.app.json`** — kế thừa cấu hình nền, **xóa** `compilerOptions.paths` của web:

```json
{ "extends": "../WebShared/tsconfig.web-shared.json", "compilerOptions": { … } }
```

**3. `package.json` của web** — cài đủ `peerDependencies` của package (React, antd, TipTap,
MathLive, KaTeX, DOMPurify, mathml-to-latex, jszip, docx-preview, pptx-preview, sass) và thêm
`"overrides": { "echarts": "^6.1.0", "uuid": "^11.1.1" }` (vá lỗ hổng phụ thuộc của pptx-preview).

## Vì sao cần `dedupe` và tsconfig nền

Mã package nằm **ngoài** thư mục web nên không tự tìm thấy `node_modules`. `resolve.dedupe`
(Vite) và ánh xạ thư viện trong `tsconfig.web-shared.json` (TypeScript, dùng `${configDir}`)
buộc mọi import trần trong package lấy từ `node_modules` **của web đang build** — đồng thời bảo
đảm chỉ một bản React/antd/TipTap. **Thêm thư viện mới cho package** ⇒ bổ sung đồng thời vào
`PHU_THUOC_WEB_SHARED` (cau-hinh-vite.ts), `paths` (tsconfig.web-shared.json) và
`peerDependencies` (package.json).

## Quy ước

- Đặt tên, style, design system theo docs/10 và `src/KTDG.Web/HUONG-DAN-PHAT-TRIEN.md` như mã app.
- Sửa package = sửa cho mọi web: chạy `npx tsc -b` + `npm run build` ở các web đang dùng.
