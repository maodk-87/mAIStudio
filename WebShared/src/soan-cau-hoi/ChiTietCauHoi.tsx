/**
 * CHI TIẾT CÂU HỎI DÙNG CHUNG (docs/ui/4 mục 4 — DS-H2) — KTĐG / NHCH / DVCC qua wrapper `ChiTietCauHoiChuan`.
 * Dữ liệu qua `nguon` (NguonQuanLyCauHoi), nhãn trạng thái/nguồn của web qua `thanhPhan`, trường riêng
 * của hệ (Mục đích sử dụng, Loại hình thi…) qua `truongHienThi`. 2 cách hiển thị dùng chung dữ liệu + nút chức năng:
 * - `ChiTietCauHoi`: trang riêng (vào thẳng bằng đường dẫn) — khối thông tin + tab Lịch sử/Đề đã dùng/Thống kê.
 * - `ModalChiTietCauHoi`: modal cỡ XXL giữa màn hình, mở từ danh sách/kho — câu hỏi hiển thị như màn thi của
 *   thí sinh (theme theo cấp học), nút chức năng ở header, footer chỉ có "Đóng".
 */
import {
  CloudUploadOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  ShareAltOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Descriptions,
  Dropdown,
  Empty,
  Modal,
  Skeleton,
  Table,
  Tabs,
  Tag,
  Tooltip,
} from 'antd';
import { createContext, useContext, useEffect, useMemo, useState, type Key } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BoxNoiDung, CopyText, useXacNhan } from '../giao-dien';
import { NoiDungOEditor as NoiDungHtml } from '../oeditor';
import { XemRubric } from '../rubric';
import { TrangThaiNoiDung } from './hang';
import {
  moTaCheDoDao,
  nhanCdtd,
  nhanCheDoDao,
  nhanKieuHienThi,
  nhanLoaiCau,
  taoNoiDungCu,
  tomTatNoiDung,
} from './nhan';
import type { NguonQuanLyCauHoi, ThanhPhanWebCauHoi, TruongHienThi } from './nguon';
import type { CauHoiQuanLy, DeDaDungCauHoi } from './types';
import SoSanhPhienBan from './SoSanhPhienBan';
import XemTruocCauHoi, { themeTheoKhoi, type ThemeXemTruoc } from './XemTruocCauHoi';
import TomTatCauHoi from './TomTatCauHoi';
import './chi-tiet-cau-hoi.scss';

/** Phần web cung cấp cho chi tiết câu hỏi */
export interface NguCanhWebChiTiet {
  nguon: NguonQuanLyCauHoi;
  thanhPhan: ThanhPhanWebCauHoi;
  /** Trường riêng của hệ hiện ở phần phân loại (theo `giaTriMoRong` của câu) */
  truongHienThi?: TruongHienThi[];
}

/**
 * Hành động "Chia sẻ" / "Đóng góp" do web chủ quản cài (gọi API thật). Mỗi mục: hàm = hành động thật,
 * `null` = ẩn mục khỏi menu, không truyền = giữ hành vi mặc định cũ (thông báo mô phỏng — web chưa ghép nối).
 */
export interface HanhDongCauChiTiet {
  chiaSe?: ((cau: CauHoiQuanLy) => void) | null;
  dongGop?: { nhan: string; onClick: (cau: CauHoiQuanLy) => void } | null;
}

const NguCanhChiTiet = createContext<(NguCanhWebChiTiet & { hanhDongCau?: HanhDongCauChiTiet }) | null>(null);
const useNguCanhChiTiet = () => {
  const nc = useContext(NguCanhChiTiet);
  if (!nc) throw new Error('Thiếu NguCanhChiTiet');
  return nc;
};

export interface ChiTietCauHoiProps extends NguCanhWebChiTiet {
  /** Chia sẻ / đóng góp thật của web (xem `HanhDongCauChiTiet`) */
  hanhDongCau?: HanhDongCauChiTiet;
  cauHoiId: string;
  duongDanSua?: (id: string) => string;
  /** Hiện nút "Quay lại" ở header box chính */
  nutQuayLai?: boolean;
  /** Đường dẫn quay lại cụ thể (mặc định: history back) */
  duongDanQuayLai?: string;
}

interface PhienBanMock {
  so: number;
  noiDung: string;
  nguoiSua: string;
  ngaySua: string;
  ghiChu: string;
}

