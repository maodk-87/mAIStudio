import { ArrowLeftOutlined, InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer } from 'antd';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import './box-noi-dung.scss';

export interface BoxNoiDungProps {
  tieuDe: ReactNode;
  /** Dòng mô tả nhỏ hiển thị ngay dưới tiêu đề trong header box */
  moTa?: ReactNode;
  /** Nút Thêm mới / Xuất / Import — nằm BÊN PHẢI dòng header, trước icon ❓
   *  (tên prop giữ nguyên vì lịch sử; tiêu đề luôn ở bên trái) */
  nutTrai?: ReactNode;
  /** Hiện nút "Quay lại" ở BÊN PHẢI header box (sau cụm nutTrai) */
  nutQuayLai?: boolean;
  /** Đường dẫn quay lại cụ thể (mặc định: history back) */
  duongDanQuayLai?: string;
  /** Mục "Hướng dẫn chức năng" trong modal mở từ icon ❓ góc phải (DS-A3) */
  huongDan?: ReactNode;
  /** Mục "Ghi chú" trong modal ❓ — thay cho banner thông tin (Alert info) đầu trang.
   *  Component con cũng có thể góp ghi chú qua <GhiChuTrang>. */
  ghiChu?: ReactNode;
  /** Phần tử thêm bên phải header (trước icon ❓) */
  phanPhai?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Bỏ padding thân box (bảng full-width) */
  khongPadding?: boolean;
}

interface NguCanhGhiChu {
  /** Vùng "Ghi chú" trong modal ❓ — GhiChuTrang portal nội dung vào đây */
  vungGhiChu: HTMLElement | null;
  /** Báo có thêm một ghi chú; trả hàm hủy đăng ký */
  dangKy: () => () => void;
  /** Modal ❓ đang mở — lúc này mỗi GhiChuTrang xét lại mình có đang hiển thị không */
  moModal: boolean;
}

const GhiChuContext = createContext<NguCanhGhiChu | null>(null);

/**
 * Ghi chú ngữ cảnh của trang (nội dung vốn là banner "i"): nằm trong BoxNoiDung thì được đưa vào
 * mục "Ghi chú" của modal ❓; không có BoxNoiDung bao ngoài thì hiển thị Alert info như cũ.
 * Chỉ dùng cho ghi chú cấp trang — cảnh báo theo trạng thái, trong modal/form vẫn dùng Alert.
 * Ghi chú nằm trong phần đang ẩn (tab chưa chọn nhưng antd vẫn giữ DOM) không đưa vào modal.
 */
export function GhiChuTrang({ tieuDe, children }: { tieuDe?: ReactNode; children?: ReactNode }) {
  const nguCanh = useContext(GhiChuContext);
  const moc = useRef<HTMLSpanElement>(null);
  const [dangHien, setDangHien] = useState(true);
  const dangKy = nguCanh?.dangKy;
  const moModal = nguCanh?.moModal;

  // Mốc rỗng đặt tại vị trí cũ của banner: tổ tiên bị display:none thì mốc không có hộp hiển thị
  useLayoutEffect(() => {
    if (moc.current) setDangHien(moc.current.getClientRects().length > 0);
  }, [moModal]);
  useEffect(() => (dangHien ? dangKy?.() : undefined), [dangKy, dangHien]);

  if (!nguCanh) {
    return <Alert type="info" showIcon title={tieuDe} description={children} />;
  }
  return (
    <>
      <span ref={moc} className="box-noi-dung__ghi-chu-moc" aria-hidden />
      {dangHien &&
        nguCanh.vungGhiChu &&
        createPortal(
          <div className="box-noi-dung__ghi-chu-muc">
            {tieuDe && <div className="box-noi-dung__ghi-chu-tieu-de">{tieuDe}</div>}
            {children && <div>{children}</div>}
          </div>,
          nguCanh.vungGhiChu,
        )}
    </>
  );
}

/**
 * Box nội dung chuẩn (DS-E2): nền trắng bo góc, dòng header nền nhạt + đường kẻ phân chia
 * với phần thân. Mọi nội dung của trang (dưới breadcrumb) nằm trong box này.
 */
export default function BoxNoiDung({
  tieuDe,
  moTa,
  nutTrai,
  nutQuayLai,
  duongDanQuayLai,
  huongDan,
  ghiChu,
  phanPhai,
  children,
  className,
  khongPadding,
}: BoxNoiDungProps) {
  const [moHuongDan, setMoHuongDan] = useState(false);
  const [vungGhiChu, setVungGhiChu] = useState<HTMLElement | null>(null);
  const [soGhiChuCon, setSoGhiChuCon] = useState(0);
  const navigate = useNavigate();

  const dangKy = useCallback(() => {
    setSoGhiChuCon((n) => n + 1);
    return () => setSoGhiChuCon((n) => n - 1);
  }, []);
  const nguCanh = useMemo(
    () => ({ vungGhiChu, dangKy, moModal: moHuongDan }),
    [vungGhiChu, dangKy, moHuongDan],
  );

  const coGhiChu = !!ghiChu || soGhiChuCon > 0;
  const coModal = coGhiChu || !!huongDan;

  return (
    <GhiChuContext.Provider value={nguCanh}>
      <div className={`box-noi-dung ${className ?? ''}`}>
        <div className="box-noi-dung__header">
          <div className="box-noi-dung__tieu-de">
            {tieuDe}
            {moTa && <div className="box-noi-dung__mo-ta chu-dien-giai">{moTa}</div>}
          </div>
          <div className="box-noi-dung__nut-trai">
            {nutTrai}
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
          </div>
          <div className="box-noi-dung__phai">
            {phanPhai}
            {coModal && (
              <Button
                type="text"
                className="box-noi-dung__icon-huong-dan"
                aria-label="Ghi chú và hướng dẫn"
                icon={<QuestionCircleOutlined />}
                onClick={() => setMoHuongDan(true)}
              />
            )}
          </div>
        </div>
        <div className={`box-noi-dung__than ${khongPadding ? 'khong-padding' : ''}`}>
          {children}
        </div>
        {/* Khung ❓ trượt bên phải, cao 100% màn hình.
            forceRender: vùng Ghi chú luôn có trong DOM để GhiChuTrang portal vào kể cả khi khung đóng */}
        <Drawer
          title={
            <span className="box-noi-dung__tieu-de-huong-dan">
              <QuestionCircleOutlined />
              <span>Hướng dẫn — {tieuDe}</span>
            </span>
          }
          placement="right"
          open={moHuongDan}
          forceRender
          // Rộng hơn modal mặc định antd (520px) 30%
          size={676}
          onClose={() => setMoHuongDan(false)}
          footer={
            <div className="box-noi-dung__chan-huong-dan">
              <Button onClick={() => setMoHuongDan(false)}>Đóng</Button>
            </div>
          }
        >
          <div className="box-noi-dung__muc-modal" hidden={!coGhiChu}>
            <div className="box-noi-dung__muc-modal-tieu-de">
              <InfoCircleOutlined /> Ghi chú
            </div>
            <div className="box-noi-dung__ghi-chu">
              {ghiChu && <div className="box-noi-dung__ghi-chu-muc">{ghiChu}</div>}
              <div ref={setVungGhiChu} className="box-noi-dung__ghi-chu-vung" />
            </div>
          </div>
          {huongDan && (
            <div className="box-noi-dung__muc-modal">
              <div className="box-noi-dung__muc-modal-tieu-de">
                <QuestionCircleOutlined /> Hướng dẫn chức năng
              </div>
              {huongDan}
            </div>
          )}
        </Drawer>
      </div>
    </GhiChuContext.Provider>
  );
}
