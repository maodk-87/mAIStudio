/**
 * Màn chấm theo rubric — toàn màn hình, 2 vùng (FR-RB-041 … 048):
 * trái = bài làm (ảnh quét phóng to/thu nhỏ, hoặc bài trên máy chỉnh cỡ chữ) · phải = rubric trải phẳng, ô nhập lớn.
 * Thanh kéo đổi tỷ lệ 2 vùng, chuyển bố cục trái–phải / trên–dưới (nhớ theo trình duyệt); màn hẹp tự chuyển trên–dưới.
 * Tự lưu từng ô, hàng đợi khi mất mạng (không cho nộp khi chưa đồng bộ); Ctrl+B "Không làm bài", Ctrl+Enter hoàn tất
 * câu → câu/bài tiếp, Alt+1… chọn nhánh. Chỉ hiển thị mã phách — không có tên, SBD, lớp.
 */
import {
  CheckCircleFilled,
  CloseOutlined,
  ColumnHeightOutlined,
  ColumnWidthOutlined,
  ExpandOutlined,
  LeftOutlined,
  RightOutlined,
  StopOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { Alert, Badge, Button, Segmented, Space, Spin, Switch, Tag, Tooltip, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useXacNhan } from './useXacNhan';
import { nhanLuotCham, type BaiLamTheoPhach, type NguonChamRubric, type PhieuChamChiTietRubric as PhieuChamChiTiet } from './nguon';
import type { DuLieuChamRubric } from './types';
import { useThongBao } from '../oeditor/useThongBao';
import { apThayDoiLa, congDiem, doiNhanh, hienDiem, lapChiMuc, soOConLai, tinhDiem, tinhDiemToiDa } from './tinhToan';
import BangChamRubric, { type BangChamRubricRef, type GhiLaRubric } from './BangChamRubric';
import './rubric.scss';

export interface ManChamRubricProps {
  /** Nguồn phiếu chấm + bài làm của web (services/rubric) */
  nguon: NguonChamRubric;
  /** Phiếu của MỘT bài (mỗi câu tự luận một phiếu) — chấm theo bài; truyền 1 phiếu nếu chấm theo câu */
  phieuIds: string[];
  /** Tiêu đề phụ (môn – khối, kỳ) */
  tieuDe?: string;
  /** Vị trí bài trong hàng chờ ("Bài 12/116") + điều hướng */
  viTriBai?: string;
  onBaiTruoc?: () => void;
  onBaiSau?: () => void;
  onDong: () => void;
  /** Gọi sau khi nộp xong mọi phiếu của bài */
  onNopXong?: () => void;
  chiDoc?: boolean;
}

type BoCuc = 'ngang' | 'doc';
const KHOA_TY_LE = 'ktdg-cham-rubric-ty-le';
const KHOA_BO_CUC = 'ktdg-cham-rubric-bo-cuc';
const docLuu = <T,>(k: string, macDinh: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : macDinh;
  } catch {
    return macDinh;
  }
};
const ghiLuu = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* bỏ qua */
  }
};

type ViecCho = { phieuId: string; loai: 'ghi'; ds: GhiLaRubric[] } | { phieuId: string; loai: 'nhanh'; khoaPA: string; khoaNhanh: string };

/** Áp thay đổi lên dữ liệu phiếu cục bộ (hiển thị tức thời trước khi server xác nhận) */
function apCucBo(ct: PhieuChamChiTiet, ds: GhiLaRubric[]): DuLieuChamRubric {
  return apThayDoiLa(ct.phienBan.cay, ct.phieu.duLieu, ds);
}