function dinhDangNgay(iso: string): string {
  const [nam, thang, ngay] = iso.split('-');
  return `${ngay}/${thang}/${nam}`;
}

/** Nạp câu hỏi + danh mục tên (môn, khối, TPNL, kho, mục đích sử dụng) + đề đã dùng */
function useChiTietCauHoi(cauHoiId: string | null | undefined, { nguon, truongHienThi }: NguCanhWebChiTiet) {
  const [cau, setCau] = useState<CauHoiQuanLy | null>(null);
  const [deDaDung, setDeDaDung] = useState<DeDaDungCauHoi[]>([]);
  const [theme, setTheme] = useState<ThemeXemTruoc>('thcs');
  const [tenMon, setTenMon] = useState<Map<string, string>>(new Map());
  const [tenKhoi, setTenKhoi] = useState<Map<string, string>>(new Map());
  const [tenTpnl, setTenTpnl] = useState<Map<string, string>>(new Map());
  // Tên giá trị trường riêng của hệ: khóa trường → (id → tên)
  const [tenMoRong, setTenMoRong] = useState<Record<string, Map<string, string>>>({});
  const [tenKho, setTenKho] = useState<Map<string, string>>(new Map());

  // Câu hỏi thuộc khối nào → xem trước theo theme cấp học đó
  useEffect(() => {
    if (cau?.khoiId) setTheme(themeTheoKhoi(cau.khoiId));
  }, [cau?.khoiId]);

  useEffect(() => {
    setCau(null);
    if (!cauHoiId) return;
    nguon.layChiTiet(cauHoiId).then(setCau);
    nguon.layDeDaSuDung(cauHoiId).then(setDeDaDung);
    nguon.layDanhSachMonHoc().then((ds) => setTenMon(new Map(ds.map((m) => [m.id, m.ten]))));
    nguon.layDanhSachKhoi().then((ds) => setTenKhoi(new Map(ds.map((k) => [k.id, k.ten]))));
    nguon.layDanhSachTpnl().then((ds) => setTenTpnl(new Map(ds.map((t) => [t.id, t.ten]))));
    nguon.layDanhSachKho().then((ds) => setTenKho(new Map(ds.map((k) => [k.id, k.ten]))));
    (truongHienThi ?? []).forEach((t) =>
      t.layTen().then((ds) =>
        setTenMoRong((cu) => ({ ...cu, [t.khoa]: new Map(ds.map((l) => [l.value, l.label])) })),
      ),
    );
    // Nguồn cố định theo web; nạp lại theo id câu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cauHoiId]);

  return { cau, setCau, deDaDung, theme, setTheme, tenMon, tenKhoi, tenTpnl, tenMoRong, tenKho };
}

type DuLieuChiTiet = ReturnType<typeof useChiTietCauHoi>;

/** Nút chức năng: Sửa + menu (Nhân bản, Chia sẻ, Đóng góp, Ngừng sử dụng, Xóa) */
function NutChucNangCauHoi({
  cau,
  setCau,
  duongDanSua,
  onDaXoa,
  onDaThayDoi,
}: {
  cau: CauHoiQuanLy;
  setCau: (c: CauHoiQuanLy) => void;
  duongDanSua?: (id: string) => string;
  onDaXoa: () => void;
  onDaThayDoi?: () => void;
}) {
  const navigate = useNavigate();
  const xacNhan = useXacNhan();
  const { nguon, hanhDongCau } = useNguCanhChiTiet();
  const { message } = App.useApp();
  const baoThanhCong = (noiDung: string) => message.success(noiDung);
  return (
    <span className="ct-cau-hoi__nut" onClick={(e) => e.stopPropagation()}>
      {duongDanSua && cau.trangThai !== TrangThaiNoiDung.NgungSuDung && (
        <Button
          icon={<EditOutlined />}
          type="primary"
          ghost
          onClick={() => navigate(duongDanSua(cau.id))}
        >
          Sửa
        </Button>
      )}
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'nhan-ban', label: 'Nhân bản', icon: <CopyOutlined /> },
            ...(hanhDongCau?.chiaSe === null
              ? []
              : [
                  {
                    key: 'chia-se',
                    label: 'Chia sẻ',
                    icon: <ShareAltOutlined />,
                    disabled: cau.trangThai !== TrangThaiNoiDung.DaDuyet,
                  },
                ]),
            ...(hanhDongCau?.dongGop === null
              ? []
              : [
                  {
                    key: 'dong-gop',
                    label: hanhDongCau?.dongGop?.nhan ?? 'Đóng góp lên cấp trên',
                    icon: <CloudUploadOutlined />,
                    disabled: cau.trangThai !== TrangThaiNoiDung.DaDuyet,
                  },
                ]),
            {
              key: 'ngung',
              label: 'Ngừng sử dụng',
              icon: <StopOutlined />,
              disabled: cau.trangThai === TrangThaiNoiDung.NgungSuDung,
            },
            { key: 'xoa', label: 'Xóa', icon: <DeleteOutlined />, danger: true },
          ],
          onClick: async ({ key }) => {
            if (key === 'nhan-ban') {
              await nguon.nhanBan(cau.id);
              baoThanhCong(`Đã nhân bản câu ${cau.ma} thành bản Nháp mới`);
              onDaThayDoi?.();
            } else if (key === 'chia-se') {
              if (hanhDongCau?.chiaSe) hanhDongCau.chiaSe(cau);
              else baoThanhCong(`Đã tạo lượt chia sẻ câu ${cau.ma} (mô phỏng)`);
            } else if (key === 'dong-gop') {
              if (hanhDongCau?.dongGop) hanhDongCau.dongGop.onClick(cau);
              else baoThanhCong(`Đã gửi đóng góp câu ${cau.ma} lên cấp trên (mô phỏng)`);
            } else if (key === 'ngung') {
              xacNhan({
                tieuDe: 'Ngừng sử dụng câu hỏi?',
                doiTuong: tomTatNoiDung(cau.noiDung, 60),
                nhanDien: cau.ma,
                anhHuong:
                  'Câu hỏi sẽ không được rút vào đề mới. Đề đã sử dụng KHÔNG bị ảnh hưởng.',
                nhanNutXacNhan: 'Ngừng sử dụng',
                mucDo: 'cam',
                onXacNhan: async () => {
                  const moi = await nguon.ngungSuDung(cau.id);
                  setCau(moi);
                  onDaThayDoi?.();
                  baoThanhCong('Đã ngừng sử dụng câu hỏi');
                },
              });
            } else if (key === 'xoa') {
              xacNhan({
                tieuDe: 'Xóa câu hỏi?',
                doiTuong: tomTatNoiDung(cau.noiDung, 60),
                nhanDien: cau.ma,
                anhHuong:
                  'Câu hỏi sẽ bị xóa khỏi ngân hàng. Các đề thi đã sử dụng câu này KHÔNG bị ảnh hưởng.',
                nhanNutXacNhan: 'Xóa',
                mucDo: 'do',
                onXacNhan: async () => {
                  await nguon.xoa(cau.id);
                  baoThanhCong('Đã xóa câu hỏi');
                  onDaXoa();
                },
              });
            }
          },
        }}
      >
        <Button icon={<MoreOutlined />} aria-label="Thao tác khác" />
      </Dropdown>
    </span>
  );
}

