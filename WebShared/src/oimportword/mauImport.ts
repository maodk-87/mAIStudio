/**
 * MẪU IMPORT WORD — danh sách CỐ ĐỊNH trong mã nguồn (không cấu hình, không đăng ký thêm): người dùng chọn
 * "Định dạng" ở bước 1 màn nhập câu hỏi / nhập đề; bộ bóc tách chia khối câu và SOÁT theo mẫu đã chọn
 * (bocTachTaiLieu), màn hình lấy mô tả dưới đây làm nội dung modal hướng dẫn. Đặc tả: docs/13-quy-uoc-import-word.md mục 7.
 */
import { LOAI_CAU, type MaLoaiCau, type MaMauImport } from './kieu';

/** Một loại câu mẫu hỗ trợ: cách trình bày để được nhận diện + cách bóc tách đáp án */
export interface LoaiCauMauImport {
  loaiCau: MaLoaiCau;
  ten: string;
  /** Cách viết trong Word để hệ thống nhận ra loại câu này */
  trinhBay: string;
  /** Cách bóc tách phương án / đáp án */
  dapAn: string;
}

export interface VanDeMauImport {
  vanDe: string;
  xuLy: string;
}

export interface MoTaMauImport {
  ma: MaMauImport;
  ten: string;
  /** Một câu giới thiệu — hiện dưới ô chọn định dạng */
  tomTat: string;
  /** Cách viết đầu mỗi câu hỏi */
  tienTo: string;
  /** Giải nghĩa các thành phần của tiền tố (nếu có) */
  giaiNghiaTienTo?: { thanhPhan: string; yNghia: string }[];
  /** Các câu hỗ trợ */
  cauHoTro: string[];
  /** Các câu KHÔNG hỗ trợ (bị báo lỗi ở bước soát) */
  cauKhongHoTro: string[];
  /** Định dạng hỗ trợ theo loại câu (trình bày + cách bóc tách đáp án) */
  dinhDangLoaiCau: LoaiCauMauImport[];
  /** Cách xác định loại câu */
  xacDinhLoaiCau: string[];
  /** Cách bóc tách câu con */
  bocTachCauCon: string[];
  /** Trình tự bóc tách dữ liệu từ tệp Word */
  cacBuoc: string[];
  /** Vấn đề thường gặp và cách xử lý */
  xuLyVanDe: VanDeMauImport[];
  /** Loại câu được phép (câu ngoài danh sách → lỗi ở bước soát) */
  loaiCauHoTro: readonly MaLoaiCau[];
  /** Ví dụ trình bày (văn bản thuần, mỗi phần tử một dòng) */
  viDu: string[];
}

// ---- Nội dung dùng chung giữa các mẫu ----

const DA_TRAC_NGHIEM =
  'Phương án "A." "B." "C." "D." (in đậm hoặc thường) cách nhau bằng Tab, xuống dòng (Enter) hoặc từ 5 dấu cách. Đáp án: dòng "Đáp án: B" cuối câu, hoặc gạch chân phương án đúng.';
const DA_DUNG_SAI_4Y =
  'Các ý "a)" "b)" "c)" "d)", mỗi ý một dòng; đáp án ghi cuối từng ý "Đáp án: Đúng"/"Đáp án: Sai" (chấp nhận dòng gộp "Đáp án: a) Đ, b) S, c) Đ, d) S").';
const DA_TRA_LOI_NGAN =
  'Dòng "Đáp án: 12,5" — tối đa 4 ký tự, số thập phân dùng dấu phẩy ở vị trí 2 hoặc 3; sai quy chuẩn vẫn nhận nhưng có cảnh báo.';
const DA_TU_LUAN =
  'Đoạn bắt đầu bằng "Lời giải:", "Hướng dẫn giải:" hoặc "Hướng dẫn chấm:" được tách thành hướng dẫn chấm; không có thì để trống.';

const BUOC_DOC_TEP = [
  'Đọc tệp .docx ngay trên trình duyệt, chuyển thành nội dung có định dạng: công thức MathType/Equation thành công thức sống, ảnh và bảng giữ nguyên.',
  'Bỏ qua phần mở đầu trước câu hỏi đầu tiên (tiêu đề, thông tin đề); dừng đọc ở dòng "HẾT" hoặc "ĐÁP ÁN" — bảng đáp án cuối tệp không được nhập.',
];
const BUOC_TACH_NOI_DUNG =
  'Tách từng câu: nội dung câu hỏi, phương án, đáp án, lời giải/hướng dẫn chấm; tiền tố đầu câu và "Câu N." bị cắt khỏi nội dung.';