export default function ManChamRubric({ nguon, phieuIds, tieuDe, viTriBai, onBaiTruoc, onBaiSau, onDong, onNopXong, chiDoc }: ManChamRubricProps) {
  const xacNhan = useXacNhan();
  const thongBao = useThongBao();
  const { layChiTietPhieu, ghiGiaTriPhieu, chonNhanhPhieu, khongLamBaiPhieu, nopPhieu, layBaiLamTheoPhach } = nguon;
  const nhanLuot = nguon.nhanLuot ?? nhanLuotCham;
  const [phieu, setPhieu] = useState<Record<string, PhieuChamChiTiet>>({});
  const [cauChon, setCauChon] = useState(0);
  const [baiLam, setBaiLam] = useState<Record<string, BaiLamTheoPhach>>({});
  const [boCuc, setBoCuc] = useState<BoCuc>(() => docLuu<BoCuc>(KHOA_BO_CUC, 'ngang'));
  // Tỷ lệ vùng bài làm, nhớ riêng cho từng bố cục (trên–dưới cần vùng rubric cao hơn)
  const [tyLeTheoBoCuc, setTyLeTheoBoCuc] = useState<Record<BoCuc, number>>(() => {
    const v = docLuu<Record<BoCuc, number> | number>(KHOA_TY_LE, { ngang: 0.56, doc: 0.42 });
    return typeof v === 'number' ? { ngang: v, doc: 0.42 } : v;
  });
  const [rongVungBai, setRongVungBai] = useState(800);
  const [thuPhong, setThuPhong] = useState<number | 'vua'>('vua');
  const [coChu, setCoChu] = useState(17);
  const [hienDeBai, setHienDeBai] = useState(true);
  const [hienDapAn, setHienDapAn] = useState(false);
  const [rongManHinh, setRongManHinh] = useState(window.innerWidth);
  const [soCho, setSoCho] = useState(0);
  const [truTuyen, setTruTuyen] = useState(navigator.onLine);
  const [dangNop, setDangNop] = useState(false);
  const hangDoi = useRef<ViecCho[]>([]);
  const dangXa = useRef(false);
  const khoaPhieu = useRef<Record<string, number>>({});
  const thanRef = useRef<HTMLDivElement>(null);
  const vungBaiRef = useRef<HTMLDivElement>(null);
  const bangRef = useRef<BangChamRubricRef>(null);
  const [rongAnh, setRongAnh] = useState(1240);

  const dsPhieu = phieuIds.map((id) => phieu[id]).filter(Boolean);
  const ct = phieu[phieuIds[cauChon]];
  const boCucHieuLuc: BoCuc = rongManHinh < 1100 ? 'doc' : boCuc;
  const tyLe = tyLeTheoBoCuc[boCucHieuLuc];

  // ————— Tải phiếu + bài làm —————
  const taiPhieu = useCallback(async (id: string) => {
    const x = await layChiTietPhieu(id);
    khoaPhieu.current[id] = x.phieu.phienBanKhoa;
    setPhieu((p) => ({ ...p, [id]: x }));
    return x;
  }, []);

  useEffect(() => {
    setPhieu({});
    setCauChon(0);
    Promise.all(phieuIds.map(taiPhieu)).then((ds) => {
      // Mở câu đầu tiên còn ô trống
      const i = ds.findIndex((x) => x.phieu.trangThai !== 'da-nop');
      setCauChon(i >= 0 ? i : 0);
    });
  }, [phieuIds, taiPhieu]);

  useEffect(() => {
    if (!ct || baiLam[ct.phieu.id]) return;
    layBaiLamTheoPhach(ct.phieu.maPhach, ct.cau.id).then((b) => setBaiLam((x) => ({ ...x, [ct.phieu.id]: b })));
  }, [ct, baiLam]);

  useEffect(() => {
    const t = setTimeout(() => bangRef.current?.focusODau(), 120);
    return () => clearTimeout(t);
  }, [cauChon, ct?.phieu.id]);

  useEffect(() => {
    const doiKichThuoc = () => setRongManHinh(window.innerWidth);
    const len = () => {
      setTruTuyen(true);
      void xaHangDoi();
    };
    const xuong = () => setTruTuyen(false);
    window.addEventListener('resize', doiKichThuoc);
    window.addEventListener('online', len);
    window.addEventListener('offline', xuong);
    return () => {
      window.removeEventListener('resize', doiKichThuoc);
      window.removeEventListener('online', len);
      window.removeEventListener('offline', xuong);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ————— Hàng đợi đồng bộ (FR-RB-047) —————
  const xaHangDoi = useCallback(async () => {
    if (dangXa.current) return;
    dangXa.current = true;
    try {
      while (hangDoi.current.length && navigator.onLine) {
        const v = hangDoi.current[0];
        try {
          const kq =
            v.loai === 'ghi'
              ? await ghiGiaTriPhieu(v.phieuId, v.ds, khoaPhieu.current[v.phieuId])
              : await chonNhanhPhieu(v.phieuId, v.khoaPA, v.khoaNhanh, khoaPhieu.current[v.phieuId]);
          khoaPhieu.current[v.phieuId] = kq.phieu.phienBanKhoa;
          hangDoi.current.shift();
          // Chỉ nhận dữ liệu server khi không còn thay đổi cục bộ chờ gửi cho phiếu này
          if (!hangDoi.current.some((x) => x.phieuId === v.phieuId)) setPhieu((p) => ({ ...p, [v.phieuId]: kq }));
        } catch (e) {
          hangDoi.current = hangDoi.current.filter((x) => x.phieuId !== v.phieuId);
          thongBao.loi((e as Error).message);
          await taiPhieu(v.phieuId);
        }
        setSoCho(hangDoi.current.length);
      }
    } finally {
      dangXa.current = false;
      setSoCho(hangDoi.current.length);
    }
  }, [taiPhieu]);

  const dayVao = (v: ViecCho) => {
    hangDoi.current.push(v);
    setSoCho(hangDoi.current.length);
    void xaHangDoi();
  };

  const ghi = (ds: GhiLaRubric[]) => {
    if (!ct) return;
    setPhieu((p) => ({ ...p, [ct.phieu.id]: { ...ct, phieu: { ...ct.phieu, duLieu: apCucBo(ct, ds) } } }));
    dayVao({ phieuId: ct.phieu.id, loai: 'ghi', ds });
  };

  const chonNhanh = (khoaPA: string, khoaNhanh: string) => {
    if (!ct) return;
    setPhieu((p) => ({ ...p, [ct.phieu.id]: { ...ct, phieu: { ...ct.phieu, duLieu: doiNhanh(ct.phienBan.cay, ct.phieu.duLieu, khoaPA, khoaNhanh) } } }));
    dayVao({ phieuId: ct.phieu.id, loai: 'nhanh', khoaPA, khoaNhanh });
  };

  const khongLamBai = () => {
    if (!ct || chiDoc) return;
    xacNhan({
      tieuDe: 'Đánh dấu "Không làm bài"?',
      doiTuong: `Câu ${ct.cau.maCau} · phách ${ct.phieu.maPhach}`,
      anhHuong: 'Mọi tiêu chí của câu = 0, lưu lý do BLANK (tính vào tỷ lệ bỏ trắng).',
      nhanNutXacNhan: 'Không làm bài',
      mucDo: 'cam',
      onXacNhan: async () => {
        await xaHangDoi();
        try {
          const kq = await khongLamBaiPhieu(ct.phieu.id, khoaPhieu.current[ct.phieu.id]);
          khoaPhieu.current[ct.phieu.id] = kq.phieu.phienBanKhoa;
          setPhieu((p) => ({ ...p, [ct.phieu.id]: kq }));
        } catch (e) {
          thongBao.loi((e as Error).message);
        }
      },
    });
  };

  // ————— Tổng, hoàn tất, nộp —————
  const conLaiCau = (x?: PhieuChamChiTiet) => (x ? soOConLai(x.phienBan.cay, x.phieu.duLieu) : 0);
  const tongCau = (x?: PhieuChamChiTiet) => (x ? tinhDiem(x.phienBan.cay, x.phieu.duLieu) : null);
  const tongBai = dsPhieu.every((x) => tongCau(x) != null) ? congDiem(dsPhieu.map((x) => tongCau(x)!)) : null;
  const toiDaBai = congDiem(dsPhieu.map((x) => tinhDiemToiDa(x.phienBan.cay)));
  const daNopHet = dsPhieu.length > 0 && dsPhieu.every((x) => x.phieu.trangThai === 'da-nop');

  const nopBai = async (sauDo?: () => void) => {
    if (soCho) {
      await xaHangDoi();
      if (hangDoi.current.length) return thongBao.loi('Còn thay đổi chưa đồng bộ — kiểm tra kết nối trước khi nộp');
    }
    const i = dsPhieu.findIndex((x) => conLaiCau(x) > 0);
    if (i >= 0) {
      setCauChon(i);
      return thongBao.loi(`Câu ${dsPhieu[i].cau.maCau} còn ${conLaiCau(dsPhieu[i])} ô chưa chấm`);
    }
    setDangNop(true);
    try {
      for (const x of dsPhieu) if (x.phieu.trangThai !== 'da-nop') await nopPhieu(x.phieu.id);
      await Promise.all(phieuIds.map(taiPhieu));
      thongBao.thanhCong(`Đã nộp phiếu chấm phách ${ct?.phieu.maPhach}`);
      onNopXong?.();
      sauDo?.();
    } catch (e) {
      thongBao.loi((e as Error).message);
    } finally {
      setDangNop(false);
    }
  };

  /** Ctrl+Enter: câu này xong → câu còn thiếu tiếp theo; cả bài xong → nộp và sang bài sau */
  const hoanTatVaTiep = () => {
    if (!ct) return;
    if (conLaiCau(ct) > 0) return thongBao.loi(`Câu ${ct.cau.maCau} còn ${conLaiCau(ct)} ô chưa chấm`);
    const k = dsPhieu.findIndex((x, i) => i !== cauChon && conLaiCau(x) > 0);
    if (k >= 0) return setCauChon(k);
    void nopBai(onBaiSau);
  };

  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        hoanTatVaTiep();
      } else if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        khongLamBai();
      } else if (e.altKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        bangRef.current?.chonNhanhTheoSo(Number(e.key));
      }
    };
    window.addEventListener('keydown', phim);
    return () => window.removeEventListener('keydown', phim);
  });

  // ————— Kéo thanh chia —————
  const batDauKeo = (e: React.PointerEvent) => {
    e.preventDefault();
    const than = thanRef.current;
    if (!than) return;
    const r = than.getBoundingClientRect();
    const di = (ev: PointerEvent) => {
      const t = boCucHieuLuc === 'ngang' ? (ev.clientX - r.left) / r.width : (ev.clientY - r.top) / r.height;
      setTyLeTheoBoCuc((x) => ({ ...x, [boCucHieuLuc]: Math.min(0.75, Math.max(0.25, t)) }));
    };
    const tha = () => {
      window.removeEventListener('pointermove', di);
      window.removeEventListener('pointerup', tha);
      setTyLeTheoBoCuc((x) => {
        ghiLuu(KHOA_TY_LE, x);
        return x;
      });
    };
    window.addEventListener('pointermove', di);
    window.addEventListener('pointerup', tha);
  };

  // ————— Thu phóng ảnh —————
  // Đo bề rộng vùng bài làm thật (đổi bố cục / kéo thanh chia / đổi cỡ cửa sổ) để "Vừa khung" luôn đúng
  useEffect(() => {
    const el = vungBaiRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([m]) => setRongVungBai(m.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [boCucHieuLuc]);
  const tyLePhong = thuPhong !== 'vua' ? thuPhong : Math.max(0.3, Math.min(1.6, (rongVungBai - 32) / rongAnh));

  const bl = ct ? baiLam[ct.phieu.id] : undefined;

  const vungBaiLam = (
    <div className="man-cham-rubric__vung" ref={vungBaiRef} style={{ flex: `${tyLe} 1 0`, minWidth: boCucHieuLuc === 'ngang' ? 320 : undefined, minHeight: boCucHieuLuc === 'doc' ? 200 : undefined }}>
      <div className="man-cham-rubric__thanh-vung">
        <Space size={6}>
          <b>Bài làm</b>
          {bl && <Tag>{bl.kieu === 'anh-quet' ? 'Ảnh quét bài giấy' : 'Bài trên máy'}</Tag>}
          {bl && <Typography.Text type="secondary">{bl.soChu} chữ</Typography.Text>}
        </Space>
        <Space size={4} wrap>
          <Button size="small" type={hienDeBai ? 'primary' : 'default'} ghost={hienDeBai} onClick={() => setHienDeBai((x) => !x)}>
            Đề bài
          </Button>
          {bl?.kieu === 'anh-quet' ? (
            <>
              <Tooltip title="Thu nhỏ">
                <Button size="small" icon={<ZoomOutOutlined />} onClick={() => setThuPhong(Math.max(0.3, Math.round((tyLePhong - 0.1) * 10) / 10))} />
              </Tooltip>
              <span style={{ minWidth: 44, textAlign: 'center' }}>{Math.round(tyLePhong * 100)}%</span>
              <Tooltip title="Phóng to">
                <Button size="small" icon={<ZoomInOutlined />} onClick={() => setThuPhong(Math.min(3, Math.round((tyLePhong + 0.1) * 10) / 10))} />
              </Tooltip>
              <Button size="small" type={thuPhong === 'vua' ? 'primary' : 'default'} icon={<ExpandOutlined />} onClick={() => setThuPhong('vua')}>
                Vừa khung
              </Button>
              <Button size="small" onClick={() => setThuPhong(1)}>
                100%
              </Button>
            </>
          ) : (
            <>
              <Button size="small" onClick={() => setCoChu((c) => Math.max(13, c - 1))}>
                A−
              </Button>
              <span style={{ minWidth: 36, textAlign: 'center' }}>{coChu}px</span>
              <Button size="small" onClick={() => setCoChu((c) => Math.min(26, c + 1))}>
                A+
              </Button>
            </>
          )}
        </Space>
      </div>
      <div className="man-cham-rubric__cuon">
        {hienDeBai && ct && <div className="man-cham-rubric__de-bai">{ct.cau.noiDung}</div>}
        {!bl ? (
          <Spin style={{ margin: 24 }} />
        ) : bl.kieu === 'anh-quet' ? (
          <div className="man-cham-rubric__bai-lam-anh">
            <img
              src={bl.anhQuet}
              alt={`Bài làm câu ${ct?.cau.maCau}`}
              style={{ width: rongAnh * tyLePhong }}
              onLoad={(e) => setRongAnh((e.target as HTMLImageElement).naturalWidth || 1240)}
            />
          </div>
        ) : (
          <div className="man-cham-rubric__bai-lam-chu" style={{ fontSize: coChu }}>
            {bl.dong?.length ? bl.dong.join('\n') : <Typography.Text type="secondary">(Thí sinh không làm câu này)</Typography.Text>}
          </div>
        )}
      </div>
    </div>
  );

  const toiDaCau = ct ? tinhDiemToiDa(ct.phienBan.cay) : 0;
  const conLai = conLaiCau(ct);

  const vungRubric = (
    <div className="man-cham-rubric__vung" style={{ flex: `${1 - tyLe} 1 0`, minWidth: boCucHieuLuc === 'ngang' ? 380 : undefined, minHeight: boCucHieuLuc === 'doc' ? 240 : undefined }}>
      <div className="man-cham-rubric__thanh-vung">
        <Space size={6}>
          <b>Rubric câu {ct?.cau.maCau}</b>
          {ct && <Tag>v{ct.phienBan.soPhienBan}</Tag>}
          {ct?.phieu.lyDoTrang === 'BLANK' && <Tag color="default">Không làm bài</Tag>}
        </Space>
        <Space size={6}>
          <Typography.Text type="secondary">Đáp án mẫu</Typography.Text>
          <Switch size="small" checked={hienDapAn} onChange={setHienDapAn} />
        </Space>
      </div>
      <div className="man-cham-rubric__cuon">
        {ct?.phieu.trangThai === 'can-cham-lai' && (
          <Alert
            style={{ margin: 10 }}
            type="error"
            showIcon
            title="Rubric đã được điều chỉnh — chấm lại các tiêu chí tô đỏ"
            description="Giá trị các tiêu chí không đổi được giữ nguyên."
          />
        )}
        {ct ? (
          <BangChamRubric
            key={ct.phieu.id}
            ref={bangRef}
            cay={ct.phienBan.cay}
            duLieu={ct.phieu.duLieu}
            chiDoc={chiDoc}
            hienDapAn={hienDapAn}
            laPhaiNhapLai={ct.phieu.laPhaiNhapLai}
            onGhi={ghi}
            onChonNhanh={chonNhanh}
            onHetO={() => (conLaiCau(ct) === 0 ? hoanTatVaTiep() : bangRef.current?.focusODau())}
          />
        ) : (
          <Spin style={{ margin: 24 }} />
        )}
      </div>
      <div className="man-cham-rubric__chan">
        <span className="man-cham-rubric__tong">
          Câu {ct?.cau.maCau}: <b>{hienDiem(tongCau(ct))}</b> / {hienDiem(toiDaCau)}
        </span>
        {conLai > 0 ? <Tag color="warning">Còn {conLai} ô</Tag> : <Tag color="success" icon={<CheckCircleFilled />}>Đủ</Tag>}
        <Space size={6} wrap>
          {!chiDoc && (
            <Tooltip title="Ctrl+B">
              <Button icon={<StopOutlined />} onClick={khongLamBai}>
                Không làm bài
              </Button>
            </Tooltip>
          )}
          {!chiDoc && (
            <Tooltip title="Ctrl+Enter">
              <Button type="primary" onClick={hoanTatVaTiep} loading={dangNop} disabled={daNopHet && !onBaiSau}>
                {dsPhieu.some((x, i) => i !== cauChon && conLaiCau(x) > 0) ? 'Hoàn tất câu → câu tiếp' : 'Hoàn tất & bài tiếp'}
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
    </div>
  );

  const trangThaiDongBo = !truTuyen ? (
    <span className="man-cham-rubric__dong-bo loi">Mất kết nối — {soCho} thay đổi chưa đồng bộ (tự gửi khi có mạng)</span>
  ) : soCho ? (
    <span className="man-cham-rubric__dong-bo cho">Đang lưu {soCho}…</span>
  ) : (
    <span className="man-cham-rubric__dong-bo ok">Đã lưu</span>
  );

  return (
    <div className="man-cham-rubric" role="dialog" aria-label="Màn chấm theo rubric">
      <div className="man-cham-rubric__dau">
        <Space size={10} wrap>
          <Typography.Text type="secondary">Mã phách</Typography.Text>
          <span className="man-cham-rubric__phach">{ct?.phieu.maPhach ?? '…'}</span>
          {ct && <Tag color="blue">{nhanLuot[ct.phieu.luot] ?? ct.phieu.luot}</Tag>}
          {tieuDe && <Typography.Text type="secondary">{tieuDe}</Typography.Text>}
        </Space>
        <Segmented
          value={cauChon}
          onChange={(v) => setCauChon(v as number)}
          options={phieuIds.map((id, i) => {
            const x = phieu[id];
            const cl = conLaiCau(x);
            return {
              value: i,
              label: (
                <Space size={4}>
                  Câu {x?.cau.maCau ?? i + 1}
                  {x?.phieu.trangThai === 'da-nop' ? (
                    <CheckCircleFilled style={{ color: '#52c41a' }} />
                  ) : cl ? (
                    <Badge count={cl} size="small" color="#f79009" />
                  ) : (
                    <CheckCircleFilled style={{ color: '#91caff' }} />
                  )}
                </Space>
              ),
            };
          })}
        />
        <Space size={8} wrap style={{ marginLeft: 'auto' }}>
          {trangThaiDongBo}
          {rongManHinh >= 1100 && (
            <Segmented
              size="small"
              value={boCuc}
              onChange={(v) => {
                setBoCuc(v as BoCuc);
                ghiLuu(KHOA_BO_CUC, v);
              }}
              options={[
                { value: 'ngang', icon: <ColumnWidthOutlined />, label: 'Trái – phải' },
                { value: 'doc', icon: <ColumnHeightOutlined />, label: 'Trên – dưới' },
              ]}
            />
          )}
          {viTriBai && <Typography.Text strong>{viTriBai}</Typography.Text>}
          <Button icon={<LeftOutlined />} disabled={!onBaiTruoc} onClick={onBaiTruoc} aria-label="Bài trước" />
          <Button icon={<RightOutlined />} disabled={!onBaiSau} onClick={onBaiSau} aria-label="Bài sau" />
          <Button
            icon={<CloseOutlined />}
            onClick={async () => {
              if (hangDoi.current.length) await xaHangDoi();
              onDong();
            }}
          >
            Đóng
          </Button>
        </Space>
      </div>

      <div ref={thanRef} className={`man-cham-rubric__than ${boCucHieuLuc === 'doc' ? 'doc' : ''}`}>
        {vungBaiLam}
        <div className={`man-cham-rubric__chia ${boCucHieuLuc === 'doc' ? 'doc' : ''}`} onPointerDown={batDauKeo} role="separator" aria-label="Kéo để đổi kích thước" />
        {vungRubric}
      </div>

      <div className="man-cham-rubric__chan">
        <span className="man-cham-rubric__tong">
          Tổng tự luận của bài: <b>{hienDiem(tongBai)}</b> / {hienDiem(toiDaBai)}
          {daNopHet && <Tag color="success" style={{ marginLeft: 8 }}>Đã nộp</Tag>}
        </span>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Enter/Tab: ô kế tiếp · 1–9: chọn mức · Alt+1/2: chọn cách giải · Ctrl+B: không làm bài · Ctrl+Enter: hoàn tất
        </Typography.Text>
        {!chiDoc && (
          <Button type="primary" size="large" loading={dangNop} disabled={soCho > 0 && !truTuyen} onClick={() => void nopBai()}>
            {daNopHet ? 'Cập nhật phiếu' : 'Nộp phiếu chấm bài này'}
          </Button>
        )}
      </div>
    </div>
  );
}
