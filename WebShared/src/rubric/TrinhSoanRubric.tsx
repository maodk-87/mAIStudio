/**
 * Trình soạn rubric dạng cây (SRS mục 4, FR-RB-020 … 028): mỗi dòng = mã · loại · mô tả · điểm tối đa (nút cha tự tính);
 * dòng đang chọn mở khung chi tiết ngay bên dưới (dùng được cả trong cột hẹp của màn soạn câu và trang rộng của tổ).
 * Thanh trên: tổng "x / điểm câu" (đỏ khi lệch, xanh khi khớp), lỗi/cảnh báo VR (bấm để tới nút), áp mẫu, dán bảng,
 * xem trước như giám khảo, xuất PDF/Word. Phím: Enter thêm cùng cấp · Tab thụt vào · Shift+Tab thụt ra · Ctrl+↑/↓ đổi thứ tự.
 */
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  ImportOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  PlusOutlined,
  SaveOutlined,
  SnippetsOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { Alert, Button, Drawer, Dropdown, Empty, Input, InputNumber, Modal, Space, Tag, Tooltip, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { CayRubric, CheDoRubric, DuLieuChamRubric, LoaiNutRubric, NutRubric } from './types';
import { useXacNhan } from './useXacNhan';
import type { MauRubricLuaChon as MauRubric, NguonSoanRubric, NhanRubricLuaChon } from './nguon';
import { useThongBao } from '../oeditor/useThongBao';
import { NoiDungOEditor } from '../oeditor';
import {
  chuThuan,
  conDuocPhep,
  doiNhanh,
  doSau,
  duyetCay,
  dungCayTuBangDan,
  hienDiem,
  kiemTraHopLe,
  laHtml,
  laNutLa,
  lapChiMuc,
  nhanLoaiNut,
  saoChepCay,
  sinhMaHienThi,
  taoCayMacDinh,
  tinhDiem,
  tinhDiemToiDa,
} from './tinhToan';
import {
  doiLoaiNut,
  doiThuTu,
  nhanBanNhanh,
  suaNut,
  themCon,
  themCungCap,
  thutRa,
  thutVao,
  xoaNut,
  type KetQuaThaoTac,
} from './thaoTac';
import BangChamRubric from './BangChamRubric';
import ChiTietNutRubric from './ChiTietNutRubric';
import { inHuongDanCham, taiWordHuongDanCham } from './xuatHuongDanCham';
import './rubric.scss';

export interface TrinhSoanRubricProps {
  value?: CayRubric;
  onChange: (cay: CayRubric) => void;
  /** Điểm mục tiêu của câu (ma trận với ĐGĐK, người soạn đặt với ĐGTX) — VR-01 */
  diemMucTieu: number;
  cheDo?: CheDoRubric;
  monHocId?: string;
  khoiId?: string;
  chiDoc?: boolean;
  /** Mã gốc (số câu) để sinh mã hiển thị 3, 3.a, 3.a.1 */
  maGoc?: string;
  /** Tiêu đề khi xuất hướng dẫn chấm */
  tieuDe?: string;
  buocChoPhep?: number[];
  /** Hiện nút "Lưu làm mẫu" (tổ) */
  onLuuMau?: (cay: CayRubric) => void;
  /** Nguồn nhãn + mẫu rubric của web (không có → nhãn rỗng, ẩn "Áp mẫu") */
  nguon?: NguonSoanRubric;
}

const nhanNgan: Record<LoaiNutRubric, string> = {
  nhom: 'Nhóm',
  'phuong-an': 'Phương án',
  'tieu-chi': 'Tiêu chí',
  'tieu-chi-muc': 'Theo mức',
  'diem-tru': 'Điểm trừ',
};

export default function TrinhSoanRubric({
  value,
  onChange,
  diemMucTieu,
  cheDo = 'dgdk',
  monHocId,
  khoiId,
  chiDoc,
  maGoc = 'Câu',
  tieuDe = 'Hướng dẫn chấm',
  buocChoPhep = [0.25, 0.5, 1],
  onLuuMau,
  nguon,
}: TrinhSoanRubricProps) {
  const xacNhan = useXacNhan();
  const thongBao = useThongBao();
  const cay = useMemo(() => value ?? taoCayMacDinh(diemMucTieu, maGoc), [value, diemMucTieu, maGoc]);
  const cm = useMemo(() => lapChiMuc(cay), [cay]);
  const [khoaChon, setKhoaChon] = useState<string | undefined>();
  const [thuGonKhoa, setThuGonKhoa] = useState<Set<string>>(new Set());
  const [nhan, setNhan] = useState<NhanRubricLuaChon>({ donViKienThuc: [], yeuCauCanDat: [], mucDoNhanThuc: [] });
  const [moMau, setMoMau] = useState(false);
  const [dsMau, setDsMau] = useState<MauRubric[]>([]);
  const [moDan, setMoDan] = useState(false);
  const [bangDan, setBangDan] = useState('');
  const [moXemTruoc, setMoXemTruoc] = useState(false);
  const [phieuThu, setPhieuThu] = useState<DuLieuChamRubric>({ giaTri: {}, nhanhChon: {} });
  const [hienVanDe, setHienVanDe] = useState(true);
  const oMoTa = useRef<Record<string, HTMLInputElement | null>>({});
  const canFocus = useRef<string | undefined>(undefined);

  const layNhan = nguon?.layNhanRubric;
  useEffect(() => {
    layNhan?.(monHocId, khoiId).then(setNhan);
  }, [layNhan, monHocId, khoiId]);

  // Cây chưa có (câu mới) → khởi tạo cho người dùng
  useEffect(() => {
    if (!value && !chiDoc) onChange(cay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canFocus.current) {
      oMoTa.current[canFocus.current]?.focus();
      canFocus.current = undefined;
    }
  });

  const tong = tinhDiemToiDa(cm);
  const khop = Math.round(tong * 100) === Math.round(diemMucTieu * 100);
  const vanDe = useMemo(() => kiemTraHopLe(cay, { diemMucTieu, cheDo, buocChoPhep }), [cay, diemMucTieu, cheDo, buocChoPhep]);
  const soLoi = vanDe.filter((v) => v.mucDo === 'loi').length;
  const nutLoi = new Set(vanDe.filter((v) => v.mucDo === 'loi' && v.khoaNut).map((v) => v.khoaNut));

  const apDung = (kq: KetQuaThaoTac, focus = false) => {
    if ('loi' in kq) {
      thongBao.loi(kq.loi);
      return;
    }
    onChange(kq.cay);
    if (kq.khoaChon) {
      setKhoaChon(kq.khoaChon);
      if (focus) canFocus.current = kq.khoaChon;
    }
  };

  const phimMoTa = (e: KeyboardEvent<HTMLInputElement>, n: NutRubric) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      apDung(n.khoaCha ? themCungCap(cay, n.khoaNut, 'tieu-chi', maGoc) : themCon(cay, n.khoaNut, 'tieu-chi', maGoc), true);
    } else if (e.key === 'Tab' && !e.ctrlKey) {
      e.preventDefault();
      apDung(e.shiftKey ? thutRa(cay, n.khoaNut, maGoc) : thutVao(cay, n.khoaNut, maGoc), true);
    } else if (e.ctrlKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      apDung(doiThuTu(cay, n.khoaNut, e.key === 'ArrowUp' ? -1 : 1, maGoc), true);
    }
  };

  const xoa = (n: NutRubric) => {
    const soCon = duyetCay(cm, n.khoaNut).length - 1;
    if (!soCon) return apDung(xoaNut(cay, n.khoaNut, maGoc));
    xacNhan({
      tieuDe: `Xóa ${nhanLoaiNut[n.loai].toLowerCase()}?`,
      doiTuong: `${n.maHienThi} ${chuThuan(n.moTa)}`,
      anhHuong: `Nút có ${soCon} nút con — tất cả sẽ bị xóa khỏi rubric.`,
      nhanNutXacNhan: 'Xóa',
      mucDo: 'do',
      onXacNhan: () => apDung(xoaNut(cay, n.khoaNut, maGoc)),
    });
  };

  const moMauRubric = async () => {
    if (!nguon?.layDanhSachMauRubric) return;
    setDsMau(await nguon.layDanhSachMauRubric({ monHocId, chiDaPhatHanh: true }));
    setMoMau(true);
  };

  const apMau = (m: MauRubric) => {
    const apDungMau = () => {
      const moi = sinhMaHienThi(saoChepCay(m.cay), maGoc);
      onChange(moi);
      setMoMau(false);
      setKhoaChon(undefined);
      thongBao.thanhCong(`Đã áp mẫu "${m.ten}" (bản sao — sửa mẫu sau này không ảnh hưởng)`);
    };
    if (duyetCay(cm).length > 2)
      xacNhan({
        tieuDe: 'Thay rubric hiện tại bằng mẫu?',
        doiTuong: m.ten,
        anhHuong: 'Rubric đang soạn của câu sẽ bị thay thế bằng bản sao của mẫu.',
        nhanNutXacNhan: 'Áp mẫu',
        mucDo: 'cam',
        onXacNhan: apDungMau,
      });
    else apDungMau();
  };

  const apBangDan = () => {
    const moi = dungCayTuBangDan(bangDan, maGoc);
    if (moi.nut.length < 2) return thongBao.loi('Không đọc được dòng nào — dán bảng 4 cột: Câu | Ý | Nội dung đáp án | Điểm');
    onChange(moi);
    setMoDan(false);
    setBangDan('');
    thongBao.thanhCong(`Đã dựng ${moi.nut.length - 1} nút từ bảng dán — rà lại loại nút và nhãn trước khi lưu`);
  };

  const menuThemCon = (n: NutRubric) =>
    conDuocPhep[n.loai].map((loai) => ({
      key: `con-${loai}`,
      label: nhanLoaiNut[loai],
      onClick: () => apDung(themCon(cay, n.khoaNut, loai, maGoc), true),
    }));

  const menuKhac = (n: NutRubric) => [
    ...(n.khoaCha
      ? [
          {
            key: 'cung-cap',
            label: 'Thêm cùng cấp',
            icon: <PlusOutlined />,
            children: conDuocPhep[cm.theoKhoa.get(n.khoaCha)!.loai].map((loai) => ({
              key: `cc-${loai}`,
              label: nhanLoaiNut[loai],
              onClick: () => apDung(themCungCap(cay, n.khoaNut, loai, maGoc), true),
            })),
          },
        ]
      : []),
    {
      key: 'doi-loai',
      label: 'Đổi loại',
      icon: <SwapOutlined />,
      children: (Object.keys(nhanLoaiNut) as LoaiNutRubric[])
        .filter((l) => l !== n.loai)
        .map((loai) => ({ key: `dl-${loai}`, label: nhanLoaiNut[loai], onClick: () => apDung(doiLoaiNut(cay, n.khoaNut, loai, maGoc)) })),
    },
    ...(n.khoaCha
      ? [
          { key: 'vao', label: 'Thụt vào (Tab)', icon: <MenuUnfoldOutlined />, onClick: () => apDung(thutVao(cay, n.khoaNut, maGoc)) },
          { key: 'ra', label: 'Thụt ra (Shift+Tab)', icon: <MenuFoldOutlined />, onClick: () => apDung(thutRa(cay, n.khoaNut, maGoc)) },
          { key: 'len', label: 'Lên (Ctrl+↑)', icon: <ArrowUpOutlined />, onClick: () => apDung(doiThuTu(cay, n.khoaNut, -1, maGoc)) },
          { key: 'xuong', label: 'Xuống (Ctrl+↓)', icon: <ArrowDownOutlined />, onClick: () => apDung(doiThuTu(cay, n.khoaNut, 1, maGoc)) },
          { key: 'nhan-ban', label: 'Nhân bản nhánh', icon: <CopyOutlined />, onClick: () => apDung(nhanBanNhanh(cay, n.khoaNut, maGoc)) },
          { type: 'divider' as const },
          { key: 'xoa', label: 'Xóa', icon: <DeleteOutlined />, danger: true, onClick: () => xoa(n) },
        ]
      : []),
  ];

  /** Nút bị ẩn vì tổ tiên đang thu gọn */
  const biAn = (n: NutRubric) => {
    let k = n.khoaCha;
    while (k) {
      if (thuGonKhoa.has(k)) return true;
      k = cm.theoKhoa.get(k)?.khoaCha ?? null;
    }
    return false;
  };

  const oToiDa = (n: NutRubric) => {
    if (!n.khoaCha)
      return (
        <span className={`trinh-soan-rubric__tong ${khop ? 'dat' : 'lech'}`} style={{ fontSize: 14 }}>
          {hienDiem(tong)} / {hienDiem(diemMucTieu)}
        </span>
      );
    if (n.loai === 'tieu-chi' || n.loai === 'diem-tru')
      return chiDoc ? (
        <span>{n.loai === 'diem-tru' ? '−' : ''}{hienDiem(n.diemToiDa)}</span>
      ) : (
        <InputNumber
          size="small"
          min={0}
          step={n.buocDiem ?? 0.25}
          value={n.diemToiDa}
          prefix={n.loai === 'diem-tru' ? '−' : undefined}
          style={{ width: 100 }}
          onClick={(e) => e.stopPropagation()}
          onChange={(v) => onChange(suaNut(cay, n.khoaNut, { diemToiDa: v ?? 0 }))}
          aria-label={`Điểm tối đa ${n.maHienThi}`}
        />
      );
    if (n.loai === 'tieu-chi-muc') return <span>{hienDiem(tinhDiemToiDa(cm, n.khoaNut))}</span>;
    return <b>{hienDiem(tinhDiemToiDa(cm, n.khoaNut))}</b>;
  };

  const dongNut = (n: NutRubric) => {
    const cap = doSau(cm, n.khoaNut);
    const coCon = !laNutLa(n) && (cm.con.get(n.khoaNut)?.length ?? 0) > 0;
    const chon = khoaChon === n.khoaNut;
    const cha = n.khoaCha ? cm.theoKhoa.get(n.khoaCha) : undefined;
    const thuTuNhanh = cha?.loai === 'phuong-an' ? n.thuTu + 1 : undefined;
    return (
      <div key={n.khoaNut}>
        <div
          className={`trinh-soan-rubric__dong ${chon ? 'chon' : ''} ${nutLoi.has(n.khoaNut) ? 'co-loi' : ''}`}
          onClick={() => setKhoaChon(chon ? undefined : n.khoaNut)}
        >
          <div className="trinh-soan-rubric__noi-dung">
            {Array.from({ length: cap }, (_, i) => (
              <span key={i} className="trinh-soan-rubric__thut" style={{ width: 14 }} />
            ))}
            {coCon ? (
              <Button
                type="text"
                size="small"
                style={{ width: 20, padding: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setThuGonKhoa((s) => {
                    const m = new Set(s);
                    if (m.has(n.khoaNut)) m.delete(n.khoaNut);
                    else m.add(n.khoaNut);
                    return m;
                  });
                }}
                aria-label="Thu gọn / mở rộng"
              >
                {thuGonKhoa.has(n.khoaNut) ? '▸' : '▾'}
              </Button>
            ) : (
              <span style={{ width: 20, flex: 'none' }} />
            )}
            <span className="trinh-soan-rubric__ma">{n.maHienThi}</span>
            <span className={`trinh-soan-rubric__loai ${n.loai}`}>
              {thuTuNhanh ? (n.laNhanhMo ? 'Cách khác' : `Cách ${thuTuNhanh}`) : nhanNgan[n.loai]}
            </span>
            <div className="trinh-soan-rubric__mo-ta">
              {chiDoc || laHtml(n.moTa) ? (
                // Mô tả có công thức toán: hiển thị công thức, sửa ở khung chi tiết bên dưới (bấm dòng để chọn)
                n.moTa ? (
                  <Tooltip title={chiDoc ? undefined : 'Có công thức — sửa ở ô Mô tả tiêu chí bên dưới'}>
                    <span className="trinh-soan-rubric__mo-ta-html">
                      <NoiDungOEditor html={n.moTa} inline />
                    </span>
                  </Tooltip>
                ) : (
                  <Typography.Text>
                    <i>(chưa có mô tả)</i>
                  </Typography.Text>
                )
              ) : (
                <Input
                  variant="borderless"
                  ref={(el) => {
                    oMoTa.current[n.khoaNut] = el?.input ?? null;
                  }}
                  value={n.moTa}
                  placeholder={n.khoaCha ? 'Mô tả tiêu chí…' : 'Mô tả câu (VD: Giải bài toán bằng cách lập phương trình)'}
                  status={!chuThuan(n.moTa).trim() ? 'warning' : undefined}
                  onFocus={() => setKhoaChon(n.khoaNut)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onChange(suaNut(cay, n.khoaNut, { moTa: e.target.value }))}
                  onKeyDown={(e) => phimMoTa(e, n)}
                  aria-label={`Mô tả ${n.maHienThi}`}
                />
              )}
            </div>
          </div>
          <div className="trinh-soan-rubric__toi-da">{oToiDa(n)}</div>
          <div style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
            {!chiDoc && (
              <Space size={0}>
                {conDuocPhep[n.loai].length > 0 && (
                  <Dropdown menu={{ items: menuThemCon(n) }} trigger={['click']}>
                    <Tooltip title="Thêm nút con">
                      <Button type="text" size="small" icon={<PlusOutlined />} aria-label="Thêm nút con" />
                    </Tooltip>
                  </Dropdown>
                )}
                <Dropdown menu={{ items: menuKhac(n) }} trigger={['click']}>
                  <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Thao tác khác" />
                </Dropdown>
              </Space>
            )}
          </div>
        </div>
        {chon && (
          <div className="trinh-soan-rubric__chi-tiet">
            <ChiTietNutRubric cay={cay} nut={n} nhan={nhan} buocChoPhep={buocChoPhep} chiDoc={chiDoc} onDoi={onChange} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="trinh-soan-rubric">
      <div className="trinh-soan-rubric__thanh">
        <span className={`trinh-soan-rubric__tong ${khop ? 'dat' : 'lech'}`}>
          Tổng rubric {hienDiem(tong)} / {hienDiem(diemMucTieu)} điểm
        </span>
        {soLoi > 0 ? (
          <Tag color="error" style={{ cursor: 'pointer' }} onClick={() => setHienVanDe((x) => !x)}>
            {soLoi} lỗi
          </Tag>
        ) : (
          <Tag color="success">Hợp lệ</Tag>
        )}
        {vanDe.length - soLoi > 0 && (
          <Tag color="warning" style={{ cursor: 'pointer' }} onClick={() => setHienVanDe((x) => !x)}>
            {vanDe.length - soLoi} cảnh báo
          </Tag>
        )}
        <Space wrap size={4} style={{ marginLeft: 'auto' }}>
          {!chiDoc && (
            <>
              {nguon?.layDanhSachMauRubric && (
                <Button size="small" icon={<SnippetsOutlined />} onClick={moMauRubric}>
                  Áp mẫu
                </Button>
              )}
              <Button size="small" icon={<ImportOutlined />} onClick={() => setMoDan(true)}>
                Dán bảng
              </Button>
              {onLuuMau && (
                <Button size="small" icon={<SaveOutlined />} onClick={() => onLuuMau(cay)}>
                  Lưu làm mẫu
                </Button>
              )}
            </>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setPhieuThu({ giaTri: {}, nhanhChon: {} });
              setMoXemTruoc(true);
            }}
          >
            Xem trước như giám khảo
          </Button>
          <Dropdown
            menu={{
              items: [
                { key: 'pdf', icon: <FilePdfOutlined />, label: 'In / lưu PDF', onClick: () => inHuongDanCham(cay, tieuDe) && thongBao.thanhCong('Đã mở hộp thoại in — chọn máy in «Lưu dưới dạng PDF»') },
                {
                  key: 'word',
                  icon: <FileWordOutlined />,
                  label: 'Tải Word (.docx)',
                  onClick: () =>
                    taiWordHuongDanCham(cay, tieuDe)
                      .then(() => thongBao.thanhCong('Đã tạo tệp Word (.docx) — kiểm tra thư mục Tải xuống'))
                      .catch(() => thongBao.loi('Không tạo được tệp Word')),
                },
              ],
            }}
          >
            <Button size="small" icon={<FilePdfOutlined />}>
              Xuất hướng dẫn chấm
            </Button>
          </Dropdown>
        </Space>
      </div>

      <div className="trinh-soan-rubric__tieu-de-cot">
        <span>Cây tiêu chí</span>
        <span style={{ textAlign: 'right' }}>Tối đa</span>
        <span />
      </div>
      {duyetCay(cm).filter((n) => !biAn(n)).map(dongNut)}
      {!chiDoc && (
        <div className="trinh-soan-rubric__goi-y-phim">
          Trong ô mô tả: <kbd>Enter</kbd> thêm tiêu chí cùng cấp · <kbd>Tab</kbd> biến thành con của nút phía trên ·{' '}
          <kbd>Shift</kbd>+<kbd>Tab</kbd> đưa ra một cấp · <kbd>Ctrl</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd> đổi thứ tự. Bấm dòng để mở chi tiết
          (đáp án mẫu, bước điểm, mức, nhãn).
        </div>
      )}

      {hienVanDe && vanDe.length > 0 && (
        <div className="trinh-soan-rubric__van-de">
          {vanDe.map((v, i) => (
            <div
              key={i}
              className="trinh-soan-rubric__van-de-dong"
              onClick={() => {
                if (!v.khoaNut) return;
                setThuGonKhoa(new Set());
                setKhoaChon(v.khoaNut);
              }}
            >
              <Tag color={v.mucDo === 'loi' ? 'error' : 'warning'} style={{ margin: 0 }}>
                {v.ma}
              </Tag>
              <span>{v.thongBao}</span>
            </div>
          ))}
        </div>
      )}

      <Modal open={moMau} title="Áp mẫu rubric của tổ" footer={null} width={720} onCancel={() => setMoMau(false)}>
        <Typography.Paragraph type="secondary">
          Áp mẫu là <b>sao chép</b>: rubric của câu không liên kết với mẫu, sửa mẫu sau này không ảnh hưởng.
        </Typography.Paragraph>
        {dsMau.length ? (
          dsMau.map((m) => (
            <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ flex: 1 }}>
                <b>{m.ten}</b>
                <div style={{ fontSize: 13, color: '#667085' }}>
                  {m.moTa ?? ''} · {hienDiem(m.diemMucTieu)} điểm · {m.cay.nut.length - 1} nút{m.nguoiTao ? ` · ${m.nguoiTao}` : ''}
                </div>
              </div>
              {Math.round(m.diemMucTieu * 100) !== Math.round(diemMucTieu * 100) && <Tag color="warning">Khác điểm câu</Tag>}
              <Button type="primary" ghost onClick={() => apMau(m)}>
                Áp dụng
              </Button>
            </div>
          ))
        ) : (
          <Empty description="Tổ chưa phát hành mẫu rubric cho môn này" />
        )}
      </Modal>

      <Modal
        open={moDan}
        title="Dựng rubric từ bảng hướng dẫn chấm"
        okText="Dựng cây"
        onOk={apBangDan}
        okButtonProps={{ disabled: !bangDan.trim() }}
        onCancel={() => setMoDan(false)}
        width={760}
      >
        <Typography.Paragraph type="secondary">
          Sao chép bảng 4 cột <b>Câu | Ý | Nội dung đáp án | Điểm</b> từ Word/Excel và dán vào ô dưới. Dòng có cột Ý mở một ý; các dòng tiếp theo
          (chỉ có nội dung + điểm) là tiêu chí của ý đó. Rà lại loại nút, nhánh thay thế và nhãn trước khi lưu.
        </Typography.Paragraph>
        <Input.TextArea rows={10} value={bangDan} onChange={(e) => setBangDan(e.target.value)} placeholder={'3\t\t\t\n\ta\tLập phương trình\t\n\t\tChọn ẩn, điều kiện\t0,5\n\t\tPhương trình đúng\t0,5'} />
        {bangDan.trim() && (
          <Alert
            style={{ marginTop: 8 }}
            type="info"
            showIcon
            title={`Xem trước: tổng ${hienDiem(tinhDiemToiDa(dungCayTuBangDan(bangDan, maGoc)))} điểm · ${dungCayTuBangDan(bangDan, maGoc).nut.length - 1} nút`}
          />
        )}
      </Modal>

      <Drawer
        open={moXemTruoc}
        size={720}
        title="Xem trước như giám khảo (thử nhập — không lưu)"
        onClose={() => setMoXemTruoc(false)}
        extra={
          <span className="trinh-soan-rubric__tong dat">
            Câu: {hienDiem(tinhDiem(cm, phieuThu))} / {hienDiem(tong)}
          </span>
        }
      >
        <BangChamRubric
          cay={cay}
          duLieu={phieuThu}
          onGhi={(ds) =>
            setPhieuThu((p) => {
              const giaTri = { ...p.giaTri };
              ds.forEach((d) => {
                const n = cm.theoKhoa.get(d.khoaNut);
                const cu = giaTri[d.khoaNut] ?? { giaTri: null };
                const m = d.khoaMuc ? n?.muc?.find((x) => x.khoaMuc === d.khoaMuc) : undefined;
                giaTri[d.khoaNut] = {
                  giaTri: m ? m.diem : d.giaTri !== undefined ? d.giaTri : cu.giaTri,
                  khoaMuc: m?.khoaMuc ?? cu.khoaMuc,
                  ghiChu: d.ghiChu ?? cu.ghiChu,
                };
              });
              return { ...p, giaTri };
            })
          }
          onChonNhanh={(pa, nhanh) => setPhieuThu((p) => doiNhanh(cm, p, pa, nhanh))}
        />
      </Drawer>
    </div>
  );
}
