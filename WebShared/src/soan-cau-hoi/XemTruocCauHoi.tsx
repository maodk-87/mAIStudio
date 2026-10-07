/** Xem trước câu hỏi đúng như học sinh nhìn thấy — đổi theme theo cấp học */
import { CheckCircleOutlined } from '@ant-design/icons';
import { Input, Segmented } from 'antd';
import { useEffect, useState } from 'react';
import { NoiDungOEditor as NoiDungHtml } from '../oeditor';
import { LoaiCauHoi } from './hang';
import { NutLoaBanDoc, type BanDocDeBai } from '../ban-doc-de-bai';
import './xem-truoc-cau-hoi.scss';

export interface PhuongAnXemTruoc {
  id: string;
  noiDung: string;
  dung: boolean;
}

export interface CauConXemTruoc {
  id: string;
  noiDung: string;
  loaiCau: LoaiCauHoi;
  phuongAn: PhuongAnXemTruoc[];
}

/** Dữ liệu tối thiểu để render 1 câu hỏi như học sinh thấy */
export interface CauHoiXemTruoc {
  noiDung: string;
  loaiCau: LoaiCauHoi;
  phuongAn: PhuongAnXemTruoc[];
  dapAnGoiY?: string;
  diemGoiY?: number;
  kieuHienThi?: 'tren-duoi' | 'trai-40' | 'trai-50' | 'trai-60';
  /** Ngữ liệu chung (câu chùm) */
  nguLieu?: string;
  cauCon?: CauConXemTruoc[];
  /** Bản đọc đề bài (.mp3, Khối 1–3) — hiện icon loa */
  banDocDeBai?: BanDocDeBai;
}

export type ThemeXemTruoc = 'tih' | 'thcs' | 'thpt';

/** Suy theme xem trước từ khối của câu hỏi (khối 1–5 → Tiểu học, 6–9 → THCS, 10–12 → THPT) */
export const themeTheoKhoi = (khoiId?: string): ThemeXemTruoc => {
  const so = Number(khoiId?.replace('khoi-', ''));
  if (!so) return 'thcs';
  if (so <= 5) return 'tih';
  if (so <= 9) return 'thcs';
  return 'thpt';
};

interface XemTruocCauHoiProps {
  cauHoi: CauHoiXemTruoc;
  /** Đánh dấu đáp án đúng màu xanh (chế độ GV/duyệt) */
  hienDapAn?: boolean;
  /** Ẩn thanh chọn theme (khi cha tự quản lý) */
  anChonTheme?: boolean;
  /** Khối của câu hỏi — tự hiển thị theme theo cấp học tương ứng */
  khoiId?: string;
  theme?: ThemeXemTruoc;
  onDoiTheme?: (theme: ThemeXemTruoc) => void;
}