const BUOC_SOAT =
  'Soát theo mẫu đã chọn: câu hợp lệ màu xanh, câu cần xem lại (thiếu đáp án, công thức chưa trọn…) màu vàng, câu ngoài danh sách hỗ trợ hoặc sai tiền tố màu đỏ — sửa ở bước soát hoặc sửa tệp rồi nhập lại.';

const VAN_DE_CHUNG: VanDeMauImport[] = [
  {
    vanDe: 'Các phương án bị dính vào nhau hoặc vào nội dung câu',
    xuLy: 'Mỗi phương án bắt đầu bằng chữ in hoa + dấu chấm ("A.") và cách nhau bằng Tab, Enter hoặc từ 5 dấu cách; không gõ "A)" hay "a.".',
  },
  {
    vanDe: 'Câu báo vàng "thiếu đáp án"',
    xuLy: 'Thêm dòng "Đáp án: …" cuối câu hoặc gạch chân phương án đúng; hoặc đánh dấu đáp án ngay ở khung sửa nhanh của bước soát.',
  },
  {
    vanDe: 'Công thức hiện ô "?"',
    xuLy: 'Công thức MathType có ký hiệu chưa nhận diện được — sửa lại công thức ở bước soát (trình soạn công thức) hoặc gõ lại bằng MathType/Equation trong Word.',
  },
  {
    vanDe: 'Hai câu bị gộp thành một',
    xuLy: 'Câu sau thiếu phần mở đầu đúng quy ước của mẫu, hoặc bị xuống dòng bằng Shift+Enter — đầu mỗi câu phải là một đoạn mới (Enter).',
  },
  {
    vanDe: 'Mất nội dung phía sau',
    xuLy: 'Hệ thống dừng đọc ở dòng "HẾT"/"ĐÁP ÁN" — chỉ đặt các dòng này ở cuối đề.',
  },
];

// ---- 3 mẫu cố định ----