/** Nội dung ô "Nhận xét của người duyệt" (nếu có) */
function NhanXetDuyet({ cau }: { cau: CauHoiQuanLy }) {
  return cau.nhanXetDuyet ? (
    <div className="ct-cau-hoi__nhan-xet">
      <b>Nhận xét của người duyệt:</b> <NoiDungHtml html={cau.nhanXetDuyet} inline />
    </div>
  ) : null;
}

/** Phân loại 5 chiều + thông tin quản lý */
function PhanLoaiCauHoi({
  duLieu,
  tieuDe = 'Phân loại 5 chiều',
}: {
  duLieu: DuLieuChiTiet;
  tieuDe?: string | null;
}) {
  const { tenMon, tenKhoi, tenTpnl, tenMoRong, tenKho } = duLieu;
  const { thanhPhan, truongHienThi } = useNguCanhChiTiet();
  const { BadgeNguon } = thanhPhan;
  const cau = duLieu.cau!;
  return (
    <Descriptions
      className="ct-cau-hoi__phan-loai"
      title={tieuDe ?? undefined}
      size="small"
      column={{ xs: 1, sm: 2, md: 3 }}
      items={[
        {
          key: 'ma',
          label: 'Mã câu hỏi',
          children: <CopyText giaTri={cau.ma} />,
        },
        { key: 'mon', label: 'Môn', children: tenMon.get(cau.monHocId) ?? cau.monHocId },
        { key: 'khoi', label: 'Khối', children: tenKhoi.get(cau.khoiId) ?? cau.khoiId },
        {
          key: 'chu-de',
          label: 'Chủ đề / Tiểu mục',
          children: `${cau.tenChuDe} › ${cau.tenTieuMuc}`,
        },
        { key: 'cdtd', label: 'Cấp độ tư duy', children: nhanCdtd[cau.cdtd] },
        {
          key: 'tpnl',
          label: 'Thành phần năng lực',
          children:
            cau.tpnlIds.map((id) => tenTpnl.get(id)).filter(Boolean).join(', ') ||
            '—',
        },
        { key: 'loai-cau', label: 'Loại câu', children: nhanLoaiCau[cau.loaiCau] },
        { key: 'kho', label: 'Kho câu hỏi', children: cau.khoId ? (tenKho.get(cau.khoId) ?? cau.khoId) : '—' },
        ...(truongHienThi ?? []).map((t) => {
          const giaTri = cau.giaTriMoRong?.[t.khoa];
          return {
            key: t.khoa,
            label: t.nhan,
            children: giaTri ? (tenMoRong[t.khoa]?.get(giaTri) ?? giaTri) : '—',
          };
        }),
        { key: 'nguon', label: 'Nguồn', children: <BadgeNguon nguon={cau.nguon} /> },
        { key: 'diem', label: 'Điểm gợi ý', children: cau.diemGoiY },
        {
          key: 'kieu-hien-thi',
          label: 'Kiểu hiển thị',
          children: cau.kieuHienThi ? nhanKieuHienThi[cau.kieuHienThi] : '—',
        },
        {
          key: 'che-do-dao',
          label: 'Khả năng đảo câu hỏi',
          children: cau.cheDoDao ? (
            <Tooltip title={moTaCheDoDao[cau.cheDoDao]}>
              <span>
                {nhanCheDoDao[cau.cheDoDao]}{' '}
                <InfoCircleOutlined className="ct-cau-hoi__icon-i" />
              </span>
            </Tooltip>
          ) : (
            '—'
          ),
        },
        { key: 'nguoi-soan', label: 'Người soạn', children: cau.nguoiSoan },
        { key: 'ngay-tao', label: 'Ngày tạo', children: dinhDangNgay(cau.ngayTao) },
        { key: 'phien-ban', label: 'Phiên bản', children: `v${cau.phienBan}` },
        { key: 'so-lan-dung', label: 'Số lần dùng', children: cau.soLanDung },
      ]}
    />
  );
}

