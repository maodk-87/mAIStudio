/**
 * TỆP MẪU nhập câu hỏi từ Word (.docx THẬT) — đúng quy ước docs/13-quy-uoc-import-word.md:
 * mỗi loại câu một ví dụ (TN1, TNN, DS, DS1, TLN, DK, TL, NHOM + câu con CHC-…), phương án phân tách
 * bằng Tab/Enter, dòng "Đáp án: …", kết thúc bằng "HẾT". Ký hiệu toán gõ thường (x², √) — bộ đọc .docx
 * hiện chỉ chuyển công thức MathType (OLE), chưa đọc Equation gốc (OMML) của Word.
 * Phần hướng dẫn đầu tệp nằm TRƯỚC câu đầu tiên nên bộ bóc tách bỏ qua — tải về, xóa câu ví dụ,
 * soạn câu thật rồi nhập lại được ngay (đã kiểm chứng bằng docTepWord).
 * Nạp thư viện xuất tệp theo nhu cầu (dynamic import) để không làm nặng màn import.
 */
import type { MaMauImport } from './kieu';
import { danhSachMaLoaiCau } from './maLoaiCau';
import { layMauImport } from './mauImport';

type KhoiMau =
  | { loai: 'tieu-de'; noiDung: string; cap?: 1 | 2 | 3 }
  | { loai: 'doan'; noiDung: string; nghieng?: boolean; dam?: boolean }
  | { loai: 'danh-sach'; muc: string[] }
  | { loai: 'bang'; cot: { tieuDe: string; rong?: number }[]; dong: string[][] }
  | { loai: 'dong-trong' };