const MAU_KHAO_THI_SO: MoTaMauImport = {
  ma: 'khao-thi-so',
  ten: 'Khảo thí số',
  tomTat: 'Mẫu đầy đủ: đầu mỗi câu ghi mã loại câu (CH-TN1, CH-NHOM…), câu hỏi con ghi CHC-…; hỗ trợ mọi loại câu kể cả câu hỏi nhóm và điền khuyết.',
  tienTo: '"CH-<mã loại>" đầu câu hỏi, "CHC-<mã loại>" đầu câu hỏi con — VD "CH-TN1", "CH-NHOM", "CHC-TN1". Sau mã có thể có dấu ".", ":" hoặc ")".',
  giaiNghiaTienTo: [
    { thanhPhan: 'TN1 / TNN', yNghia: 'Trắc nghiệm 1 đáp án / nhiều đáp án' },
    { thanhPhan: 'DS / DS1', yNghia: 'Đúng/Sai nhiều ý a) b) c) d) / một nhận định' },
    { thanhPhan: 'TLN', yNghia: 'Trả lời ngắn, điền số' },
    { thanhPhan: 'DK', yNghia: 'Điền khuyết (đục lỗ)' },
    { thanhPhan: 'TL', yNghia: 'Tự luận' },
    { thanhPhan: 'NHOM', yNghia: 'Câu hỏi nhóm: lời dẫn/ngữ liệu chung + các câu hỏi con CHC-…' },
  ],
  cauHoTro: [
    'Trắc nghiệm 1 đáp án (CH-TN1), nhiều đáp án (CH-TNN)',
    'Đúng/Sai nhiều ý (CH-DS), Đúng/Sai một nhận định (CH-DS1)',
    'Trả lời ngắn / điền số (CH-TLN)',
    'Điền khuyết – đục lỗ (CH-DK): mỗi ô trống là một câu con trắc nghiệm',
    'Tự luận (CH-TL) kèm hướng dẫn chấm',
    'Câu hỏi nhóm (CH-NHOM) với câu con CHC-<mã> thuộc bất kỳ loại nào ở trên',
  ],
  cauKhongHoTro: [
    'Câu không có mã "CH-…" (câu hỏi con không có "CHC-…") ở đầu câu',
    'Mã ngoài danh mục (VD "CH-XYZ")',
    'Ghép đôi (CH-GD), Sắp xếp (CH-SX): nhận loại theo mã nhưng chưa bóc tách phương án — nhập tay ở bước soát',
  ],
  dinhDangLoaiCau: [
    { loaiCau: LOAI_CAU.TracNghiem1DapAn, ten: 'Trắc nghiệm (CH-TN1, CH-TNN)', trinhBay: 'CH-TN1/CH-TNN + nội dung + phương án A–D.', dapAn: `${DA_TRAC_NGHIEM} Nhiều đáp án: "Đáp án: A, C".` },
    { loaiCau: LOAI_CAU.DungSai4Y, ten: 'Đúng/Sai (CH-DS, CH-DS1)', trinhBay: 'CH-DS + nội dung chung + 4 ý a) b) c) d); CH-DS1 + một nhận định.', dapAn: `${DA_DUNG_SAI_4Y} DS1: "Đáp án: Đúng"/"Đáp án: Sai".` },
    { loaiCau: LOAI_CAU.TraLoiNgan, ten: 'Trả lời ngắn (CH-TLN)', trinhBay: 'CH-TLN + nội dung câu hỏi.', dapAn: DA_TRA_LOI_NGAN },
    { loaiCau: LOAI_CAU.DienKhuyet, ten: 'Điền khuyết (CH-DK)', trinhBay: 'CH-DK + đoạn văn có ô trống "(1)______" hoặc "(N**)".', dapAn: 'Dưới đoạn văn, mỗi ô trống một dòng phương án "(k) A. … B. … C. … D. …" + "Đáp án: B"; không có dòng phương án thì ghi "Đáp án: (1) which; (2) leading".' },
    { loaiCau: LOAI_CAU.TuLuan, ten: 'Tự luận (CH-TL)', trinhBay: 'CH-TL + nội dung câu hỏi.', dapAn: DA_TU_LUAN },
    { loaiCau: LOAI_CAU.CauChum, ten: 'Câu hỏi nhóm (CH-NHOM)', trinhBay: 'CH-NHOM + lời dẫn (có thể bao "##…##") + đoạn văn/bảng/hình, rồi các câu con CHC-<mã>.', dapAn: 'Mỗi câu con bóc tách đáp án theo đúng loại của nó.' },
  ],
  xacDinhLoaiCau: [
    'Theo mã ghi đầu câu (bảng giải nghĩa mã). Mã đúng nhưng nội dung chưa theo quy ước của loại đó: câu vẫn giữ loại theo mã, kèm cảnh báo.',
  ],
  bocTachCauCon: [
    'Câu hỏi nhóm mở bằng "CH-NHOM" (hoặc câu dẫn "##…##", hoặc một đoạn văn mà ngay dưới là các câu "CHC-…"); mọi đoạn trước câu con đầu tiên là lời dẫn và ngữ liệu chung.',
    'Mỗi câu con bắt đầu "CHC-<mã>" và được bóc tách lại theo loại của nó; lời dẫn chung không bắt buộc.',
    'Điền khuyết: mỗi dòng phương án (bắt đầu "(k)", "k.", "CHC-TN1" hoặc ngay "A.") là một câu con trắc nghiệm; ô trống được chuẩn hóa về "(N**+k)", số ô trống khác số câu con thì cảnh báo.',
    'Ký hiệu vị trí "N**", "N**+k", "N***" trong lời dẫn được giữ nguyên và đánh số thật khi sinh đề.',
  ],
  cacBuoc: [
    ...BUOC_DOC_TEP,
    'Chia khối câu tại mỗi đoạn bắt đầu bằng mã "CH-…"; đoạn "CHC-…" là câu con của câu hỏi nhóm đang mở; tiêu đề "PHẦN …" được ghi lại để đối chiếu.',
    'Xác định loại câu theo mã.',
    BUOC_TACH_NOI_DUNG,
    BUOC_SOAT,
  ],
  xuLyVanDe: [
    { vanDe: 'Câu đỏ "Thiếu mã loại câu"', xuLy: 'Thêm mã "CH-<mã>" vào đầu câu trong tệp, hoặc chọn "Loại câu" ở bước soát rồi "Đánh dấu hợp lệ".' },
    { vanDe: 'Câu đỏ "Mã loại câu … chưa có trong danh mục"', xuLy: 'Sửa mã theo bảng giải nghĩa (VD TN1, DS, TLN) — không tự đặt mã mới.' },
    { vanDe: 'Câu con bị tách thành câu độc lập', xuLy: 'Câu con phải ghi "CHC-…" (không phải "CH-…") và nằm ngay dưới đoạn dẫn/ngữ liệu của nhóm.' },
    { vanDe: 'Điền khuyết cảnh báo "số ô trống khác số câu con"', xuLy: 'Mỗi ô trống cần đúng một dòng phương án; kiểm tra ô trống viết "(1)______" hoặc "(N**)".' },
    ...VAN_DE_CHUNG,
  ],
  loaiCauHoTro: [
    LOAI_CAU.TracNghiem1DapAn,
    LOAI_CAU.TracNghiemNhieuDapAn,
    LOAI_CAU.DungSai,
    LOAI_CAU.DungSai4Y,
    LOAI_CAU.TraLoiNgan,
    LOAI_CAU.DienKhuyet,
    LOAI_CAU.TuLuan,
    LOAI_CAU.CauChum,
    LOAI_CAU.GhepDoi,
    LOAI_CAU.SapXep,
  ],
  viDu: [
    'CH-TN1 Giá trị của biểu thức √49 + √16 bằng',
    'A. 9⇥B. 11⇥C. 13⇥D. 65',
    'Đáp án: B',
    'CH-NHOM ##Đọc đoạn văn sau và trả lời các câu N**+1 – N**+2.##',
    'Một cửa hàng nhập về 120 quyển vở…',
    'CHC-TN1 Ngày thứ nhất cửa hàng bán được bao nhiêu quyển vở?',
    'A. 25⇥B. 30⇥C. 40⇥D. 45',
    'Đáp án: B',
    'CHC-TLN Sau hai ngày, cửa hàng còn lại bao nhiêu quyển vở?',
    'Đáp án: 50',
  ],
};

