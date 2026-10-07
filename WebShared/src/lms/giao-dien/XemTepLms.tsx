/**
 * XEM TỆP LMS TRỰC TUYẾN — mở NGAY nội dung (ảnh, video, âm thanh, PDF, Word .docx, PowerPoint .pptx, văn bản) thay vì
 * bắt tải về (dùng `TrinhXemTaiLieu` của @web-shared/trinh-xem-tai-lieu). Định dạng không xem được trên trình duyệt
 * (Excel, .doc/.ppt cũ, zip…) → thông báo + nút Tải về. Dùng chung LMS.Web (GV) và KTDG.Web (học sinh).
 *
 * - `XemTepLms`: khung xem đặt trong trang (cần chiều cao — prop `chieuCao`).
 * - `ModalXemTep`: xem toàn khung (mở từ danh sách tệp).
 * - `DanhSachTepXem`: danh sách tệp đính kèm — bấm tên là mở xem; `noiTuyen` → xem luôn tệp đầu tiên ngay dưới danh sách.
 */
import { DownloadOutlined, ExpandOutlined, FileOutlined, FileSearchOutlined } from '@ant-design/icons';
import { Button, Empty, Modal, Result, Segmented, Space, Spin, Tooltip } from 'antd';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { nhanKieuTaiLieu, phanLoaiTaiLieu, TrinhXemTaiLieu } from '../../trinh-xem-tai-lieu';
import { cachHienThiTep, mimeTheoDuoi, moUrlTep } from '../noiDungTep';

/** Thông tin tối thiểu của một tệp để xem (khớp TepLms / TepDinhKem) */
export interface TepXem {
  ten: string;
  mime?: string | null;
  kichThuoc?: number | null;
  /** Đường dẫn endpoint tải tệp có kiểm quyền (tải blob kèm token) */
  duongDan?: string | null;
  maTep?: string | null;
  /** Tệp cục bộ chưa gửi (xem trước khi nộp) */
  noiDung?: Blob | null;
}