/** Tệp mẫu định dạng Khảo thí số (mã CH-/CHC-) */
function khoiKhaoThiSo(): KhoiMau[] {
  const huongDan: KhoiMau[] = [
    { loai: 'tieu-de', noiDung: 'TỆP MẪU NHẬP CÂU HỎI TỪ WORD', cap: 1 },
    {
      loai: 'doan',
      nghieng: true,
      noiDung: 'Phần hướng dẫn này nằm trước câu hỏi đầu tiên nên hệ thống bỏ qua khi nhập. Xóa các câu ví dụ bên dưới, soạn câu của bạn theo đúng quy ước rồi nhập lại tệp.',
    },
    { loai: 'tieu-de', noiDung: 'Quy ước chung', cap: 2 },
    {
      loai: 'danh-sach',
      muc: [
        'Mỗi câu hỏi bắt đầu một đoạn mới bằng mã loại câu "CH-<mã>" (bảng dưới); câu hỏi con của câu hỏi nhóm bắt đầu bằng "CHC-<mã>". Sau mã có thể có dấu chấm, hai chấm hoặc ngoặc đóng.',
        'Không ghi mã: hệ thống tự nhận diện theo nội dung (kiểu "Câu 1."); câu không nhận diện được phải chọn loại ở bước soát.',
        'Phương án trắc nghiệm "A." "B." "C." "D." cách nhau bằng phím Tab, xuống dòng (Enter) hoặc từ 5 dấu cách trở lên.',
        'Đáp án (tùy chọn) ghi ở cuối câu: "Đáp án: B"; nhiều đáp án: "Đáp án: A, C"; Đúng/Sai ghi cuối từng ý "Đáp án: Đúng"/"Đáp án: Sai".',
        'Trả lời ngắn: tối đa 4 ký tự, số thập phân dùng dấu phẩy (VD 12,5).',
        'Tự luận: đoạn bắt đầu bằng "Lời giải:" hoặc "Hướng dẫn chấm:" là hướng dẫn cho người chấm.',
        'Công thức: soạn bằng MathType (giữ nguyên khi nhập) hoặc gõ ký hiệu thường (x², √, ≤, π…). Ảnh chèn trực tiếp vào câu.',
        'Kết thúc đề bằng một dòng "HẾT" — nội dung sau dòng này (VD bảng đáp án) không được nhập.',
      ],
    },
    { loai: 'tieu-de', noiDung: 'Mã loại câu', cap: 2 },
    {
      loai: 'bang',
      cot: [{ tieuDe: 'Mã (ghi sau "CH-" / "CHC-")', rong: 22 }, { tieuDe: 'Loại câu', rong: 50 }],
      dong: danhSachMaLoaiCau().map((m) => [m.ma, m.ten]),
    },
    { loai: 'tieu-de', noiDung: 'Câu hỏi ví dụ', cap: 2 },
  ];

  const cauHoi: KhoiMau[] = [
    // TN1 — công thức + phương án cách nhau bằng Tab
    { loai: 'doan', noiDung: 'CH-TN1 Giá trị của biểu thức √49 + √16 bằng' },
    { loai: 'doan', noiDung: 'A. 9\tB. 11\tC. 13\tD. 65' },
    { loai: 'doan', noiDung: 'Đáp án: B' },
    // TN1 — mỗi phương án một dòng
    { loai: 'doan', noiDung: 'CH-TN1 Hình chóp tứ giác đều có bao nhiêu mặt bên?' },
    { loai: 'doan', noiDung: 'A. 3' },
    { loai: 'doan', noiDung: 'B. 4' },
    { loai: 'doan', noiDung: 'C. 5' },
    { loai: 'doan', noiDung: 'D. 6' },
    { loai: 'doan', noiDung: 'Đáp án: B' },
    // TNN — nhiều đáp án đúng
    { loai: 'doan', noiDung: 'CH-TNN Những số nào sau đây là số nguyên tố?' },
    { loai: 'doan', noiDung: 'A. 2\tB. 9\tC. 11\tD. 15' },
    { loai: 'doan', noiDung: 'Đáp án: A, C' },
    // DS — Đúng/Sai 4 ý, đáp án cuối từng ý
    { loai: 'doan', noiDung: 'CH-DS Cho hàm số y = x² − 4x + 3. Xét tính đúng sai của các khẳng định sau.' },
    { loai: 'doan', noiDung: 'a) Đồ thị hàm số cắt trục tung tại điểm (0; 3). Đáp án: Đúng' },
    { loai: 'doan', noiDung: 'b) Hàm số đồng biến trên toàn bộ tập số thực. Đáp án: Sai' },
    { loai: 'doan', noiDung: 'c) Phương trình y = 0 có hai nghiệm x = 1 và x = 3. Đáp án: Đúng' },
    { loai: 'doan', noiDung: 'd) Giá trị nhỏ nhất của hàm số bằng 1. Đáp án: Sai' },
    // DS1 — một nhận định
    { loai: 'doan', noiDung: 'CH-DS1 Số 2 là số nguyên tố chẵn duy nhất.' },
    { loai: 'doan', noiDung: 'Đáp án: Đúng' },
    // TLN — trả lời ngắn
    { loai: 'doan', noiDung: 'CH-TLN Một hình chữ nhật có chiều dài 5 cm, chiều rộng 2,5 cm. Diện tích hình chữ nhật bằng bao nhiêu xăng-ti-mét vuông?' },
    { loai: 'doan', noiDung: 'Đáp án: 12,5' },
    // DK — điền khuyết (đục lỗ): mỗi ô trống một dòng phương án
    { loai: 'doan', noiDung: 'CH-DK The exhibition will showcase over 100 galleries (1)______ are derived from global art capitals alongside Vietnam’s (2)______ art institutions.' },
    { loai: 'doan', noiDung: '(1) A. which\tB. who\tC. whom\tD. whose' },
    { loai: 'doan', noiDung: 'Đáp án: A' },
    { loai: 'doan', noiDung: '(2) A. lead\tB. leading\tC. led\tD. leader' },
    { loai: 'doan', noiDung: 'Đáp án: B' },
    // TL — tự luận + hướng dẫn chấm
    { loai: 'doan', noiDung: 'CH-TL Giải phương trình x² − 5x + 6 = 0.' },
    { loai: 'doan', noiDung: 'Hướng dẫn chấm: Tính Δ = 1 (0,5 điểm); tìm được hai nghiệm x = 2 và x = 3 (0,5 điểm).' },
    // NHOM — câu hỏi nhóm: câu dẫn ##…##, đoạn văn, các câu hỏi con CHC-…
    { loai: 'doan', noiDung: 'CH-NHOM ##Đọc đoạn văn sau và trả lời các câu N**+1 – N**+2.##' },
    {
      loai: 'doan',
      noiDung: 'Một cửa hàng nhập về 120 quyển vở. Ngày thứ nhất bán được 25% số vở, ngày thứ hai bán được 40 quyển.',
    },
    { loai: 'doan', noiDung: 'CHC-TN1 Ngày thứ nhất cửa hàng bán được bao nhiêu quyển vở?' },
    { loai: 'doan', noiDung: 'A. 25\tB. 30\tC. 40\tD. 45' },
    { loai: 'doan', noiDung: 'Đáp án: B' },
    { loai: 'doan', noiDung: 'CHC-TLN Sau hai ngày, cửa hàng còn lại bao nhiêu quyển vở?' },
    { loai: 'doan', noiDung: 'Đáp án: 50' },
    { loai: 'dong-trong' },
    { loai: 'doan', dam: true, noiDung: 'HẾT' },
  ];
  return [...huongDan, ...cauHoi];
}

