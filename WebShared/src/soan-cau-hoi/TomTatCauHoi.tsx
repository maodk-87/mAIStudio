/** Tóm tắt nội dung câu hỏi trong danh sách — hiển thị được công thức toán (MathType/LaTeX) */
import { NoiDungOEditor as NoiDungHtml } from '../oeditor';
import { tomTatNoiDung, tomTatNoiDungHtml } from './nhan';
import './tom-tat-cau-hoi.scss';

interface TomTatCauHoiProps {
  html: string;
  doDai?: number;
  className?: string;
  /** Cột "Nội dung tóm tắt" của bảng: hiện ĐỦ 100% chữ + công thức, tự xuống dòng trong
   *  độ rộng cột, không hiện ảnh/tệp (bỏ qua doDai) */
  dayDu?: boolean;
}

export default function TomTatCauHoi({ html, doDai = 120, className, dayDu }: TomTatCauHoiProps) {
  if (dayDu) {
    return (
      <NoiDungHtml
        className={`tom-tat-cau-hoi--day-du ${className ?? ''}`}
        html={tomTatNoiDungHtml(html, Infinity)}
      />
    );
  }
  return (
    <span title={tomTatNoiDung(html, 300)}>
      <NoiDungHtml inline className={className} html={tomTatNoiDungHtml(html, doDai)} />
    </span>
  );
}
