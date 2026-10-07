import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { Badge, Button, Empty, Popover, Spin } from 'antd';
import DanhSachDon from '../giao-dien/DanhSachDon';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  danhDauDaDoc,
  danhDauDocTatCa,
  layDanhSachThongBao,
  laySoThongBaoChuaDoc,
  ngheThongBaoThayDoi,
} from './dichVu';
import { dangKyThongBaoRealtime } from './realtime';
import type { KenhThongBao, ThongBao } from './types';

/** Chu kỳ hỏi số chưa đọc khi KHÔNG có kết nối realtime (fallback) */
const CHU_KY_HOI_MS = 60_000;

export interface ChuongThongBaoProps {
  /** Đã đăng nhập (chưa đăng nhập → không hiện, không kết nối hub) */
  daDangNhap: boolean;
  /** Mở trang danh sách đầy đủ (tab Thông báo của trang cá nhân) */
  onXemTatCa: () => void;
  /** Mở liên kết của thông báo (đường dẫn nội bộ) */
  onMoLienKet?: (lienKet: string) => void;
}

/** ISO → `dd/MM/yyyy HH:mm` theo giờ máy người dùng */
function hienThiThoiGian(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hai = (n: number) => String(n).padStart(2, '0');
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
}

/**
 * Chuông thông báo ở header (dùng chung KTDG.Web/ADMIN.Web/CSDL.Web): số chưa đọc cập nhật realtime qua hub
 * `/hubs/thong-bao` (sự kiện `ThongBaoMoi`, tự nối lại); hub lỗi → hỏi định kỳ 60 s + khi tab được xem lại.
 * 8 thông báo mới nhất khi mở, đánh dấu đã đọc từng cái / tất cả.
 */
export default function ChuongThongBao({ daDangNhap, onXemTatCa, onMoLienKet }: ChuongThongBaoProps) {
  const [soChuaDoc, setSoChuaDoc] = useState(0);
  const [danhSach, setDanhSach] = useState<ThongBao[]>();
  const [mo, setMo] = useState(false);
  const [dangTai, setDangTai] = useState(false);
  const [kenh, setKenh] = useState<KenhThongBao>('polling');
  const moRef = useRef(mo);
  moRef.current = mo;

  const taiSo = useCallback(() => {
    laySoThongBaoChuaDoc()
      .then(setSoChuaDoc)
      .catch(() => {
        /* Chuông không làm phiền khi mất mạng — lần sau sẽ cập nhật */
      });
  }, []);

  const taiDanhSach = useCallback(() => {
    setDangTai(true);
    layDanhSachThongBao({ soBanGhi: 8 })
      .then(setDanhSach)
      .catch(() => setDanhSach([]))
      .finally(() => setDangTai(false));
  }, []);

  // Realtime + thay đổi từ màn khác
  useEffect(() => {
    if (!daDangNhap) return undefined;
    taiSo();
    const khiThayDoi = () => {
      taiSo();
      if (moRef.current) taiDanhSach();
    };
    const huyRealtime = dangKyThongBaoRealtime(khiThayDoi, setKenh);
    const huyNghe = ngheThongBaoThayDoi(khiThayDoi);
    return () => {
      huyRealtime();
      huyNghe();
    };
  }, [daDangNhap, taiSo, taiDanhSach]);

  // Fallback polling khi không có realtime
  useEffect(() => {
    if (!daDangNhap || kenh === 'realtime') return undefined;
    const hen = window.setInterval(() => {
      if (document.visibilityState === 'visible') taiSo();
    }, CHU_KY_HOI_MS);
    const khiHienLai = () => {
      if (document.visibilityState === 'visible') taiSo();
    };
    document.addEventListener('visibilitychange', khiHienLai);
    return () => {
      window.clearInterval(hen);
      document.removeEventListener('visibilitychange', khiHienLai);
    };
  }, [daDangNhap, kenh, taiSo]);

  if (!daDangNhap) return null;

  const moThongBao = async (tb: ThongBao) => {
    if (!tb.daDoc) {
      setDanhSach((ds) => ds?.map((t) => (t.id === tb.id ? { ...t, daDoc: true } : t)));
      setSoChuaDoc((s) => Math.max(0, s - 1));
      await danhDauDaDoc(tb.id).catch(() => undefined);
    }
    setMo(false);
    if (tb.lienKet && onMoLienKet) onMoLienKet(tb.lienKet);
    else onXemTatCa();
  };

  const docTatCa = async () => {
    try {
      await danhDauDocTatCa();
      setSoChuaDoc(0);
      setDanhSach((ds) => ds?.map((t) => ({ ...t, daDoc: true })));
    } catch {
      // Lỗi đã hiển thị bằng thông báo chung
    }
  };

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={mo}
      onOpenChange={(v) => {
        setMo(v);
        if (v) taiDanhSach();
      }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Thông báo{soChuaDoc ? ` (${soChuaDoc} chưa đọc)` : ''}</span>
          <Button type="link" size="small" icon={<CheckOutlined />} disabled={!soChuaDoc} onClick={docTatCa}>
            Đánh dấu tất cả đã đọc
          </Button>
        </div>
      }
      content={
        <div style={{ width: 380, maxWidth: 'calc(100vw - 32px)' }}>
          <Spin spinning={dangTai}>
            {danhSach && danhSach.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
            ) : (
              <DanhSachDon
                size="small"
                dataSource={danhSach ?? []}
                style={{ maxHeight: 420, overflowY: 'auto' }}
                renderItem={(tb) => (
                  <DanhSachDon.Muc
                    style={{
                      cursor: 'pointer',
                      opacity: tb.daDoc ? 0.65 : 1,
                      background: tb.daDoc ? undefined : 'var(--primary-light)',
                      borderRadius: 4,
                      paddingInline: 8,
                    }}
                    onClick={() => void moThongBao(tb)}
                  >
                    <DanhSachDon.MucMeta
                      title={<span style={{ fontSize: 14, fontWeight: tb.daDoc ? 400 : 600 }}>{tb.tieuDe}</span>}
                      description={
                        <span style={{ fontSize: 14 }} className="chu-dien-giai">
                          {tb.noiDung.slice(0, 90)}
                          {tb.noiDung.length > 90 ? '…' : ''}
                          <br />
                          {hienThiThoiGian(tb.thoiGian)}
                        </span>
                      }
                    />
                  </DanhSachDon.Muc>
                )}
              />
            )}
          </Spin>
          <Button
            type="link"
            block
            onClick={() => {
              setMo(false);
              onXemTatCa();
            }}
          >
            Xem tất cả thông báo
          </Button>
        </div>
      }
    >
      <Badge count={soChuaDoc} size="small" overflowCount={99}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 20, color: '#fff' }} />}
          aria-label={`Thông báo${soChuaDoc ? ` — ${soChuaDoc} chưa đọc` : ''}`}
        />
      </Badge>
    </Popover>
  );
}