export const dinhDangKichThuoc = (b?: number | null) =>
  b == null ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${Math.round(b / 102.4) / 10} KB` : `${Math.round(b / 104857.6) / 10} MB`;

/**
 * URL xem được của tệp (null = không có nội dung). Nội dung tải bằng fetch blob kèm token (endpoint
 * có kiểm quyền) → object URL, tự giải phóng khi đổi tệp/unmount.
 */
export function useUrlTep(tep: TepXem | null): { url: string | null; dangTai: boolean } {
  const [kq, setKq] = useState<{ url: string | null; dangTai: boolean }>({ url: null, dangTai: true });
  useEffect(() => {
    let huy = false;
    let giaiPhong: (() => void) | null = null;
    if (!tep) {
      setKq({ url: null, dangTai: false });
      return;
    }
    if (tep.noiDung) {
      const urlTam = URL.createObjectURL(tep.noiDung);
      giaiPhong = () => URL.revokeObjectURL(urlTam);
      setKq({ url: urlTam, dangTai: false });
    } else {
      setKq({ url: null, dangTai: true });
      moUrlTep(tep.duongDan)
        .then((kqUrl) => {
          if (huy) {
            kqUrl?.giaiPhong();
            return;
          }
          giaiPhong = kqUrl?.giaiPhong ?? null;
          setKq({ url: kqUrl?.url ?? null, dangTai: false });
        })
        .catch(() => !huy && setKq({ url: null, dangTai: false }));
    }
    return () => {
      huy = true;
      giaiPhong?.();
    };
  }, [tep, tep?.duongDan, tep?.noiDung]);
  return kq;
}

/** Tải tệp về máy (dùng khi người dùng chủ động bấm "Tải về") — tải blob có kiểm quyền rồi lưu */
export async function taiTepVe(tep: TepXem): Promise<boolean> {
  let url: string | null = null;
  let giaiPhong: (() => void) | null = null;
  if (tep.noiDung) {
    const urlTam = URL.createObjectURL(tep.noiDung);
    url = urlTam;
    giaiPhong = () => URL.revokeObjectURL(urlTam);
  } else {
    const kqUrl = await moUrlTep(tep.duongDan).catch(() => null);
    url = kqUrl?.url ?? null;
    giaiPhong = kqUrl?.giaiPhong ?? null;
  }
  if (!url) return false;
  const a = document.createElement('a');
  a.href = url;
  a.download = tep.ten;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Trình duyệt cần URL còn sống tới khi bắt đầu tải
  if (giaiPhong) setTimeout(giaiPhong, 30_000);
  return true;
}

interface XemTepLmsProps {
  tep: TepXem;
  /** Chiều cao khung xem (mặc định 70vh) */
  chieuCao?: CSSProperties['height'];
  /** Ẩn thanh tiêu đề (tên tệp + nút) — khi khung chứa đã có tiêu đề */
  anThanhTieuDe?: boolean;
  /** Hiện nút mở toàn khung */
  choPhepToanKhung?: boolean;
}

export function XemTepLms({ tep, chieuCao = '70vh', anThanhTieuDe, choPhepToanKhung = true }: XemTepLmsProps) {
  const mime = tep.mime || mimeTheoDuoi(tep.ten);
  const cach = cachHienThiTep(tep.ten, mime);
  const { url, dangTai } = useUrlTep(tep);
  const [toanKhung, setToanKhung] = useState(false);

  const thanh = !anThanhTieuDe && (
    <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} wrap>
      <span style={{ fontWeight: 500 }}>
        <FileOutlined /> {tep.ten}
        <span style={{ color: 'var(--text-sub)', fontWeight: 400 }}>
          {' '}
          · {nhanKieuTaiLieu[phanLoaiTaiLieu(tep.ten, mime)]}
          {tep.kichThuoc ? ` · ${dinhDangKichThuoc(tep.kichThuoc)}` : ''}
        </span>
      </span>
      <Space size={4}>
        {choPhepToanKhung && cach === 'xem' && url && (
          <Tooltip title="Xem toàn khung">
            <Button icon={<ExpandOutlined />} aria-label="Xem toàn khung" onClick={() => setToanKhung(true)} />
          </Tooltip>
        )}
        <Button icon={<DownloadOutlined />} disabled={!url} onClick={() => void taiTepVe(tep)}>
          Tải về
        </Button>
      </Space>
    </Space>
  );

  let than;
  if (dangTai) than = <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>;
  else if (!url) than = <Result icon={<FileSearchOutlined />} title="Tệp chưa có nội dung để xem" subTitle={`${tep.ten}${tep.kichThuoc ? ` · ${dinhDangKichThuoc(tep.kichThuoc)}` : ''}`} />;
  else if (cach === 'am-thanh') than = <audio controls src={url} style={{ width: '100%' }} />;
  else if (cach === 'tai-ve')
    than = (
      <Result
        icon={<FileOutlined />}
        title="Định dạng này chưa xem trực tuyến được"
        subTitle="Xem trực tuyến hỗ trợ ảnh, video, âm thanh, PDF, Word (.docx), PowerPoint (.pptx). Tải tệp về để mở."
        extra={<Button type="primary" icon={<DownloadOutlined />} onClick={() => void taiTepVe(tep)}>Tải về</Button>}
      />
    );
  else
    than = (
      <div style={{ height: chieuCao, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <TrinhXemTaiLieu nguon={{ src: url, maTep: tep.maTep ?? undefined, ten: tep.ten, mime }} />
      </div>
    );

  return (
    <div className="xem-tep-lms">
      {thanh}
      {than}
      {toanKhung && <ModalXemTep tep={tep} onDong={() => setToanKhung(false)} />}
    </div>
  );
}

/** Xem tệp toàn khung (Modal DS-G: nút ở footer) */
export function ModalXemTep({ tep, onDong }: { tep: TepXem | null; onDong: () => void }) {
  return (
    <Modal
      open={!!tep}
      title={tep?.ten}
      width="min(1280px, 96vw)"
      onCancel={onDong}
      destroyOnHidden
      footer={[
        <Button key="tai" icon={<DownloadOutlined />} onClick={() => tep && void taiTepVe(tep)}>
          Tải về
        </Button>,
        <Button key="dong" type="primary" onClick={onDong}>
          Đóng
        </Button>,
      ]}
    >
      {tep && <XemTepLms tep={tep} chieuCao="calc(100vh - 260px)" anThanhTieuDe choPhepToanKhung={false} />}
    </Modal>
  );
}

interface DanhSachTepXemProps {
  tep: TepXem[];
  /** Xem luôn tệp đang chọn ngay dưới danh sách (mặc định tệp đầu tiên) — màn chấm, bài nộp */
  noiTuyen?: boolean;
  chieuCao?: CSSProperties['height'];
  moTaRong?: string;
}

/** Danh sách tệp: bấm là xem ngay (nội tuyến hoặc modal toàn khung) */
export function DanhSachTepXem({ tep, noiTuyen, chieuCao = '65vh', moTaRong = 'Không có tệp đính kèm' }: DanhSachTepXemProps) {
  const [chon, setChon] = useState(0);
  const [modal, setModal] = useState<TepXem | null>(null);
  const ds = useMemo(() => tep, [tep]);
  useEffect(() => setChon(0), [ds]);
  if (!ds.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={moTaRong} />;

  if (noiTuyen) {
    const hienTai = ds[Math.min(chon, ds.length - 1)];
    return (
      <div>
        {ds.length > 1 && (
          <Segmented
            style={{ marginBottom: 8, maxWidth: '100%', overflowX: 'auto' }}
            value={Math.min(chon, ds.length - 1)}
            onChange={(v) => setChon(Number(v))}
            options={ds.map((t, i) => ({ value: i, label: t.ten }))}
          />
        )}
        <XemTepLms key={`${hienTai.ten}-${chon}`} tep={hienTai} chieuCao={chieuCao} />
      </div>
    );
  }

  return (
    <div>
      {ds.map((t, i) => (
        <div
          key={`${t.ten}-${i}`}
          role="button"
          tabIndex={0}
          onClick={() => setModal(t)}
          onKeyDown={(e) => e.key === 'Enter' && setModal(t)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}
        >
          <FileOutlined style={{ color: 'var(--primary)' }} />
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--primary)' }}>{t.ten}</span>
          <span style={{ color: 'var(--text-sub)', fontSize: 14 }}>{dinhDangKichThuoc(t.kichThuoc)}</span>
          <Tooltip title="Tải về">
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              aria-label={`Tải về ${t.ten}`}
              onClick={(e) => {
                e.stopPropagation();
                void taiTepVe(t);
              }}
            />
          </Tooltip>
        </div>
      ))}
      <ModalXemTep tep={modal} onDong={() => setModal(null)} />
    </div>
  );
}
