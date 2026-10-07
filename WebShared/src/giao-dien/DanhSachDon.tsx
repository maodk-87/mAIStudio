/**
 * Danh sách đơn giản (thay `List` của antd — antd ≥ 6.6 đánh dấu `List` deprecated, cảnh báo console).
 * Giữ bố cục quen thuộc của `List`: mục có avatar + tiêu đề + mô tả, thao tác bên phải, viền/cỡ nhỏ, phân trang
 * phía máy chủ (dataSource là trang hiện tại, `phanTrang.total` là tổng). Không ảo hóa — dùng cho danh sách ngắn
 * (trang thông báo, xem trước câu, lịch sử); danh sách dài dùng `BangChuan`.
 */
import { Empty, Pagination, Spin, type PaginationProps } from 'antd';
import type { CSSProperties, Key, ReactNode } from 'react';
import './danh-sach-don.scss';

export interface DanhSachDonProps<T> {
  dataSource: readonly T[];
  renderItem: (muc: T, chiSo: number) => ReactNode;
  /** Khóa React cho mỗi mục (mặc định `muc.id` nếu có, không thì chỉ số) */
  rowKey?: (muc: T, chiSo: number) => Key;
  header?: ReactNode;
  bordered?: boolean;
  size?: 'small' | 'default';
  loading?: boolean;
  /** Nội dung khi rỗng (mặc định Empty "Không có dữ liệu") */
  emptyText?: ReactNode;
  /** Phân trang phía máy chủ — `dataSource` là trang hiện tại */
  pagination?: PaginationProps | false;
  style?: CSSProperties;
  className?: string;
}

function khoaMacDinh(muc: unknown, chiSo: number): Key {
  const id = (muc as { id?: unknown } | null)?.id;
  return typeof id === 'string' || typeof id === 'number' ? id : chiSo;
}

function DanhSachDon<T>({
  dataSource,
  renderItem,
  rowKey,
  header,
  bordered,
  size = 'default',
  loading,
  emptyText,
  pagination,
  style,
  className,
}: DanhSachDonProps<T>) {
  const lop = ['danh-sach-don', bordered && 'danh-sach-don--vien', size === 'small' && 'danh-sach-don--nho', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={lop} style={style}>
      <Spin spinning={!!loading}>
        {header && <div className="danh-sach-don__dau">{header}</div>}
        {dataSource.length === 0 ? (
          <div className="danh-sach-don__rong">
            {emptyText ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có dữ liệu" />}
          </div>
        ) : (
          <ul className="danh-sach-don__ds" role="list">
            {dataSource.map((muc, i) => (
              <li key={(rowKey ?? khoaMacDinh)(muc, i)} className="danh-sach-don__li">
                {renderItem(muc, i)}
              </li>
            ))}
          </ul>
        )}
      </Spin>
      {pagination && (pagination.total ?? 0) > 0 && (
        <div className="danh-sach-don__phan-trang">
          <Pagination size="small" {...pagination} />
        </div>
      )}
    </div>
  );
}

export interface MucDanhSachProps {
  children?: ReactNode;
  /** Thao tác bên phải mục */
  actions?: ReactNode[];
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

function Muc({ children, actions, onClick, className, style }: MucDanhSachProps) {
  return (
    <div
      className={['danh-sach-don__muc', onClick && 'danh-sach-don__muc--bam', className].filter(Boolean).join(' ')}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="danh-sach-don__than">{children}</div>
      {actions && actions.length > 0 && <div className="danh-sach-don__thao-tac">{actions}</div>}
    </div>
  );
}

export interface MucMetaProps {
  avatar?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
}

function MucMeta({ avatar, title, description }: MucMetaProps) {
  return (
    <div className="danh-sach-don__meta">
      {avatar && <div className="danh-sach-don__avatar">{avatar}</div>}
      <div className="danh-sach-don__meta-noi-dung">
        {title && <div className="danh-sach-don__tieu-de">{title}</div>}
        {description && <div className="danh-sach-don__mo-ta">{description}</div>}
      </div>
    </div>
  );
}

DanhSachDon.Muc = Muc;
DanhSachDon.MucMeta = MucMeta;

export default DanhSachDon;