/** Các tab dữ liệu liên quan: Rubric · Lịch sử phiên bản · Đề đã sử dụng · Thống kê CTT/IRT */
function useTabDuLieuLienQuan(cau: CauHoiQuanLy | null, deDaDung: DeDaDungCauHoi[], thanhPhan: ThanhPhanWebCauHoi) {
  const { BadgeTrangThai } = thanhPhan;
  const [phienBanChon, setPhienBanChon] = useState<Key[]>([]);

  /** Mock 2 phiên bản để so sánh */
  const cacPhienBan: PhienBanMock[] = useMemo(() => {
    if (!cau) return [];
    return [
      {
        so: cau.phienBan,
        noiDung: cau.noiDung,
        nguoiSua: cau.nguoiSoan,
        ngaySua: cau.ngayTao,
        ghiChu: 'Bản hiện tại',
      },
      // Câu v1: bản trước là "bản nháp ban đầu" v0 (so phải khác nhau — rowKey của bảng)
      {
        so: cau.phienBan - 1,
        noiDung: taoNoiDungCu(cau.noiDung),
        nguoiSua: cau.nguoiSoan,
        ngaySua: '2025-01-15',
        ghiChu: cau.phienBan > 1 ? 'Bản trước khi chỉnh sửa' : 'Bản nháp ban đầu',
      },
    ];
  }, [cau]);

  /** Đường cong đặc trưng câu hỏi (ICC) — mô hình 3PL mock từ độ khó thực nghiệm */
  const duLieuIcc = useMemo(() => {
    if (!cau?.doKho) return [];
    const a = 1.2; // độ phân biệt
    const b = (0.5 - cau.doKho) * 4; // độ khó trên thang theta
    const c = 0.2; // đoán mò
    const diem: { theta: number; p: number }[] = [];
    for (let theta = -4; theta <= 4.01; theta += 0.5) {
      const p = c + (1 - c) / (1 + Math.exp(-1.7 * a * (theta - b)));
      diem.push({ theta: Math.round(theta * 10) / 10, p: Math.round(p * 1000) / 1000 });
    }
    return diem;
  }, [cau]);

  if (!cau) return [];

  const tabLichSu = (
    <div className="ct-cau-hoi__tab-than">
      <p className="ct-cau-hoi__goi-y-so-sanh">
        Tích chọn <b>2 phiên bản</b> để xem so sánh cạnh nhau (khác biệt được tô màu).
      </p>
      <Table<PhienBanMock>
        size="middle"
        rowKey="so"
        pagination={false}
        rowSelection={{
          selectedRowKeys: phienBanChon,
          onChange: (keys) => setPhienBanChon(keys.slice(-2)),
        }}
        columns={[
          { title: 'Phiên bản', dataIndex: 'so', width: 100, render: (so) => `v${so}` },
          {
            title: 'Nội dung',
            dataIndex: 'noiDung',
            render: (nd: string) => <TomTatCauHoi html={nd} doDai={110} />,
          },
          { title: 'Người sửa', dataIndex: 'nguoiSua', width: 180 },
          {
            title: 'Ngày',
            dataIndex: 'ngaySua',
            width: 120,
            render: dinhDangNgay,
          },
          { title: 'Ghi chú', dataIndex: 'ghiChu', width: 200 },
        ]}
        dataSource={cacPhienBan}
      />
      {phienBanChon.length === 2 && (
        <div className="ct-cau-hoi__so-sanh">
          {(() => {
            const [a, b] = [...phienBanChon]
              .map((k) => cacPhienBan.find((p) => p.so === k)!)
              .sort((x, y) => x.so - y.so);
            return (
              <SoSanhPhienBan
                tieuDeCu={`Phiên bản v${a.so}`}
                tieuDeMoi={`Phiên bản v${b.so}`}
                noiDungCu={a.noiDung}
                noiDungMoi={b.noiDung}
              />
            );
          })()}
        </div>
      )}
    </div>
  );

  const tabDeDaDung = (
    <Table<DeDaDungCauHoi>
      size="middle"
      rowKey="id"
      pagination={false}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Câu hỏi chưa được sử dụng trong đề nào"
          />
        ),
      }}
      columns={[
        { title: 'Mã đề', dataIndex: 'ma', width: 150 },
        { title: 'Tên đề', dataIndex: 'ten' },
        {
          title: 'Trạng thái',
          dataIndex: 'trangThai',
          width: 140,
          render: (tt: string) => <BadgeTrangThai trangThai={tt} />,
        },
        { title: 'Người tạo', dataIndex: 'nguoiTao', width: 180 },
        {
          title: 'Ngày tạo',
          dataIndex: 'ngayTao',
          width: 120,
          render: dinhDangNgay,
        },
        {
          title: 'Nơi đã sử dụng',
          dataIndex: 'noiDaSuDung',
          width: 240,
          render: (ds: string[]) => ds.join(', ') || '—',
        },
      ]}
      dataSource={deDaDung}
    />
  );

  const tabThongKe = cau.doKho ? (
    <div className="ct-cau-hoi__thong-ke">
      <div className="ct-cau-hoi__the-so">
        <div className="the-so">
          <div className="the-so__nhan">
            Độ khó (p-value)
            <Tooltip title="Tỉ lệ thí sinh trả lời đúng — càng thấp câu càng khó">
              <InfoCircleOutlined />
            </Tooltip>
          </div>
          <div className="the-so__gia-tri">{cau.doKho}</div>
        </div>
        <div className="the-so">
          <div className="the-so__nhan">
            Độ phân biệt
            <Tooltip title="Hệ số tương quan điểm câu – tổng điểm (point-biserial)">
              <InfoCircleOutlined />
            </Tooltip>
          </div>
          <div className="the-so__gia-tri">{cau.doPhanBiet != null ? String(cau.doPhanBiet).replace('.', ',') : '—'}</div>
        </div>
        <div className="the-so">
          <div className="the-so__nhan">Cỡ mẫu</div>
          <div className="the-so__gia-tri">{cau.soLuotLam != null ? cau.soLuotLam.toLocaleString('vi-VN') : '—'}</div>
        </div>
        {cau.daHieuChuan && (
          <div className="the-so">
            <div className="the-so__nhan">Hiệu chuẩn</div>
            <div className="the-so__gia-tri">
              <Tag color="gold">Đã hiệu chuẩn</Tag>
            </div>
          </div>
        )}
      </div>
      {/* ICC chỉ hiện khi câu đã hiệu chuẩn IRT — dịch vụ IRT chưa chạy thì không vẽ số liệu giả (docs/16 dòng 9) */}
      {!cau.daHieuChuan && (
        <div className="chu-dien-giai" style={{ marginTop: 12 }}>
          Chưa có kết quả hiệu chuẩn IRT cho câu hỏi này — chỉ hiển thị chỉ số CTT.
        </div>
      )}
      {cau.daHieuChuan && (
      <div className="ct-cau-hoi__bieu-do">
        <div className="ct-cau-hoi__bieu-do-tieu-de">
          Đường cong đặc trưng câu hỏi (ICC)
          <Tooltip title={`Mô hình IRT 3 tham số (3PL)${cau.soLuotLam != null ? `, ước lượng trên n = ${cau.soLuotLam.toLocaleString('vi-VN')} bài làm` : ''} thuộc phạm vi hiệu chuẩn. Trục ngang: năng lực θ; trục dọc: xác suất trả lời đúng.`}>
            <InfoCircleOutlined className="ct-cau-hoi__icon-i" />
          </Tooltip>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={duLieuIcc} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="#d9dee5" strokeDasharray="3 3" />
            <XAxis
              dataKey="theta"
              tick={{ fontSize: 14, fill: '#5b6572' }}
              stroke="#d9dee5"
              label={{ value: 'Năng lực θ', position: 'insideBottomRight', offset: -4, fontSize: 14, fill: '#5b6572' }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 14, fill: '#5b6572' }}
              stroke="#d9dee5"
            />
            <ChartTooltip
              formatter={(v) => [String(v), 'Xác suất đúng P(θ)']}
              labelFormatter={(l) => `θ = ${l}`}
            />
            <Line
              type="monotone"
              dataKey="p"
              stroke="#1b5e9e"
              strokeWidth={2}
              dot={false}
              name="P(θ)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  ) : (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description="Chưa đủ dữ liệu bài làm để thống kê CTT/IRT cho câu hỏi này"
    />
  );

  return [
    ...(cau.rubric
      ? [
          {
            key: 'rubric',
            label: 'Rubric chấm',
            children: (
              <div className="ct-cau-hoi__tab-than">
                <XemRubric cay={cau.rubric} diemMucTieu={cau.diemGoiY} />
              </div>
            ),
          },
        ]
      : []),
    { key: 'lich-su', label: 'Lịch sử phiên bản', children: tabLichSu },
    {
      key: 'de-da-dung',
      label: `Đề đã sử dụng (${deDaDung.length})`,
      children: tabDeDaDung,
    },
    { key: 'thong-ke', label: 'Thống kê CTT/IRT', children: <div className="ct-cau-hoi__tab-than">{tabThongKe}</div> },
  ];
}

