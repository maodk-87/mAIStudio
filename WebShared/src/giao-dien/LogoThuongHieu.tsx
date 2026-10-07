import type { ReactNode } from 'react';
import { thuongHieu } from './thuongHieu';
import './logo-thuong-hieu.scss';

interface LogoThuongHieuProps {
  /** Dòng phụ dưới tên sản phẩm (tên phân hệ/đơn vị). Không truyền → hiện tên miền */
  phuDe?: ReactNode;
  /** Đặt trên nền tối (header xanh đậm) → chữ trắng */
  nenToi?: boolean;
  /** Cỡ: header (mặc định) hoặc lon (trang đăng nhập) */
  co?: 'header' | 'lon';
  className?: string;
}

/** Logo + tên KHẢO THÍ SỐ — dùng ở header mọi web và trang đăng nhập */
export default function LogoThuongHieu({ phuDe, nenToi, co = 'header', className }: LogoThuongHieuProps) {
  return (
    <div
      className={`logo-kts logo-kts--${co} ${nenToi ? 'logo-kts--nen-toi' : ''} ${className ?? ''}`}
    >
      <img className="logo-kts__anh" src={thuongHieu.logo} alt={thuongHieu.ten} />
      <div className="logo-kts__chu">
        <div className="logo-kts__ten">{thuongHieu.ten}</div>
        <div className="logo-kts__phu-de">{phuDe ?? thuongHieu.tenMien}</div>
      </div>
    </div>
  );
}