const MAU_TN_THPT: MoTaMauImport = {
  ma: 'tn-thpt',
  ten: 'Mẫu thi TN THPT',
  tomTat:
    'Theo cấu trúc đề thi tốt nghiệp THPT: PHẦN I trắc nghiệm nhiều phương án, PHẦN II đúng/sai, PHẦN III trả lời ngắn (và phần tự luận nếu có); tiền tố đầu câu gán sẵn chủ đề, tiểu mục, cấp độ tư duy, năng lực, khả năng đảo.',
  tienTo:
    '"<Chủ đề>.<Tiểu mục>_<Cấp độ tư duy>_<Thành phần năng lực>_<Khả năng đảo>" rồi một dấu cách, sau đó đến "Câu N." (không bắt buộc) — VD "1.1_2_3_1 Câu 1. …". Có thể thêm "_" hoặc "." cuối tiền tố, có thể bọc trong [ ].',
  giaiNghiaTienTo: [
    { thanhPhan: 'Chủ đề', yNghia: 'Số thứ tự chủ đề trong danh mục của Môn – Khối đã chọn (bắt đầu từ 1)' },
    { thanhPhan: 'Tiểu mục', yNghia: 'Số thứ tự tiểu mục trong chủ đề đó (bắt đầu từ 1)' },
    { thanhPhan: 'Cấp độ tư duy', yNghia: '1 = Nhận biết · 2 = Thông hiểu · 3 = Vận dụng' },
    { thanhPhan: 'Thành phần năng lực', yNghia: 'Số thứ tự TPNL trong danh mục của môn; nhiều TPNL nối bằng "+" (VD 1+3)' },
    { thanhPhan: 'Khả năng đảo', yNghia: '1 = Đảo lệnh hỏi & đáp án · 2 = Chỉ đảo lệnh hỏi · 3 = Chỉ đảo đáp án · 4 = Không đảo' },
  ],
  cauHoTro: [
    'PHẦN I — trắc nghiệm nhiều phương án lựa chọn, 1 đáp án đúng (A–D)',
    'PHẦN II — trắc nghiệm đúng/sai, mỗi câu 4 ý a) b) c) d)',
    'PHẦN III — trắc nghiệm trả lời ngắn (đáp án tối đa 4 ký tự)',
    'Phần tự luận (nếu có) — kèm hướng dẫn chấm',
    'Nhóm câu dùng chung ngữ liệu (VD bài đọc Tiếng Anh "Read the passage … from 18 to 22"): mỗi câu con có tiền tố riêng',
  ],
  cauKhongHoTro: [
    'Câu thiếu tiền tố phân loại hoặc tiền tố sai cú pháp; cấp độ tư duy ngoài 1–3, khả năng đảo ngoài 1–4',
    'Trắc nghiệm nhiều đáp án đúng, Đúng/Sai một nhận định, Điền khuyết (đục lỗ), Ghép đôi, Sắp xếp',
    'Câu ghi mã "CH-…" (dùng mẫu Khảo thí số)',
  ],
  dinhDangLoaiCau: [
    { loaiCau: LOAI_CAU.TracNghiem1DapAn, ten: 'PHẦN I — Trắc nghiệm 1 đáp án', trinhBay: 'Tiền tố + "Câu N." + nội dung + phương án A–D.', dapAn: DA_TRAC_NGHIEM },
    { loaiCau: LOAI_CAU.DungSai4Y, ten: 'PHẦN II — Đúng/Sai 4 ý', trinhBay: 'Tiền tố + "Câu N." + nội dung chung + 4 ý a) b) c) d).', dapAn: DA_DUNG_SAI_4Y },
    { loaiCau: LOAI_CAU.TraLoiNgan, ten: 'PHẦN III — Trả lời ngắn', trinhBay: 'Tiền tố + "Câu N." + nội dung câu hỏi.', dapAn: DA_TRA_LOI_NGAN },
    { loaiCau: LOAI_CAU.TuLuan, ten: 'Tự luận', trinhBay: 'Tiền tố + "Câu N." + nội dung, dưới tiêu đề phần có chữ "tự luận".', dapAn: DA_TU_LUAN },
    { loaiCau: LOAI_CAU.CauChum, ten: 'Nhóm câu dùng chung ngữ liệu', trinhBay: 'Lời dẫn "Đọc/Cho … từ câu 18 đến câu 22" + đoạn văn, rồi các câu có tiền tố.', dapAn: 'Mỗi câu con bóc tách đáp án theo loại của PHẦN chứa nó.' },
  ],
  xacDinhLoaiCau: [
    'Theo tiêu đề phần chứa câu: tiêu đề có "đúng sai" → Đúng/Sai 4 ý; có "trả lời ngắn" → Trả lời ngắn; có "tự luận" → Tự luận; có "nhiều phương án"/"lựa chọn" → Trắc nghiệm 1 đáp án.',
    'Tiêu đề không có các cụm từ trên: PHẦN I → Trắc nghiệm, PHẦN II → Đúng/Sai, PHẦN III → Trả lời ngắn, PHẦN IV → Tự luận.',
    'Không có tiêu đề PHẦN: hệ thống tự nhận diện theo nội dung (có A. B. C. D. → trắc nghiệm, có a) b) c) d) → đúng/sai, "Đáp án: <số>" → trả lời ngắn).',
  ],
  bocTachCauCon: [
    'Không có câu hỏi con theo mã; nhóm câu dùng chung ngữ liệu mở bằng lời dẫn "Đọc/Cho/Dựa vào … câu 18 đến câu 22" (hoặc câu dẫn "##…##").',
    'Các câu có số thứ tự nằm trong khoảng của lời dẫn là câu con; mỗi câu con giữ tiền tố phân loại riêng, loại câu theo PHẦN chứa nhóm.',
    'Phân loại của cả nhóm (chủ đề, tiểu mục, cấp độ tư duy, năng lực, khả năng đảo) lấy theo câu con đầu tiên — chỉnh lại ở bước soát nếu cần.',
  ],
  cacBuoc: [
    ...BUOC_DOC_TEP,
    'Ghi nhận tiêu đề "PHẦN …" để xác định loại câu cho các câu bên dưới.',
    'Chia khối câu tại mỗi đoạn bắt đầu bằng tiền tố phân loại; đọc tiền tố thành chủ đề, tiểu mục, cấp độ tư duy, năng lực, khả năng đảo rồi cắt khỏi nội dung.',
    BUOC_TACH_NOI_DUNG,
    'Đối chiếu số thứ tự chủ đề/tiểu mục/năng lực với danh mục của Môn – Khối đã chọn để gán phân loại cho câu; số không có trong danh mục thì câu báo vàng để chọn lại.',
    BUOC_SOAT,
  ],
  xuLyVanDe: [
    { vanDe: 'Câu đỏ "Thiếu tiền tố phân loại"', xuLy: 'Tiền tố phải đúng dạng "1.1_2_3_1" (số, dấu chấm giữa chủ đề và tiểu mục, gạch dưới giữa các phần) và có dấu cách phía sau; đặt ở ĐẦU đoạn của câu.' },
    { vanDe: 'Câu vàng "chủ đề/tiểu mục/năng lực không có trong danh mục"', xuLy: 'Số thứ tự tính theo danh mục của Môn – Khối đã chọn ở bước 1 (xem bảng tra cứu cuối hướng dẫn); kiểm tra đã chọn đúng Môn – Khối, hoặc chọn lại phân loại ở bước soát.' },
    { vanDe: 'Loại câu không đúng phần', xuLy: 'Kiểm tra tiêu đề phần viết thành một đoạn riêng bắt đầu bằng "PHẦN I/II/III…" và đứng trước các câu của phần đó.' },
    { vanDe: 'Câu đỏ "loại câu không thuộc mẫu TN THPT"', xuLy: 'Mẫu chỉ nhận trắc nghiệm 1 đáp án, đúng/sai 4 ý, trả lời ngắn, tự luận và nhóm câu dùng chung ngữ liệu — câu loại khác dùng mẫu Khảo thí số.' },
    ...VAN_DE_CHUNG,
  ],
  loaiCauHoTro: [LOAI_CAU.TracNghiem1DapAn, LOAI_CAU.DungSai4Y, LOAI_CAU.TraLoiNgan, LOAI_CAU.TuLuan, LOAI_CAU.CauChum],
  viDu: [
    'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn',
    '1.1_1_1_1 Câu 1. Giá trị của biểu thức √49 + √16 bằng',
    'A. 9⇥B. 11⇥C. 13⇥D. 65',
    'Đáp án: B',
    'PHẦN II. Câu trắc nghiệm đúng sai',
    '2.1_2_1+2_3 Câu 2. Cho hàm số y = x² − 4x + 3.',
    'a) Đồ thị cắt trục tung tại điểm (0; 3). Đáp án: Đúng',
    'b) … c) … d) …',
    'PHẦN III. Câu trắc nghiệm trả lời ngắn',
    '2.2_3_2_4 Câu 3. Diện tích hình chữ nhật 5 cm × 2,5 cm bằng bao nhiêu cm²?',
    'Đáp án: 12,5',
  ],
};