export default function ChiTietCauHoi(props: ChiTietCauHoiProps) {
  return (
    <NguCanhChiTiet.Provider value={props}>
      <TrangChiTiet {...props} />
    </NguCanhChiTiet.Provider>
  );
}

function TrangChiTiet({
  cauHoiId,
  duongDanSua,
  nutQuayLai,
  duongDanQuayLai,
  ...web
}: ChiTietCauHoiProps) {
  const navigate = useNavigate();
  const duLieu = useChiTietCauHoi(cauHoiId, web);
  const { cau, setCau, deDaDung, theme, setTheme } = duLieu;
  const tabLienQuan = useTabDuLieuLienQuan(cau, deDaDung, web.thanhPhan);
  const { BadgeTrangThaiCau } = web.thanhPhan;

  if (!cau) {
    return (
      <BoxNoiDung
        tieuDe="Chi tiết câu hỏi"
        nutQuayLai={nutQuayLai}
        duongDanQuayLai={duongDanQuayLai}
      >
        <Skeleton active paragraph={{ rows: 6 }} />
      </BoxNoiDung>
    );
  }

  return (
    <div className="ct-cau-hoi">
      <BoxNoiDung
        tieuDe={
          <span>
            Câu hỏi {cau.ma} <BadgeTrangThaiCau cau={cau} />
          </span>
        }
        nutQuayLai={nutQuayLai}
        duongDanQuayLai={duongDanQuayLai}
        phanPhai={
          <NutChucNangCauHoi
            cau={cau}
            setCau={setCau}
            duongDanSua={duongDanSua}
            onDaXoa={() => navigate(-1)}
          />
        }
      >
        <div className="ct-cau-hoi__noi-dung">
          <XemTruocCauHoi
            cauHoi={cau}
            hienDapAn
            khoiId={cau.khoiId}
            theme={theme}
            onDoiTheme={setTheme}
          />
          <NhanXetDuyet cau={cau} />
        </div>
        <PhanLoaiCauHoi duLieu={duLieu} />
      </BoxNoiDung>

      <BoxNoiDung tieuDe="Dữ liệu liên quan" khongPadding>
        <Tabs
          className="ct-cau-hoi__tabs"
          items={tabLienQuan}
        />
      </BoxNoiDung>
    </div>
  );
}

