/**
 * Nội dung modal hướng dẫn ❓ của màn nhập câu hỏi / nhập đề từ Word theo ĐỊNH DẠNG đang chọn — lấy từ mô tả cố định
 * `MAU_IMPORT` (@web-shared/oimportword): câu hỗ trợ / không hỗ trợ, định dạng theo loại câu, cách bóc tách đáp án,
 * câu con, trình tự bóc tách và cách xử lý vấn đề thường gặp. Mẫu TN THPT kèm bảng tra cứu số thứ tự
 * chủ đề – tiểu mục – thành phần năng lực của Môn – Khối đang chọn.
 */
import { layMauImport, type MaMauImport } from '../oimportword';
import './huong-dan-mau-import.scss';

export interface BangTraCuuTnThpt {
  chuDe: { ten: string; tieuMuc: string[] }[];
  tpnl: string[];
}

export interface HuongDanMauImportProps {
  mau: MaMauImport;
  /** Mẫu TN THPT: danh mục của Môn – Khối đang chọn; bỏ trống = chưa chọn Môn – Khối */
  bangTraCuu?: BangTraCuuTnThpt;
  /** false = không hiện bảng tra cứu (màn nhập đề: câu riêng của đề không lưu chủ đề/tiểu mục/TPNL) */
  coTraCuu?: boolean;
}

export default function HuongDanMauImport({ mau, bangTraCuu, coTraCuu = true }: HuongDanMauImportProps) {
  const m = layMauImport(mau);
  return (
    <div className="huong-dan-mau">
      <h4>Định dạng: {m.ten}</h4>
      <p>{m.tomTat}</p>

      <h4>Đầu mỗi câu</h4>
      <p>{m.tienTo}</p>
      {m.giaiNghiaTienTo && (
        <table className="huong-dan-mau__bang">
          <thead>
            <tr>
              <th style={{ width: 150 }}>Thành phần</th>
              <th>Ý nghĩa</th>
            </tr>
          </thead>
          <tbody>
            {m.giaiNghiaTienTo.map((g) => (
              <tr key={g.thanhPhan}>
                <td>
                  <b>{g.thanhPhan}</b>
                </td>
                <td>{g.yNghia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h4>Các câu hỗ trợ</h4>
      <ul>
        {m.cauHoTro.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <h4>Các câu không hỗ trợ</h4>
      <ul className="huong-dan-mau__khong">
        {m.cauKhongHoTro.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <h4>Định dạng hỗ trợ theo loại câu — cách bóc tách đáp án</h4>
      <table className="huong-dan-mau__bang">
        <thead>
          <tr>
            <th style={{ width: 210 }}>Loại câu · cách trình bày</th>
            <th>Bóc tách phương án / đáp án</th>
          </tr>
        </thead>
        <tbody>
          {m.dinhDangLoaiCau.map((l) => (
            <tr key={l.ten}>
              <td>
                <b>{l.ten}</b>
                <div className="huong-dan-mau__phu">{l.trinhBay}</div>
              </td>
              <td>{l.dapAn}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>Xác định loại câu</h4>
      <ul>
        {m.xacDinhLoaiCau.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <h4>Cách bóc tách câu con</h4>
      <ul>
        {m.bocTachCauCon.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>

      <h4>Cách thức bóc tách dữ liệu từ tệp Word</h4>
      <ol>
        {m.cacBuoc.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>

      <h4>Xử lý các vấn đề thường gặp</h4>
      <table className="huong-dan-mau__bang">
        <thead>
          <tr>
            <th style={{ width: 210 }}>Vấn đề</th>
            <th>Cách xử lý</th>
          </tr>
        </thead>
        <tbody>
          {m.xuLyVanDe.map((v) => (
            <tr key={v.vanDe}>
              <td>
                <b>{v.vanDe}</b>
              </td>
              <td>{v.xuLy}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>Ví dụ trình bày</h4>
      <pre className="huong-dan-mau__vi-du">{m.viDu.join('\n')}</pre>

      {mau === 'tn-thpt' && coTraCuu && (
        <>
          <h4>Bảng tra cứu số thứ tự (Môn – Khối đang chọn)</h4>
          {bangTraCuu && (bangTraCuu.chuDe.length || bangTraCuu.tpnl.length) ? (
            <div className="huong-dan-mau__tra-cuu">
              <div>
                <b>Chủ đề . Tiểu mục</b>
                {bangTraCuu.chuDe.map((cd, i) => (
                  <div key={cd.ten} className="huong-dan-mau__muc">
                    <div>
                      <code>{i + 1}</code> {cd.ten}
                    </div>
                    {cd.tieuMuc.map((tm, j) => (
                      <div key={tm} className="huong-dan-mau__muc-con">
                        <code>
                          {i + 1}.{j + 1}
                        </code>{' '}
                        {tm}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div>
                <b>Thành phần năng lực</b>
                {bangTraCuu.tpnl.map((t, i) => (
                  <div key={t} className="huong-dan-mau__muc">
                    <code>{i + 1}</code> {t}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="huong-dan-mau__phu">Chọn Môn và Khối ở bước 1 để xem số thứ tự chủ đề, tiểu mục và thành phần năng lực.</p>
          )}
        </>
      )}
    </div>
  );
}