const MAU_MAC_DINH: MoTaMauImport = {
  ma: 'mac-dinh',
  ten: 'Mẫu mặc định',
  tomTat: 'Chỉ cho câu hỏi đơn giản đánh số "Câu N." — không có câu hỏi con; loại câu tự nhận diện theo nội dung, phân loại chọn ở bước soát.',
  tienTo: '"Câu N." (hoặc "Câu N:", "Câu N)") ở đầu câu — VD "Câu 1. …".',
  cauHoTro: [
    'Trắc nghiệm 1 đáp án và nhiều đáp án (A–D)',
    'Đúng/Sai nhiều ý a) b) c) d) và Đúng/Sai một nhận định',
    'Trả lời ngắn / điền số',
    'Tự luận',
  ],
  cauKhongHoTro: [
    'Câu hỏi nhóm, bài đọc/ngữ liệu dùng chung, câu hỏi con "Câu N.k."',
    'Điền khuyết (đục lỗ), Ghép đôi, Sắp xếp',
    'Câu ghi mã "CH-…" hoặc tiền tố phân loại (dùng mẫu Khảo thí số / TN THPT)',
    'Câu không bắt đầu bằng "Câu N."',
  ],
  dinhDangLoaiCau: [
    { loaiCau: LOAI_CAU.TracNghiem1DapAn, ten: 'Trắc nghiệm', trinhBay: '"Câu N." + nội dung + phương án A–D.', dapAn: `${DA_TRAC_NGHIEM} Nhiều đáp án đúng: "Đáp án: A, C".` },
    { loaiCau: LOAI_CAU.DungSai4Y, ten: 'Đúng/Sai', trinhBay: '"Câu N." + nội dung + các ý a) b) c) d); một nhận định thì không có ý.', dapAn: `${DA_DUNG_SAI_4Y} Một nhận định: "Đáp án: Đúng"/"Đáp án: Sai".` },
    { loaiCau: LOAI_CAU.TraLoiNgan, ten: 'Trả lời ngắn', trinhBay: '"Câu N." + nội dung, không có phương án.', dapAn: DA_TRA_LOI_NGAN },
    { loaiCau: LOAI_CAU.TuLuan, ten: 'Tự luận', trinhBay: '"Câu N." + nội dung, không có phương án và không có dòng "Đáp án:".', dapAn: DA_TU_LUAN },
  ],
  xacDinhLoaiCau: [
    'Tự nhận diện theo nội dung: có từ 2 phương án A. B. … → trắc nghiệm ("Đáp án" nhiều chữ cái → nhiều đáp án); có các ý a) b) c) d) → Đúng/Sai nhiều ý; "Đáp án: Đúng/Sai" không có ý → Đúng/Sai một nhận định; "Đáp án: <giá trị ngắn>" → Trả lời ngắn; có "Lời giải/Hướng dẫn chấm" hoặc nằm dưới phần "tự luận" → Tự luận.',
    'Không phân biệt được: câu báo đỏ, chọn "Loại câu" ở bước soát.',
  ],
  bocTachCauCon: ['Không hỗ trợ câu con — câu có câu con/ngữ liệu chung bị báo lỗi, dùng mẫu Khảo thí số hoặc TN THPT.'],
  cacBuoc: [
    ...BUOC_DOC_TEP,
    'Chia khối câu tại mỗi đoạn bắt đầu bằng "Câu N.".',
    'Tự nhận diện loại câu theo nội dung.',
    BUOC_TACH_NOI_DUNG,
    BUOC_SOAT,
  ],
  xuLyVanDe: [
    { vanDe: 'Câu đỏ "Chưa phân biệt được loại câu"', xuLy: 'Bổ sung phương án/"Đáp án: …" đúng quy ước, hoặc chọn "Loại câu" ở bước soát rồi "Đánh dấu hợp lệ".' },
    { vanDe: 'Câu đỏ "câu hỏi nhóm không thuộc mẫu mặc định"', xuLy: 'Tệp có bài đọc/ngữ liệu dùng chung — chọn định dạng Khảo thí số hoặc TN THPT.' },
    { vanDe: 'Trắc nghiệm bị nhận thành trả lời ngắn/tự luận', xuLy: 'Phương án phải có ít nhất 2 mốc "A." "B." rõ ràng (chữ in hoa + dấu chấm).' },
    ...VAN_DE_CHUNG,
  ],
  loaiCauHoTro: [
    LOAI_CAU.TracNghiem1DapAn,
    LOAI_CAU.TracNghiemNhieuDapAn,
    LOAI_CAU.DungSai,
    LOAI_CAU.DungSai4Y,
    LOAI_CAU.TraLoiNgan,
    LOAI_CAU.TuLuan,
  ],
  viDu: [
    'Câu 1. Hình chóp tứ giác đều có bao nhiêu mặt bên?',
    'A. 3⇥B. 4⇥C. 5⇥D. 6',
    'Đáp án: B',
    'Câu 2. Một hình chữ nhật có chiều dài 5 cm, chiều rộng 2,5 cm. Tính diện tích.',
    'Đáp án: 12,5',
    'Câu 3. Giải phương trình x² − 5x + 6 = 0.',
    'Hướng dẫn chấm: Δ = 1; x = 2 hoặc x = 3.',
  ],
};

/** Danh sách mẫu cố định — thứ tự hiển thị ở ô chọn định dạng */
export const MAU_IMPORT: readonly MoTaMauImport[] = [MAU_KHAO_THI_SO, MAU_TN_THPT, MAU_MAC_DINH];

export const MAU_IMPORT_MAC_DINH: MaMauImport = 'khao-thi-so';

export const layMauImport = (ma: MaMauImport): MoTaMauImport =>
  MAU_IMPORT.find((m) => m.ma === ma) ?? MAU_KHAO_THI_SO;
