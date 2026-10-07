/**
 * TRÌNH XEM TÀI LIỆU TRỰC TUYẾN — dùng chung toàn hệ thống (docs/11-trinh-xem-tai-lieu.md).
 *
 * Hỗ trợ: Word (.docx), PowerPoint (.pptx), PDF, văn bản/mã nguồn, ảnh, video.
 * Excel và định dạng Office cũ (.doc/.ppt/.xls) chờ máy chủ chuyển đổi (P2) — hiện
 * thông báo rõ + nút Tải về, không bao giờ mất nội dung.
 *
 * Nguồn tài liệu:
 * - `maTep` → Dịch vụ Tệp (services/tep — hiện là API giả lập): poll trạng thái
 *   chuẩn bị bản xem; máy chủ trả bản PDF (P2) thì hiển thị bằng trình xem PDF;
 * - `src` (data URL/URL) → dùng trực tiếp; cũng là dự phòng khi không tìm thấy maTep.
 *
 * Đặt trong khung có chiều cao xác định (component chiếm 100% khung).
 */
import {
  AppstoreOutlined,
  BorderOutlined,
  ColumnWidthOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  FundProjectionScreenOutlined,
  LeftOutlined,
  RightOutlined,
  VideoCameraOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { Button, Spin, Tag, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  layBanXemTep,
  layTepGoc,
  layThongTinTep,
  type DinhDangBanXem,
} from '../dich-vu-tep';
import KhungPowerPoint, { type ThongTinPowerPoint } from './KhungPowerPoint';
import KhungWord, { type ThongTinWord } from './KhungWord';
import {
  hienThiDuocTrenTrinhDuyet,
  layDuoiTep,
  nhanKieuTaiLieu,
  phanLoaiTaiLieu,
  type KieuTaiLieu,
} from './phanLoaiTaiLieu';
import './trinh-xem-tai-lieu.scss';

export interface NguonTaiLieu {
  /** Mã tệp trên Dịch vụ Tệp */
  maTep?: string;
  /** data URL / URL — dùng khi không có maTep hoặc maTep không còn */
  src?: string;
  ten: string;
  mime?: string;
}

interface TrinhXemTaiLieuProps {
  nguon: NguonTaiLieu;
  className?: string;
  style?: React.CSSProperties;
}

type TrangThaiXem =
  | { loai: 'dang-tai' }
  | { loai: 'dang-chuyen-doi' }
  | { loai: 'san-sang'; noiDung: Blob; kieu: KieuTaiLieu }
  | { loai: 'loi'; thongBao: string };

const BIEU_TUONG: Record<KieuTaiLieu, ReactNode> = {
  word: <FileWordOutlined className="txtl__bt txtl__bt--word" />,
  powerpoint: <FilePptOutlined className="txtl__bt txtl__bt--ppt" />,
  excel: <FileExcelOutlined className="txtl__bt txtl__bt--excel" />,
  pdf: <FilePdfOutlined className="txtl__bt txtl__bt--pdf" />,
  text: <FileTextOutlined className="txtl__bt" />,
  anh: <FileImageOutlined className="txtl__bt" />,
  video: <VideoCameraOutlined className="txtl__bt" />,
  khac: <FileOutlined className="txtl__bt" />,
};

const CAC_MUC_TI_LE = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
const THOI_GIAN_CHO_TOI_DA_MS = 120_000;

const thongBaoKhongXemDuoc = (ten: string, kieu: KieuTaiLieu): string => {
  const duoi = layDuoiTep(ten);
  if (kieu === 'excel') {
    return 'Xem trực tiếp bảng tính Excel sẽ khả dụng khi hệ thống có máy chủ chuyển đổi tài liệu. Hiện tại hãy dùng nút Tải về.';
  }
  if (duoi === 'doc' || duoi === 'ppt') {
    return 'Định dạng Office cũ (.doc/.ppt) cần máy chủ chuyển đổi để xem. Hãy tải về, hoặc lưu lại tệp dạng .docx/.pptx.';
  }
  return 'Định dạng tệp này chưa hỗ trợ xem trực tiếp — dùng nút Tải về.';
};

const layBlobTuSrc = async (src: string): Promise<Blob> => (await fetch(src)).blob();

export default function TrinhXemTaiLieu({ nguon, className, style }: TrinhXemTaiLieuProps) {
  const gocRef = useRef<HTMLDivElement>(null);
  const thanRef = useRef<HTMLDivElement>(null);
  const [trangThai, setTrangThai] = useState<TrangThaiXem>({ loai: 'dang-tai' });
  const [toanManHinh, setToanManHinh] = useState(false);
  const [kichThuocThan, setKichThuocThan] = useState({ rong: 0, cao: 0 });

  // Word / text / ảnh
  const [tiLe, setTiLe] = useState(1);
  const [vuaKhung, setVuaKhung] = useState(true);
  const [ttWord, setTtWord] = useState<ThongTinWord | null>(null);
  // PowerPoint
  const [cheDoSlide, setCheDoSlide] = useState<'mot-slide' | 'danh-sach'>('mot-slide');
  const [slide, setSlide] = useState(0);
  const [ttPpt, setTtPpt] = useState<ThongTinPowerPoint | null>(null);

  const kieuTheoTen = phanLoaiTaiLieu(nguon.ten, nguon.mime);

  // ===== nạp tài liệu: maTep (poll trạng thái chuyển đổi) → src dự phòng =====
  useEffect(() => {
    let daHuy = false;
    let hen: number | undefined;
    const cho = (ms: number) => new Promise<void>((r) => { hen = window.setTimeout(r, ms); });
    setTrangThai({ loai: 'dang-tai' });
    setTtWord(null);
    setTtPpt(null);
    setSlide(0);

    (async () => {
      let noiDung: Blob | null = null;
      let dinhDang: DinhDangBanXem = 'goc';

      if (nguon.maTep) {
        try {
          const batDau = Date.now();
          for (;;) {
            const tt = await layThongTinTep(nguon.maTep);
            if (daHuy) return;
            if (tt.trangThai === 'loi') {
              setTrangThai({ loai: 'loi', thongBao: tt.thongBaoLoi ?? 'Tệp không xem được' });
              return;
            }
            if (tt.trangThai === 'san-sang') {
              dinhDang = tt.dinhDangBanXem;
              noiDung = await layBanXemTep(nguon.maTep);
              break;
            }
            setTrangThai({ loai: 'dang-chuyen-doi' });
            if (Date.now() - batDau > THOI_GIAN_CHO_TOI_DA_MS) break;
            await cho(800);
            if (daHuy) return;
          }
        } catch {
          // không còn trên Dịch vụ Tệp (VD mock sau khi tải lại trang) → dùng src
        }
      }
      if (!noiDung && nguon.src) {
        try {
          noiDung = await layBlobTuSrc(nguon.src);
        } catch {
          noiDung = null;
        }
      }
      if (daHuy) return;
      if (!noiDung) {
        setTrangThai({ loai: 'loi', thongBao: 'Không tải được tài liệu — tệp không còn tồn tại hoặc đường truyền bị gián đoạn.' });
        return;
      }
      if (dinhDang === 'pdf') {
        setTrangThai({ loai: 'san-sang', noiDung, kieu: 'pdf' });
        return;
      }
      if (!hienThiDuocTrenTrinhDuyet(nguon.ten, nguon.mime ?? noiDung.type)) {
        setTrangThai({ loai: 'loi', thongBao: thongBaoKhongXemDuoc(nguon.ten, kieuTheoTen) });
        return;
      }
      setTrangThai({ loai: 'san-sang', noiDung, kieu: phanLoaiTaiLieu(nguon.ten, nguon.mime ?? noiDung.type) });
    })();

    return () => {
      daHuy = true;
      window.clearTimeout(hen);
    };
  }, [nguon.maTep, nguon.src, nguon.ten, nguon.mime, kieuTheoTen]);

  // ===== kích thước vùng hiển thị (tính "vừa khung", độ rộng slide) =====
  useEffect(() => {
    const than = thanRef.current;
    if (!than) return;
    let hen: number | undefined;
    const doiKichThuoc = new ResizeObserver(([muc]) => {
      window.clearTimeout(hen);
      hen = window.setTimeout(() => {
        const { width, height } = muc.contentRect;
        // làm tròn 8px — tránh dựng lại slide liên tục khi kéo khung
        setKichThuocThan({ rong: Math.floor(width / 8) * 8, cao: Math.floor(height / 8) * 8 });
      }, 120);
    });
    doiKichThuoc.observe(than);
    return () => {
      window.clearTimeout(hen);
      doiKichThuoc.disconnect();
    };
  }, []);

  // ===== toàn màn hình =====
  useEffect(() => {
    const khiDoi = () => setToanManHinh(document.fullscreenElement === gocRef.current);
    document.addEventListener('fullscreenchange', khiDoi);
    return () => document.removeEventListener('fullscreenchange', khiDoi);
  }, []);

  const batTatToanManHinh = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await gocRef.current?.requestFullscreen();
    } catch {
      // trình duyệt chặn (VD iframe không cho phép) — bỏ qua
    }
  }, []);

  const kieu = trangThai.loai === 'san-sang' ? trangThai.kieu : kieuTheoTen;

  // ===== tỉ lệ Word "vừa khung" =====
  const tiLeVuaKhung = useMemo(() => {
    if (!ttWord?.rongTrang || !kichThuocThan.rong) return 1;
    // 60px = lề nền xám hai bên trang của docx-preview
    return Math.min(2, Math.max(0.3, (kichThuocThan.rong - 24) / (ttWord.rongTrang + 60)));
  }, [ttWord, kichThuocThan.rong]);
  const tiLeHienTai = kieu === 'word' && vuaKhung ? tiLeVuaKhung : tiLe;

  const doiTiLe = (huong: 1 | -1) => {
    const hienTai = tiLeHienTai;
    const ke =
      huong > 0
        ? CAC_MUC_TI_LE.find((m) => m > hienTai + 0.001) ?? CAC_MUC_TI_LE[CAC_MUC_TI_LE.length - 1]
        : [...CAC_MUC_TI_LE].reverse().find((m) => m < hienTai - 0.001) ?? CAC_MUC_TI_LE[0];
    setVuaKhung(false);
    setTiLe(ke);
  };

  // ===== độ rộng slide PowerPoint: một slide thì vừa cả chiều cao khung =====
  const doRongSlide = useMemo(() => {
    const rong = Math.max(0, kichThuocThan.rong - 24);
    if (cheDoSlide === 'danh-sach' || !kichThuocThan.cao) return rong;
    const tiLeSlide = ttPpt?.tiLeSlide ?? 9 / 16;
    return Math.floor(Math.min(rong, (kichThuocThan.cao - 24) / tiLeSlide));
  }, [kichThuocThan, cheDoSlide, ttPpt?.tiLeSlide]);

  const soSlide = ttPpt?.soSlide ?? 0;
  const denSlide = useCallback(
    (i: number) => setSlide(Math.max(0, Math.min(soSlide - 1, i))),
    [soSlide],
  );

  const xuLyPhim = (e: React.KeyboardEvent) => {
    if (kieu !== 'powerpoint' || cheDoSlide !== 'mot-slide') return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
      e.preventDefault();
      denSlide(slide + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
      e.preventDefault();
      denSlide(slide - 1);
    } else if (e.key === 'Home') denSlide(0);
    else if (e.key === 'End') denSlide(soSlide - 1);
  };

  const trinhChieu = async () => {
    setCheDoSlide('mot-slide');
    if (!document.fullscreenElement) await batTatToanManHinh();
    gocRef.current?.focus();
  };

  // ===== tải về: ưu tiên tệp GỐC từ Dịch vụ Tệp (bản xem có thể là PDF chuyển đổi) =====
  const taiVe = async () => {
    let tep: Blob | null = null;
    if (nguon.maTep) {
      try {
        tep = await layTepGoc(nguon.maTep);
      } catch {
        tep = null;
      }
    }
    if (!tep && nguon.src) tep = await layBlobTuSrc(nguon.src).catch(() => null);
    if (!tep && trangThai.loai === 'san-sang') tep = trangThai.noiDung;
    if (!tep) return;
    const url = URL.createObjectURL(tep);
    const a = document.createElement('a');
    a.href = url;
    a.download = nguon.ten;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  // URL tạm cho PDF/ảnh/video — tạo và thu hồi trong CÙNG effect (an toàn với StrictMode)
  const [urlBlob, setUrlBlob] = useState<string | null>(null);
  useEffect(() => {
    if (trangThai.loai !== 'san-sang' || !['pdf', 'anh', 'video'].includes(trangThai.kieu)) {
      setUrlBlob(null);
      return;
    }
    const url = URL.createObjectURL(trangThai.noiDung);
    setUrlBlob(url);
    return () => URL.revokeObjectURL(url);
  }, [trangThai]);

  const [vanBan, setVanBan] = useState('');
  useEffect(() => {
    if (trangThai.loai === 'san-sang' && trangThai.kieu === 'text') {
      trangThai.noiDung.text().then(setVanBan).catch(() => setVanBan('(không đọc được nội dung tệp)'));
    }
  }, [trangThai]);

  const baoLoiHienThi = useCallback((thongBao: string) => setTrangThai({ loai: 'loi', thongBao }), []);

  // ===== vùng nội dung =====
  const noiDungXem = (): ReactNode => {
    if (trangThai.loai === 'dang-tai') {
      return <div className="txtl__cho"><Spin description="Đang tải tài liệu…" /></div>;
    }
    if (trangThai.loai === 'dang-chuyen-doi') {
      return (
        <div className="txtl__cho">
          <Spin description="Máy chủ đang chuẩn bị bản xem…" />
          <span className="txtl__cho-ghi-chu">Tài liệu vừa tải lên cần vài giây để sẵn sàng.</span>
        </div>
      );
    }
    if (trangThai.loai === 'loi') {
      return (
        <div className="txtl__loi">
          {BIEU_TUONG[kieuTheoTen]}
          <div className="txtl__loi-ten">{nguon.ten}</div>
          <div className="txtl__loi-thong-bao">{trangThai.thongBao}</div>
          <Button icon={<DownloadOutlined />} onClick={taiVe}>
            Tải về
          </Button>
        </div>
      );
    }
    switch (trangThai.kieu) {
      case 'word':
        return (
          <KhungWord
            noiDung={trangThai.noiDung}
            tiLe={tiLeHienTai}
            onThongTin={setTtWord}
            onLoi={baoLoiHienThi}
          />
        );
      case 'powerpoint':
        return (
          <KhungPowerPoint
            noiDung={trangThai.noiDung}
            doRong={doRongSlide}
            cheDo={cheDoSlide}
            slideHienTai={slide}
            onThongTin={setTtPpt}
            onLoi={baoLoiHienThi}
          />
        );
      case 'pdf':
        return urlBlob ? <iframe className="txtl__pdf" src={urlBlob} title={nguon.ten} /> : null;
      case 'text':
        return (
          <pre className="txtl__text" style={{ fontSize: 14 * tiLe }}>
            {vanBan}
          </pre>
        );
      case 'anh':
        return urlBlob ? (
          <div className="txtl__anh">
            <img src={urlBlob} alt={nguon.ten} style={{ width: `${tiLe * 100}%` }} />
          </div>
        ) : null;
      case 'video':
        return urlBlob ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video className="txtl__video" src={urlBlob} controls preload="metadata" />
        ) : null;
      default:
        return null;
    }
  };

  // ===== thanh công cụ =====
  const nut = (tieuDe: string, bieuTuong: ReactNode, onClick: () => void, tat = false) => (
    <Tooltip title={tieuDe}>
      <Button
        size="small"
        type="text"
        icon={bieuTuong}
        aria-label={tieuDe}
        disabled={tat}
        onClick={onClick}
      />
    </Tooltip>
  );

  const sanSang = trangThai.loai === 'san-sang';
  const coThuPhong = sanSang && ['word', 'text', 'anh'].includes(kieu);
  const soCongThuc = (kieu === 'word' ? ttWord?.soCongThuc : ttPpt?.soCongThuc) ?? 0;

  return (
    <div
      ref={gocRef}
      className={`txtl${toanManHinh ? ' txtl--toan-man-hinh' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      tabIndex={-1}
      onKeyDown={xuLyPhim}
    >
      <div className="txtl__thanh">
        <span className="txtl__tieu-de">
          {BIEU_TUONG[kieu]}
          <span className="txtl__ten" title={nguon.ten}>{nguon.ten}</span>
          <Tag className="txtl__nhan-kieu">{nhanKieuTaiLieu[kieu]}</Tag>
          {kieu === 'word' && ttWord && <span className="txtl__phu">{ttWord.soTrang} trang</span>}
          {soCongThuc > 0 && (
            <Tooltip title="Công thức MathType trong tài liệu đã được hiển thị lại bằng công thức toán học">
              <Tag color="blue">Σ {soCongThuc} công thức</Tag>
            </Tooltip>
          )}
        </span>

        <span className="txtl__nhom-nut">
          {coThuPhong && (
            <>
              {nut('Thu nhỏ', <ZoomOutOutlined />, () => doiTiLe(-1), tiLeHienTai <= CAC_MUC_TI_LE[0])}
              <span className="txtl__ti-le">{Math.round(tiLeHienTai * 100)}%</span>
              {nut('Phóng to', <ZoomInOutlined />, () => doiTiLe(1), tiLeHienTai >= CAC_MUC_TI_LE[CAC_MUC_TI_LE.length - 1])}
              {kieu === 'word' &&
                nut('Vừa khung', <ColumnWidthOutlined />, () => setVuaKhung(true))}
            </>
          )}
          {sanSang && kieu === 'powerpoint' && soSlide > 0 && (
            <>
              {cheDoSlide === 'mot-slide' && (
                <>
                  {nut('Slide trước (←)', <LeftOutlined />, () => denSlide(slide - 1), slide <= 0)}
                  <span className="txtl__ti-le">
                    Slide {slide + 1}/{soSlide}
                  </span>
                  {nut('Slide sau (→)', <RightOutlined />, () => denSlide(slide + 1), slide >= soSlide - 1)}
                </>
              )}
              {cheDoSlide === 'mot-slide'
                ? nut('Xem dạng danh sách', <AppstoreOutlined />, () => setCheDoSlide('danh-sach'))
                : nut('Xem từng slide', <BorderOutlined />, () => setCheDoSlide('mot-slide'))}
              {nut('Trình chiếu (toàn màn hình)', <FundProjectionScreenOutlined />, trinhChieu)}
            </>
          )}
          {nut(
            toanManHinh ? 'Thoát toàn màn hình' : 'Toàn màn hình',
            toanManHinh ? <FullscreenExitOutlined /> : <FullscreenOutlined />,
            batTatToanManHinh,
          )}
          {nut('Tải về', <DownloadOutlined />, taiVe)}
        </span>
      </div>
      <div ref={thanRef} className={`txtl__than txtl__than--${kieu}`}>
        {noiDungXem()}
      </div>
    </div>
  );
}