const nhanKyTu = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function XemTruocCauHoi({
  cauHoi,
  hienDapAn,
  anChonTheme,
  khoiId,
  theme,
  onDoiTheme,
}: XemTruocCauHoiProps) {
  const [themeNoiBo, setThemeNoiBo] = useState<ThemeXemTruoc>(themeTheoKhoi(khoiId));
  const themeHien = theme ?? themeNoiBo;

  // Đổi câu hỏi (khối khác) → tự chuyển theme theo cấp học của khối
  useEffect(() => {
    if (khoiId) setThemeNoiBo(themeTheoKhoi(khoiId));
  }, [khoiId]);

  const laDangChia =
    (cauHoi.loaiCau === LoaiCauHoi.CauChum || cauHoi.loaiCau === LoaiCauHoi.TuLuan) &&
    cauHoi.kieuHienThi &&
    cauHoi.kieuHienThi !== 'tren-duoi';

  const renderPhuongAn = (
    danhSach: PhuongAnXemTruoc[],
    loaiCau: LoaiCauHoi,
  ) => {
    if (loaiCau === LoaiCauHoi.DungSai4Y) {
      return (
        <div className="xtch__ds4y">
          {danhSach.map((pa, i) => (
            <div key={pa.id} className="xtch__ds4y-hang">
              <span className="xtch__ds4y-y">
                {String.fromCharCode(97 + i)}) <NoiDungHtml inline html={pa.noiDung} />
              </span>
              <span className="xtch__ds4y-chon">
                <span className={hienDapAn && pa.dung ? 'dung' : ''}>Đúng</span>
                <span className={hienDapAn && !pa.dung ? 'dung' : ''}>Sai</span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    if (loaiCau === LoaiCauHoi.TuLuan || loaiCau === LoaiCauHoi.TraLoiNgan) {
      return (
        <Input.TextArea
          rows={loaiCau === LoaiCauHoi.TuLuan ? 5 : 2}
          placeholder="Học sinh nhập câu trả lời tại đây…"
          readOnly
        />
      );
    }
    if (!danhSach.length) return null;
    return (
      <div className="xtch__phuong-an">
        {danhSach.map((pa, i) => (
          <div
            key={pa.id}
            className={`xtch__pa ${hienDapAn && pa.dung ? 'xtch__pa--dung' : ''}`}
          >
            <span className="xtch__pa-ky-tu">{nhanKyTu[i] ?? i + 1}</span>
            <NoiDungHtml inline className="xtch__pa-noi-dung" html={pa.noiDung} />
            {hienDapAn && pa.dung && (
              <CheckCircleOutlined className="xtch__pa-icon-dung" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const phanTraLoi = (
    <>
      {cauHoi.loaiCau === LoaiCauHoi.CauChum ? (
        <div className="xtch__cau-con">
          {(cauHoi.cauCon ?? []).map((cc, i) => (
            <div key={cc.id} className="xtch__cau-con-item">
              <div className="xtch__cau-con-ten">Câu {i + 1}.</div>
              <NoiDungHtml html={cc.noiDung} />
              {renderPhuongAn(cc.phuongAn, cc.loaiCau)}
            </div>
          ))}
          {!cauHoi.cauCon?.length && (
            <div className="xtch__trong">Chưa có câu hỏi con</div>
          )}
        </div>
      ) : (
        renderPhuongAn(cauHoi.phuongAn, cauHoi.loaiCau)
      )}
      {hienDapAn && cauHoi.dapAnGoiY && (
        <div className="xtch__goi-y">
          <b>Đáp án gợi ý:</b> <NoiDungHtml inline html={cauHoi.dapAnGoiY} />
        </div>
      )}
    </>
  );

  const noiDungTren = (
    <>
      {cauHoi.banDocDeBai && (
        <div className="xtch__ban-doc">
          <NutLoaBanDoc banDoc={cauHoi.banDocDeBai} nhan="Nghe đề" />
        </div>
      )}
      <NoiDungHtml
        className="xtch__de-bai"
        html={
          cauHoi.loaiCau === LoaiCauHoi.CauChum
            ? cauHoi.nguLieu || cauHoi.noiDung
            : cauHoi.noiDung
        }
      />
    </>
  );

  return (
    <div className={`xtch xtch--${themeHien}`}>
      {!anChonTheme && (
        <div className="xtch__thanh-theme">
          <Segmented
            value={themeHien}
            onChange={(v) => {
              setThemeNoiBo(v as ThemeXemTruoc);
              onDoiTheme?.(v as ThemeXemTruoc);
            }}
            // Câu hỏi thuộc 1 khối → chỉ hiện đúng cấp học của khối đó
            options={[
              { label: 'Tiểu học', value: 'tih' },
              { label: 'THCS', value: 'thcs' },
              { label: 'THPT', value: 'thpt' },
            ].filter((o) => !khoiId || o.value === themeTheoKhoi(khoiId))}
          />
        </div>
      )}
      <div className="xtch__khung">
        {laDangChia ? (
          <div className={`xtch__chia xtch__chia--${cauHoi.kieuHienThi}`}>
            <div className="xtch__chia-trai">
              {noiDungTren}
              {cauHoi.loaiCau === LoaiCauHoi.CauChum && cauHoi.nguLieu && (
                <NoiDungHtml className="xtch__de-bai" html={cauHoi.noiDung} />
              )}
            </div>
            <div className="xtch__chia-phai">{phanTraLoi}</div>
          </div>
        ) : (
          <>
            {noiDungTren}
            {cauHoi.loaiCau === LoaiCauHoi.CauChum && cauHoi.nguLieu && (
              <NoiDungHtml className="xtch__de-bai" html={cauHoi.noiDung} />
            )}
            {phanTraLoi}
          </>
        )}
      </div>
    </div>
  );
}
