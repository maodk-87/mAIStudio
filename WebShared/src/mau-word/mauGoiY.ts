/**
 * TỆP WORD MẪU GỢI Ý — bố cục đề kiểm tra chuẩn (đầu đề 2 cột, dòng thí sinh, nội dung đề, trang đáp án có điều kiện)
 * đã đặt sẵn các trường trộn. Người quản lý tải về, chỉnh phông/lề/logo trong Word rồi tải lên lại làm mẫu của mình.
 */
import { taoWord, type KhoiWord } from '../xuat-tep/coBan';

export const TEN_TEP_MAU_GOI_Y = 'mau-de-goi-y.docx';

export function taoMauWordGoiY(): Promise<Blob> {
  const khoi: KhoiWord[] = [
    {
      loai: 'bang',
      cot: [{ tieuDe: '', rong: 40 }, { tieuDe: '', rong: 60 }],
      dong: [
        [
          {
            doan: [
              { chu: '{{DON_VI_CAP_TREN}}\n', co: 12 },
              { chu: '{{TEN_DON_VI}}', dam: true, co: 12 },
              { chu: '\n\n{{LOAI_BAN}}', dam: true, co: 13 },
              { chu: '\n{{SO_TRANG}}', nghieng: true, co: 12 },
            ],
            canh: 'giua',
          },
          {
            doan: [
              { chu: '{{TIEU_DE_DE}}', dam: true, co: 13 },
              { chu: '\n{{TEN_KY}} – Năm học {{NAM_HOC}}', dam: true, co: 13 },
              { chu: '\nMôn: {{MON_HOC}} – {{KHOI}}', dam: true, co: 13 },
              { chu: '\nThời gian làm bài: {{THOI_GIAN}} phút, không kể thời gian phát đề', nghieng: true, co: 12 },
            ],
            canh: 'giua',
          },
        ],
      ],
      khongVien: true,
      khongDauBang: true,
    },
    {
      loai: 'bang',
      cot: [{ tieuDe: '', rong: 68 }, { tieuDe: '', rong: 32 }],
      dong: [
        [
          {
            doan: [
              { chu: 'Họ, tên thí sinh: ', dam: true },
              { chu: '{{HO_TEN_THI_SINH}}\n' },
              { chu: 'Số báo danh: ', dam: true },
              { chu: '{{SO_BAO_DANH}}   ' },
              { chu: 'Lớp: ', dam: true },
              { chu: '{{LOP}}' },
            ],
          },
          { doan: [{ chu: 'Mã đề: {{MA_DE}}', dam: true, co: 14 }], canh: 'phai' },
        ],
      ],
      khongVien: true,
      khongDauBang: true,
    },
    { loai: 'html', html: '<hr>' },
    { loai: 'doan', noiDung: '{{NOI_DUNG_DE}}' },
    { loai: 'doan', noiDung: '{{#KEM_DAP_AN}}' },
    { loai: 'ngat-trang' },
    { loai: 'tieu-de', noiDung: 'ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM', cap: 1 },
    { loai: 'doan', noiDung: 'Môn: {{MON_HOC}} – {{KHOI}} · Mã đề: {{MA_DE}} · Tổng điểm: {{TONG_DIEM}}', canh: 'giua', nghieng: true },
    { loai: 'doan', noiDung: '{{DAP_AN}}' },
    { loai: 'doan', noiDung: '{{/KEM_DAP_AN}}' },
  ];
  return taoWord(khoi, {
    tieuDe: 'Mẫu Word xuất đề — gợi ý',
    chanTrang: 'Môn {{MON_HOC}} – Mã đề {{MA_DE}} · Mã theo dõi {{MA_THEO_DOI}}',
  });
}