export interface ModalChiTietCauHoiProps extends NguCanhWebChiTiet {
  /** Chia sẻ / đóng góp thật của web (xem `HanhDongCauChiTiet`) */
  hanhDongCau?: HanhDongCauChiTiet;
  /** Có giá trị = mở modal xem câu này */
  cauHoiId?: string | null;
  onClose: () => void;
  /** Có thì hiện nút "Sửa" ở header */
  duongDanSua?: (id: string) => string;
  /** Gọi sau thao tác làm đổi dữ liệu (nhân bản, ngừng sử dụng, xóa) — để danh sách nạp lại */
  onDaThayDoi?: () => void;
  /** Chỉ xem (câu của người/tầng khác, kho được chia sẻ) — ẩn nút chức năng ở header */
  chiXem?: boolean;
}

/**
 * Modal chi tiết câu hỏi — cỡ XXL, giữa màn hình. Header: mã + trạng thái + nút chức năng;
 * thân: tab "Câu hỏi" (như màn thi của thí sinh) · "Thông tin phân loại" · dữ liệu liên quan; footer chỉ "Đóng".
 */
export function ModalChiTietCauHoi(props: ModalChiTietCauHoiProps) {
  return (
    <NguCanhChiTiet.Provider value={props}>
      <KhungModalChiTiet {...props} />
    </NguCanhChiTiet.Provider>
  );
}

