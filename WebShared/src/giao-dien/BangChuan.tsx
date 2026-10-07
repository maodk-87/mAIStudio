import {
  AppstoreAddOutlined,
  FilterOutlined,
  DownOutlined,
  MoreOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Dropdown,
  Empty,
  Input,
  Popover,
  Select,
  Space,
  Table,
  Tooltip,
} from 'antd';
import type { ColumnType } from 'antd/es/table';
import {
  useEffect,
  useMemo,
  useState,
  type Key,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import BoxNoiDung from './BoxNoiDung';
import type { LuaChon } from './FormSelect';
import { khopTimKiem } from './timKiem';
import './bang-chuan.scss';

export interface CotBang<T> extends ColumnType<T> {
  /** Cột ẩn mặc định — chỉ hiện khi người dùng chọn qua ⚙ (DS-D2) */
  anMacDinh?: boolean;
}

export interface BoLocBang<T> {
  key: string;
  nhan: string;
  luaChon: LuaChon[];
  /** Hàm lọc client-side; không truyền thì component không tự lọc theo bộ lọc này */
  locItem?: (banGhi: T, giaTri: string) => boolean;
  doRong?: number;
  /** Khóa ô chọn (chờ chọn các bộ lọc phụ thuộc trước) — giá trị đang có sẽ bị xóa */
  disabled?: boolean;
}

export interface HanhDongHang<T> {
  key: string;
  nhan: string;
  icon?: ReactNode;
  /** Kiểu nút: chinh (primary ghost) | nguy-hiem (đỏ) | mac-dinh */
  loai?: 'chinh' | 'nguy-hiem' | 'mac-dinh';
  an?: (banGhi: T) => boolean;
  disabled?: (banGhi: T) => boolean;
  tooltipDisabled?: string;
  /** Có menu con: nút hiện dạng "Nhãn ▾" mở danh sách mục (onClick của nút cha không dùng) */
  menuCon?: (banGhi: T) => { key: string; nhan: string; icon?: ReactNode; onClick: () => void }[];
  onClick: (banGhi: T) => void;
}

export interface BangChuanProps<T> {
  /** Mã bảng — dùng nhớ lựa chọn cột hiển thị theo người dùng */
  maBang: string;
  tieuDe?: ReactNode;
  /** Dòng mô tả nhỏ dưới tiêu đề (truyền tiếp cho BoxNoiDung) */
  moTa?: ReactNode;
  /** Hiện nút "Quay lại" bên phải header box (truyền tiếp BoxNoiDung) */
  nutQuayLai?: boolean;
  duongDanQuayLai?: string;
  nutTrai?: ReactNode;
  huongDan?: ReactNode;
  cot: CotBang<T>[];
  duLieu: T[];
  dangTai?: boolean;
  rowKey?: string;
  placeholderTimKiem?: string;
  /** Độ rộng ô tìm kiếm từ khóa (mặc định 260) */
  doRongTimKiem?: number;
  /** Hàm so khớp từ khóa tìm kiếm client-side */
  timKiem?: (banGhi: T, tuKhoa: string) => boolean;
  boLoc?: BoLocBang<T>[];
  /** Bộ lọc nâng cao — ẩn mặc định, mở bằng nút "Thêm lọc" thành dòng thứ 2 */
  boLocNangCao?: BoLocBang<T>[];
  /** Phần tử đứng ĐẦU hàng lọc (trước bộ lọc + ô tìm kiếm) — VD select ngữ cảnh Đợt/Kỳ thi */
  truocTimKiem?: ReactNode;
  /** Callback khi bộ lọc/từ khóa đổi (dùng khi lọc phía cha) */
  onLocThayDoi?: (giaTri: Record<string, string | undefined>, tuKhoa: string) => void;
  /** Hiện toàn bộ nút thao tác trên hàng, không gom vào menu ⋮ */
  hienTatCaThaoTac?: boolean;
  /** Cột thao tác gọn: nút chỉ icon (nhãn ở tooltip), không tiêu đề cột, rộng tối thiểu — hiện tất cả nút */
  thaoTacGon?: boolean;
  /** Ẩn cột STT */
  anStt?: boolean;
  /** Nút thao tác từng hàng: ≤2 hiện cả, >2 hiện 1 nút chính + menu ⋮ (DS-D4) */
  hanhDong?: HanhDongHang<T>[];
  /** Click hàng mở chi tiết (vùng nút không kích hoạt — DS-D6) */
  onClickHang?: (banGhi: T) => void;
  chonNhieu?: boolean;
  /** Thanh hành động nổi khi có dòng được chọn (DS file 4 mục 4) */
  thanhChonNhieu?: (keys: Key[], banGhi: T[], boChon: () => void) => ReactNode;
  /** Không bọc box (đặt bảng trong tab — DS-E4) */
  khongBox?: boolean;
  /** Đồng bộ trạng thái lọc/trang vào URL query (DS-H1) */
  dongBoUrl?: boolean;
  moTaRong?: string;
  phanPhaiHeader?: ReactNode;
  /** Nội dung đặt TRONG box, phía trên hàng lọc (VD Alert thông tin của trang) */
  phanTren?: ReactNode;
  /**
   * Phân trang phía máy chủ: `duLieu` là MỘT trang, `tongSo` = tổng bản ghi khớp lọc. Bảng không tự lọc/tìm
   * (không truyền `locItem`/`timKiem`) — cha gọi API theo `onDoiTrang` + `onLocThayDoi` (lọc đổi → trang 1).
   */
  phanTrangMayChu?: { tongSo: number; onDoiTrang: (trang: number, soBanGhi: number) => void };
}

/** Bảng dữ liệu chuẩn toàn hệ thống (DS-D) */
export default function BangChuan<T extends object>({
  maBang,
  tieuDe,
  moTa,
  nutQuayLai,
  duongDanQuayLai,
  nutTrai,
  huongDan,
  cot,
  duLieu,
  dangTai,
  rowKey = 'id',
  placeholderTimKiem = 'Tìm kiếm…',
  doRongTimKiem = 260,
  timKiem,
  boLoc,
  boLocNangCao,
  truocTimKiem,
  onLocThayDoi,
  hanhDong,
  hienTatCaThaoTac,
  thaoTacGon,
  anStt,
  onClickHang,
  chonNhieu,
  thanhChonNhieu,
  khongBox,
  dongBoUrl,
  moTaRong = 'Chưa có dữ liệu',
  phanPhaiHeader,
  phanTren,
  phanTrangMayChu,
}: BangChuanProps<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tienTo = dongBoUrl ? `${maBang}_` : '';

  const [tuKhoa, setTuKhoa] = useState(
    dongBoUrl ? (searchParams.get(`${tienTo}q`) ?? '') : '',
  );
  const [giaTriLoc, setGiaTriLoc] = useState<Record<string, string | undefined>>(
    () => {
      const banDau: Record<string, string | undefined> = {};
      if (dongBoUrl) {
        for (const bl of [...(boLoc ?? []), ...(boLocNangCao ?? [])]) {
          const v = searchParams.get(`${tienTo}${bl.key}`);
          if (v) banDau[bl.key] = v;
        }
      }
      return banDau;
    },
  );
  // Dòng lọc nâng cao: mở sẵn nếu URL đang có giá trị lọc nâng cao
  const [moNangCao, setMoNangCao] = useState<boolean>(() =>
    (boLocNangCao ?? []).some((bl) => !!giaTriLoc[bl.key]),
  );
  const [trang, setTrang] = useState(
    dongBoUrl ? Number(searchParams.get(`${tienTo}p`)) || 1 : 1,
  );
  const [soBanGhi, setSoBanGhi] = useState(
    dongBoUrl ? Number(searchParams.get(`${tienTo}n`)) || 20 : 20,
  );
  const [khoaChon, setKhoaChon] = useState<Key[]>([]);
  const [hangChon, setHangChon] = useState<T[]>([]);

  // Nhớ cột hiển thị theo người dùng (DS-D2)
  const khoaCot = `bang-cot-${maBang}`;
  const [cotHien, setCotHien] = useState<string[]>(() => {
    try {
      const luu = localStorage.getItem(khoaCot);
      if (luu) return JSON.parse(luu);
    } catch {
      /* bỏ qua */
    }
    return cot.filter((c) => !c.anMacDinh).map((c) => String(c.key ?? c.dataIndex));
  });
  // Cột sinh sau lần render đầu (VD số cột điểm phụ thuộc dữ liệu tải về) → mặc định hiện, trừ cột anMacDinh
  const [cotDaBiet] = useState(() => new Set(cot.map((c) => String(c.key ?? c.dataIndex))));
  useEffect(() => {
    const moi = cot.filter((c) => !cotDaBiet.has(String(c.key ?? c.dataIndex)));
    if (!moi.length) return;
    moi.forEach((c) => cotDaBiet.add(String(c.key ?? c.dataIndex)));
    const hien = moi.filter((c) => !c.anMacDinh).map((c) => String(c.key ?? c.dataIndex));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hien.length) setCotHien((cu) => [...cu, ...hien.filter((k) => !cu.includes(k))]);
  }, [cot, cotDaBiet]);

  useEffect(() => {
    if (!dongBoUrl) return;
    const moi = new URLSearchParams(searchParams);
    const dat = (k: string, v?: string) => {
      if (v) moi.set(`${tienTo}${k}`, v);
      else moi.delete(`${tienTo}${k}`);
    };
    dat('q', tuKhoa || undefined);
    dat('p', trang > 1 ? String(trang) : undefined);
    dat('n', soBanGhi !== 20 ? String(soBanGhi) : undefined);
    for (const bl of [...(boLoc ?? []), ...(boLocNangCao ?? [])])
      dat(bl.key, giaTriLoc[bl.key]);
    setSearchParams(moi, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tuKhoa, trang, soBanGhi, giaTriLoc]);

  const duLieuLoc = useMemo(() => {
    let kq = duLieu;
    if (tuKhoa && timKiem) kq = kq.filter((r) => timKiem(r, tuKhoa));
    for (const bl of [...(boLoc ?? []), ...(boLocNangCao ?? [])]) {
      const v = giaTriLoc[bl.key];
      if (v && bl.locItem) kq = kq.filter((r) => bl.locItem!(r, v));
    }
    return kq;
  }, [duLieu, tuKhoa, giaTriLoc, boLoc, boLocNangCao, timKiem]);

  const doiLoc = (key: string, v?: string) => {
    const moi = { ...giaTriLoc, [key]: v };
    setGiaTriLoc(moi);
    setTrang(1);
    onLocThayDoi?.(moi, tuKhoa);
  };

  // Báo giá trị lọc ban đầu (đọc từ URL) cho cha — phục vụ bộ lọc phụ thuộc
  useEffect(() => {
    onLocThayDoi?.(giaTriLoc, tuKhoa);
    phanTrangMayChu?.onDoiTrang(trang, soBanGhi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bộ lọc bị khóa, hoặc giá trị không còn nằm trong danh sách lựa chọn → tự xóa
  useEffect(() => {
    const canXoa = [...(boLoc ?? []), ...(boLocNangCao ?? [])].filter((bl) => {
      const v = giaTriLoc[bl.key];
      if (!v) return false;
      if (bl.disabled) return true;
      return bl.luaChon.length > 0 && !bl.luaChon.some((lc) => lc.value === v);
    });
    if (!canXoa.length) return;
    const moi = { ...giaTriLoc };
    for (const bl of canXoa) moi[bl.key] = undefined;
    setGiaTriLoc(moi);
    onLocThayDoi?.(moi, tuKhoa);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boLoc, boLocNangCao]);

  // Cột thao tác: ≤2 nút hiện cả; >2 hiện 1 nút hay dùng nhất + menu ⋮
  const cotThaoTac: ColumnType<T> | null = useMemo(() => {
    if (!hanhDong?.length) return null;
    // Số nút NHIỀU NHẤT thực sự hiện trên một hàng (không theo số thao tác khai báo)
    const soNutToiDa = () => Math.max(1, ...duLieu.map((b) => hanhDong.filter((h) => !h.an?.(b)).length));
    return {
      title: thaoTacGon ? '' : 'Thao tác',
      key: 'thao-tac',
      fixed: 'right',
      width: thaoTacGon
        ? 16 + soNutToiDa() * 32
        : hienTatCaThaoTac
          ? 24 + soNutToiDa() * 96
          : hanhDong.length > 2 ? 150 : 120 + (hanhDong.length - 1) * 70,
      render: (_: unknown, banGhi: T) => {
        const hienThi = hanhDong.filter((h) => !h.an?.(banGhi));
        if (!hienThi.length) return null;
        const gomMenu = !hienTatCaThaoTac && !thaoTacGon && hienThi.length > 2;
        const truoc = gomMenu ? hienThi.slice(0, 1) : hienThi;
        const trongMenu = gomMenu ? hienThi.slice(1) : [];
        const nutTheo = (h: HanhDongHang<T>) => {
          const biKhoa = h.disabled?.(banGhi) ?? false;
          if (h.menuCon) {
            return (
              <Dropdown
                key={h.key}
                trigger={['click']}
                disabled={biKhoa}
                menu={{
                  items: h.menuCon(banGhi).map((m) => ({
                    key: m.key,
                    label: m.nhan,
                    icon: m.icon,
                    onClick: ({ domEvent }) => {
                      domEvent.stopPropagation();
                      m.onClick();
                    },
                  })),
                }}
              >
                <Button size="small" type="text" icon={h.icon} onClick={(e) => e.stopPropagation()}>
                  {h.nhan} <DownOutlined style={{ fontSize: 10 }} />
                </Button>
              </Dropdown>
            );
          }
          const nut = (
            <Button
              key={h.key}
              size="small"
              icon={h.icon}
              danger={h.loai === 'nguy-hiem'}
              type="text"
              style={
                h.loai === 'chinh' && !biKhoa
                  ? { color: 'var(--primary)' }
                  : undefined
              }
              disabled={biKhoa}
              aria-label={thaoTacGon ? h.nhan : undefined}
              onClick={(e) => {
                e.stopPropagation();
                h.onClick(banGhi);
              }}
            >
              {thaoTacGon ? null : h.nhan}
            </Button>
          );
          if (thaoTacGon)
            return (
              <Tooltip key={h.key} title={biKhoa ? (h.tooltipDisabled ?? h.nhan) : h.nhan}>
                {nut}
              </Tooltip>
            );
          return biKhoa && h.tooltipDisabled ? (
            <Tooltip key={h.key} title={h.tooltipDisabled}>
              {nut}
            </Tooltip>
          ) : (
            nut
          );
        };
        return (
          <Space size={0} onClick={(e) => e.stopPropagation()}>
            {truoc.map(nutTheo)}
            {trongMenu.length > 0 && (
              <Dropdown
                menu={{
                  items: trongMenu.map((h) =>
                    h.menuCon
                      ? {
                          key: h.key,
                          label: h.nhan,
                          icon: h.icon,
                          disabled: h.disabled?.(banGhi) ?? false,
                          children: h.menuCon(banGhi).map((m) => ({
                            key: `${h.key}-${m.key}`,
                            label: m.nhan,
                            icon: m.icon,
                            onClick: () => m.onClick(),
                          })),
                        }
                      : {
                          key: h.key,
                          label: h.nhan,
                          icon: h.icon,
                          danger: h.loai === 'nguy-hiem',
                          disabled: h.disabled?.(banGhi) ?? false,
                          onClick: () => h.onClick(banGhi),
                        },
                  ),
                }}
                trigger={['click']}
              >
                <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thao tác khác" />
              </Dropdown>
            )}
          </Space>
        );
      },
    };
  }, [hanhDong, hienTatCaThaoTac, thaoTacGon, duLieu]);

  const cotStt: ColumnType<T> = {
    title: 'STT',
    key: 'stt',
    width: 60,
    fixed: 'left',
    align: 'center',
    render: (_: unknown, __: T, i: number) => (trang - 1) * soBanGhi + i + 1,
  };

  const cacCotHien = useMemo(() => {
    const loc = cot.filter((c) => cotHien.includes(String(c.key ?? c.dataIndex)));
    return [...(anStt ? [] : [cotStt]), ...loc, ...(cotThaoTac ? [cotThaoTac] : [])];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cot, cotHien, cotThaoTac, trang, soBanGhi, anStt]);

  const chonCotPopover = (
    <div style={{ maxHeight: 320, overflow: 'auto', minWidth: 220 }}>
      {cot.map((c) => {
        const k = String(c.key ?? c.dataIndex);
        return (
          <div key={k} style={{ padding: '4px 0' }}>
            <Checkbox
              checked={cotHien.includes(k)}
              onChange={(e) => {
                const moi = e.target.checked
                  ? [...cotHien, k]
                  : cotHien.filter((x) => x !== k);
                setCotHien(moi);
                try {
                  localStorage.setItem(khoaCot, JSON.stringify(moi));
                } catch {
                  /* bỏ qua */
                }
              }}
            >
              {typeof c.title === 'function' ? k : (c.title as ReactNode)}
            </Checkbox>
          </div>
        );
      })}
    </div>
  );

  const selectLoc = (bl: BoLocBang<T>) => (
    <Select
      key={bl.key}
      allowClear
      showSearch
      disabled={bl.disabled}
      placeholder={bl.nhan}
      style={{ minWidth: bl.doRong ?? 150 }}
      popupMatchSelectWidth={false}
      value={giaTriLoc[bl.key]}
      onChange={(v) => doiLoc(bl.key, v)}
      filterOption={(input, option) =>
        khopTimKiem(input, String(option?.label ?? ''))
      }
      options={bl.luaChon.map((lc) => ({ value: lc.value, label: lc.label }))}
    />
  );

  const soLocNangCaoDangAp = (boLocNangCao ?? []).filter(
    (bl) => !!giaTriLoc[bl.key],
  ).length;

  const dongLoc = (
    <>
      <div className="bang-chuan__dong-loc">
        {truocTimKiem}
        {(boLoc ?? []).map(selectLoc)}
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={placeholderTimKiem}
          value={tuKhoa}
          style={{ width: doRongTimKiem }}
          onChange={(e) => {
            setTuKhoa(e.target.value);
            setTrang(1);
            onLocThayDoi?.(giaTriLoc, e.target.value);
          }}
        />
        {/* Lọc mở rộng nằm cùng dòng lọc (tự xuống dòng liền mạch), không tách hàng riêng */}
        {!!boLocNangCao?.length && moNangCao && boLocNangCao.map(selectLoc)}
        {!!boLocNangCao?.length &&
          (moNangCao ? (
            <Button type="text" icon={<UpOutlined />} onClick={() => setMoNangCao(false)}>
              Ẩn
            </Button>
          ) : (
            <Button icon={<FilterOutlined />} onClick={() => setMoNangCao(true)}>
              Thêm lọc{soLocNangCaoDangAp ? ` (${soLocNangCaoDangAp})` : ''}
            </Button>
          ))}
        <div className="bang-chuan__loc-phai">
          {khongBox && nutTrai}
          <Popover content={chonCotPopover} trigger="click" placement="bottomRight">
            <Tooltip title="Chọn cột">
              <Button icon={<AppstoreAddOutlined />} aria-label="Chọn cột hiển thị" />
            </Tooltip>
          </Popover>
        </div>
      </div>
    </>
  );

  const boChon = () => {
    setKhoaChon([]);
    setHangChon([]);
  };

  const bang = (
    <div className="bang-chuan">
      {phanTren && <div className="bang-chuan__phan-tren">{phanTren}</div>}
      {dongLoc}
      {chonNhieu && khoaChon.length > 0 && thanhChonNhieu && (
        <div className="bang-chuan__thanh-chon">
          <span>
            Đã chọn <b>{khoaChon.length}</b> mục
          </span>
          {thanhChonNhieu(khoaChon, hangChon, boChon)}
        </div>
      )}
      <Table<T>
        size="middle"
        sticky
        columns={cacCotHien}
        dataSource={duLieuLoc}
        loading={dangTai}
        rowKey={rowKey}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={moTaRong}
            />
          ),
        }}
        rowSelection={
          chonNhieu
            ? {
                selectedRowKeys: khoaChon,
                onChange: (keys, rows) => {
                  setKhoaChon(keys);
                  setHangChon(rows);
                },
                fixed: true,
              }
            : undefined
        }
        onRow={(banGhi) =>
          onClickHang
            ? {
                onClick: () => onClickHang(banGhi),
                className: 'hang-click',
              }
            : {}
        }
        pagination={{
          current: trang,
          pageSize: soBanGhi,
          total: phanTrangMayChu ? phanTrangMayChu.tongSo : duLieuLoc.length,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (tong) => `Tổng: ${tong.toLocaleString('vi-VN')} bản ghi`,
          onChange: (p, n) => {
            const trangMoi = phanTrangMayChu && n !== soBanGhi ? 1 : p;
            setTrang(trangMoi);
            setSoBanGhi(n);
            phanTrangMayChu?.onDoiTrang(trangMoi, n);
          },
        }}
      />
    </div>
  );

  if (khongBox) {
    return (
      <div>
        {phanPhaiHeader && (
          <div className="bang-chuan__header-tab">
            <span />
            {phanPhaiHeader}
          </div>
        )}
        {bang}
      </div>
    );
  }

  return (
    <BoxNoiDung
      tieuDe={tieuDe}
      moTa={moTa}
      nutTrai={nutTrai}
      nutQuayLai={nutQuayLai}
      duongDanQuayLai={duongDanQuayLai}
      huongDan={huongDan}
      phanPhai={phanPhaiHeader}
      khongPadding
    >
      {bang}
    </BoxNoiDung>
  );
}
