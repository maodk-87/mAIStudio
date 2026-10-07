import { ArrowLeftOutlined } from '@ant-design/icons';
import { Breadcrumb, Button, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import './page-header.scss';

export interface PageHeaderProps {
  /** Không truyền → chỉ hiển thị breadcrumb (tiêu đề nằm ở box nội dung bên dưới — cách chuẩn) */
  tieuDe?: ReactNode;
  /** Breadcrumb: [{nhan, duongDan?}] */
  breadcrumb?: { nhan: string; duongDan?: string }[];
  /** Hiện nút Quay lại (giữ nguyên trạng thái màn trước — DS-H1) */
  nutQuayLai?: boolean;
  /** Đường dẫn quay lại cụ thể (mặc định: history back) */
  duongDanQuayLai?: string;
  /** Nút hành động góc phải */
  hanhDong?: ReactNode;
  moTa?: ReactNode;
}

/**
 * Dòng đầu trang: breadcrumb. Tiêu đề + nút hành động nên đặt ở header của BoxNoiDung
 * bên dưới (DS-E1); các prop tieuDe/hanhDong chỉ còn cho trang chưa chuyển.
 */
export default function PageHeader({
  tieuDe,
  breadcrumb,
  nutQuayLai,
  duongDanQuayLai,
  hanhDong,
  moTa,
}: PageHeaderProps) {
  const navigate = useNavigate();

  // Tránh lặp tiêu đề: bỏ mục breadcrumb cuối nếu trùng đúng tiêu đề trang
  const breadcrumbHienThi =
    typeof tieuDe === 'string' && breadcrumb?.length
      ? breadcrumb.filter((b, i) => !(i === breadcrumb.length - 1 && b.nhan === tieuDe))
      : breadcrumb;

  return (
    <div className="page-header">
      {!!breadcrumbHienThi?.length && (
        <Breadcrumb
          className="page-header__breadcrumb"
          items={breadcrumbHienThi.map((b) => ({
            title: b.duongDan ? <a onClick={() => navigate(b.duongDan!)}>{b.nhan}</a> : b.nhan,
          }))}
        />
      )}
      {(tieuDe || nutQuayLai || hanhDong) && (
        <div className="page-header__dong-chinh">
          <Space align="center">
            {nutQuayLai && (
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() =>
                  duongDanQuayLai ? navigate(duongDanQuayLai) : navigate(-1)
                }
              >
                Quay lại
              </Button>
            )}
            {tieuDe && <h1 className="page-header__tieu-de">{tieuDe}</h1>}
          </Space>
          <Space wrap>{hanhDong}</Space>
        </div>
      )}
      {moTa && <div className="chu-dien-giai">{moTa}</div>}
    </div>
  );
}