/** Phần hướng dẫn đầu tệp của mẫu TN THPT / Mặc định — lấy từ mô tả cố định (mauImport.ts) */
function huongDanTheoMau(mau: MaMauImport): KhoiMau[] {
  const moTa = layMauImport(mau);
  const bangGiaiNghia: KhoiMau[] = moTa.giaiNghiaTienTo
    ? [
        {
          loai: 'bang',
          cot: [{ tieuDe: 'Thành phần', rong: 22 }, { tieuDe: 'Ý nghĩa', rong: 60 }],
          dong: moTa.giaiNghiaTienTo.map((g) => [g.thanhPhan, g.yNghia]),
        },
      ]
    : [];
  return [
    { loai: 'tieu-de', noiDung: `TỆP MẪU NHẬP CÂU HỎI TỪ WORD — ${moTa.ten.toUpperCase()}`, cap: 1 },
    {
      loai: 'doan',
      nghieng: true,
      noiDung:
        'Phần hướng dẫn này nằm trước câu hỏi đầu tiên nên hệ thống bỏ qua khi nhập. Xóa các câu ví dụ bên dưới, soạn câu của bạn theo đúng quy ước rồi nhập lại tệp (chọn đúng định dạng này ở bước 1).',
    },
    { loai: 'tieu-de', noiDung: 'Đầu mỗi câu', cap: 2 },
    { loai: 'doan', noiDung: moTa.tienTo },
    ...bangGiaiNghia,
    { loai: 'tieu-de', noiDung: 'Câu hỗ trợ', cap: 2 },
    { loai: 'danh-sach', muc: moTa.cauHoTro },
    { loai: 'tieu-de', noiDung: 'Không hỗ trợ', cap: 2 },
    { loai: 'danh-sach', muc: moTa.cauKhongHoTro },
    { loai: 'tieu-de', noiDung: 'Phương án và đáp án', cap: 2 },
    { loai: 'danh-sach', muc: moTa.dinhDangLoaiCau.map((l) => `${l.ten}: ${l.dapAn}`) },
    { loai: 'doan', noiDung: 'Kết thúc đề bằng một dòng "HẾT" — nội dung sau dòng này (VD bảng đáp án) không được nhập.' },
    { loai: 'tieu-de', noiDung: 'Câu hỏi ví dụ', cap: 2 },
  ];
}