function KhungModalChiTiet({
  cauHoiId,
  onClose,
  duongDanSua,
  onDaThayDoi,
  chiXem,
  ...web
}: ModalChiTietCauHoiProps) {
  const duLieu = useChiTietCauHoi(cauHoiId, web);
  const { cau, setCau, deDaDung, theme, setTheme } = duLieu;
  const tabLienQuan = useTabDuLieuLienQuan(cau, deDaDung, web.thanhPhan);
  const { BadgeTrangThaiCau } = web.thanhPhan;

  return (
    <Modal
      open={!!cauHoiId}
      centered
      width="min(1440px, calc(100vw - 32px))"
      className="ct-cau-hoi-modal"
      destroyOnHidden
      onCancel={onClose}
      title={
        <div className="ct-cau-hoi-modal__header">
          <span className="ct-cau-hoi-modal__tieu-de">
            {cau ? (
              <>
                Câu hỏi {cau.ma} <BadgeTrangThaiCau cau={cau} />
              </>
            ) : (
              'Chi tiết câu hỏi'
            )}
          </span>
          {cau && !chiXem && (
            <NutChucNangCauHoi
              cau={cau}
              setCau={setCau}
              duongDanSua={duongDanSua}
              onDaXoa={() => {
                onDaThayDoi?.();
                onClose();
              }}
              onDaThayDoi={onDaThayDoi}
            />
          )}
        </div>
      }
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      {!cau ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Tabs
          className="ct-cau-hoi-modal__tabs"
          items={[
            {
              key: 'cau-hoi',
              label: 'Câu hỏi',
              children: (
                <div className="ct-cau-hoi-modal__man-thi">
                  <XemTruocCauHoi
                    cauHoi={cau}
                    hienDapAn
                    khoiId={cau.khoiId}
                    theme={theme}
                    onDoiTheme={setTheme}
                  />
                  <NhanXetDuyet cau={cau} />
                </div>
              ),
            },
            {
              key: 'phan-loai',
              label: 'Thông tin phân loại',
              children: <PhanLoaiCauHoi duLieu={duLieu} tieuDe={null} />,
            },
            ...tabLienQuan,
          ]}
        />
      )}
    </Modal>
  );
}