const CAU_TN_THPT: KhoiMau[] = [
  { loai: 'doan', dam: true, noiDung: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn' },
  { loai: 'doan', noiDung: '1.1_1_1_1 Câu 1. Giá trị của biểu thức √49 + √16 bằng' },
  { loai: 'doan', noiDung: 'A. 9\tB. 11\tC. 13\tD. 65' },
  { loai: 'doan', noiDung: 'Đáp án: B' },
  { loai: 'doan', noiDung: '1.2_2_2_1 Câu 2. Hình chóp tứ giác đều có bao nhiêu mặt bên?' },
  { loai: 'doan', noiDung: 'A. 3\tB. 4\tC. 5\tD. 6' },
  { loai: 'doan', noiDung: 'Đáp án: B' },
  { loai: 'doan', dam: true, noiDung: 'PHẦN II. Câu trắc nghiệm đúng sai' },
  { loai: 'doan', noiDung: '2.1_2_1+2_3 Câu 3. Cho hàm số y = x² − 4x + 3. Xét tính đúng sai của các khẳng định sau.' },
  { loai: 'doan', noiDung: 'a) Đồ thị hàm số cắt trục tung tại điểm (0; 3). Đáp án: Đúng' },
  { loai: 'doan', noiDung: 'b) Hàm số đồng biến trên toàn bộ tập số thực. Đáp án: Sai' },
  { loai: 'doan', noiDung: 'c) Phương trình y = 0 có hai nghiệm x = 1 và x = 3. Đáp án: Đúng' },
  { loai: 'doan', noiDung: 'd) Giá trị nhỏ nhất của hàm số bằng 1. Đáp án: Sai' },
  { loai: 'doan', dam: true, noiDung: 'PHẦN III. Câu trắc nghiệm trả lời ngắn' },
  {
    loai: 'doan',
    noiDung: '2.2_3_2_4 Câu 4. Một hình chữ nhật có chiều dài 5 cm, chiều rộng 2,5 cm. Diện tích hình chữ nhật bằng bao nhiêu xăng-ti-mét vuông?',
  },
  { loai: 'doan', noiDung: 'Đáp án: 12,5' },
  { loai: 'dong-trong' },
  { loai: 'doan', dam: true, noiDung: 'HẾT' },
];

const CAU_MAC_DINH: KhoiMau[] = [
  { loai: 'doan', noiDung: 'Câu 1. Giá trị của biểu thức √49 + √16 bằng' },
  { loai: 'doan', noiDung: 'A. 9\tB. 11\tC. 13\tD. 65' },
  { loai: 'doan', noiDung: 'Đáp án: B' },
  { loai: 'doan', noiDung: 'Câu 2. Những số nào sau đây là số nguyên tố?' },
  { loai: 'doan', noiDung: 'A. 2\tB. 9\tC. 11\tD. 15' },
  { loai: 'doan', noiDung: 'Đáp án: A, C' },
  { loai: 'doan', noiDung: 'Câu 3. Cho hàm số y = x² − 4x + 3. Xét tính đúng sai của các khẳng định sau.' },
  { loai: 'doan', noiDung: 'a) Đồ thị hàm số cắt trục tung tại điểm (0; 3). Đáp án: Đúng' },
  { loai: 'doan', noiDung: 'b) Hàm số đồng biến trên toàn bộ tập số thực. Đáp án: Sai' },
  { loai: 'doan', noiDung: 'c) Phương trình y = 0 có hai nghiệm x = 1 và x = 3. Đáp án: Đúng' },
  { loai: 'doan', noiDung: 'd) Giá trị nhỏ nhất của hàm số bằng 1. Đáp án: Sai' },
  { loai: 'doan', noiDung: 'Câu 4. Số 2 là số nguyên tố chẵn duy nhất.' },
  { loai: 'doan', noiDung: 'Đáp án: Đúng' },
  {
    loai: 'doan',
    noiDung: 'Câu 5. Một hình chữ nhật có chiều dài 5 cm, chiều rộng 2,5 cm. Diện tích hình chữ nhật bằng bao nhiêu xăng-ti-mét vuông?',
  },
  { loai: 'doan', noiDung: 'Đáp án: 12,5' },
  { loai: 'doan', noiDung: 'Câu 6. Giải phương trình x² − 5x + 6 = 0.' },
  { loai: 'doan', noiDung: 'Hướng dẫn chấm: Tính Δ = 1 (0,5 điểm); tìm được hai nghiệm x = 2 và x = 3 (0,5 điểm).' },
  { loai: 'dong-trong' },
  { loai: 'doan', dam: true, noiDung: 'HẾT' },
];

/** Nội dung tệp mẫu (khối Word) theo định dạng — tách riêng để kiểm thử bóc tách */
export function taoKhoiTepMau(mau: MaMauImport = 'khao-thi-so'): KhoiMau[] {
  if (mau === 'tn-thpt') return [...huongDanTheoMau(mau), ...CAU_TN_THPT];
  if (mau === 'mac-dinh') return [...huongDanTheoMau(mau), ...CAU_MAC_DINH];
  return khoiKhaoThiSo();
}

const tenTepMau = (mau: MaMauImport) => `Tệp mẫu nhập câu hỏi từ Word - ${layMauImport(mau).ten}`;

/** Tải tệp mẫu .docx nhập câu hỏi từ Word theo định dạng đã chọn */
export async function xuatTepMauImportWord(tenTep?: string, mau: MaMauImport = 'khao-thi-so'): Promise<void> {
  const { xuatWord } = await import('../xuat-tep');
  await xuatWord(tenTep ?? tenTepMau(mau), taoKhoiTepMau(mau), {
    tieuDe: tenTepMau(mau),
    coThoiGian: false,
    khongDanhSoTrang: true,
  });
}

/** Tạo Blob tệp mẫu (kiểm thử / "Dùng dữ liệu mẫu": nhập lại bằng docTepWord) */
export async function taoTepMauImportWord(mau: MaMauImport = 'khao-thi-so'): Promise<Blob> {
  const { taoWord } = await import('../xuat-tep');
  return taoWord(taoKhoiTepMau(mau), { tieuDe: tenTepMau(mau), khongDanhSoTrang: true });
}
