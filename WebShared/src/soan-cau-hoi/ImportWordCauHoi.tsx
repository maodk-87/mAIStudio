/**
 * Import câu hỏi từ file Word (docs/ui/5 mục 4, docs/13 mục 7):
 * Bước 1 chọn Môn + Khối (bắt buộc), Kho (mặc định kho hệ thống "Chưa phân kho"), Định dạng (3 mẫu cố định
 * Khảo thí số · TN THPT · Mặc định — hướng dẫn bóc tách theo mẫu ở modal ❓) rồi kéo-thả .docx → plugin oImportWord đọc tệp THẬT trên trình duyệt
 * và bóc tách từng câu theo sổ định dạng dùng chung (cùng định dạng với chức năng dán ở màn
 * soạn; công thức MathType/OMML → <span data-cong-thuc>) → Bước 2 màn soát: trái = danh sách
 * câu (render công thức KaTeX), phải = sửa nhanh bằng OEditor (gõ công thức, paste
 * Word) + phân loại đầy đủ (tiểu mục, CĐTD, TPNL, loại hình, điểm gợi ý, thẻ) + Xóa câu.
 */
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Input,
  InputNumber,
  Progress,
  Radio,
  Select,
  Steps,
  Tag,
  Tooltip,
  TreeSelect,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BoxNoiDung,
  FormSelect,
  khopTimKiem,
  useDirtyGuard,
  useXacNhan,
  type LuaChon,
} from '../giao-dien';
import { NoiDungOEditor as NoiDungHtml } from '../oeditor';
import { CapDoTuDuy, CheDoDaoCauHoi, LoaiCauHoi, TrangThaiNoiDung } from './hang';
import type { CauHinhSoanCauHoi, NguonSoanCauHoi, NguCanhTruongMoRong } from './nguon';
import type { DuLieuLuuCauHoi, KhoCauHoiChon, MucDanhMuc, NutChuDe } from './types';
import { luaChonCheDoDao, nhanLoaiCau } from './nhan';
import { OEditor } from '../oeditor';
import {
  danhSachMaLoaiCau,
  docTepWord,
  layMauImport,
  taoMaCauHoi,
  type CauHoiBocTach,
  type MaMauImport,
  type PhanLoaiTienTo,
  xuatTepMauImportWord,
} from '../oimportword';
import HuongDanMauImport from './HuongDanMauImport';
import { luaChonMauImport, useMauImport } from './useMauImport';
import './import-word-cau-hoi.scss';

export interface ImportWordCauHoiProps {
  /** Đường dẫn điều hướng sau khi lưu xong (danh sách câu hỏi / trang kho) */
  duongDanKetThuc: string;
  nguon: NguonSoanCauHoi;
  /** Dùng: phamVi, khoMacDinh, truongMoRong (trường riêng của hệ, có `macDinh`/`theDanhSach`) */
  cauHinh: Pick<CauHinhSoanCauHoi, 'phamVi' | 'khoMacDinh' | 'truongMoRong'>;
  /** Giới hạn lựa chọn môn/khối ở bước 1 (VD Tổ chuyên môn: môn + các khối của tổ) */
  monHocIds?: string[];
  khoiIds?: string[];
  /**
   * Lưu tùy biến thay cho "lưu từng câu vào Nháp" (VD NHCH import ĐỀ THI: gom câu thành 1 đề).
   * Ném lỗi để hủy lưu (ở lại màn soát); thông báo thành công do hàm này tự hiện.
   */
  onLuu?: (dsCau: DuLieuLuuCauHoi[]) => Promise<void>;
  /** Nhãn nút lưu chính (mặc định "Lưu tất cả câu hợp lệ vào Nháp") */
  nhanNutLuu?: string;
  /** Hiện nút "Quay lại" ở header box chính */
  nutQuayLai?: boolean;
  /** Đường dẫn quay lại cụ thể (mặc định: history back) */
  duongDanQuayLai?: string;
}

type TrangThaiBocTach = 'ok' | 'canh-bao' | 'loi';

/** '' = chưa phân biệt được loại câu — người soát phải chọn trước khi lưu */
type LoaiCauImport = LoaiCauHoi | '';

type PhuongAnImport = { id: string; noiDung: string; dung: boolean };

interface CauConBocTach {
  id: string;
  /** Mã câu hỏi con theo quy ước import, VD "CHC-TLN" */
  maCauHoi?: string;
  noiDung: string;
  loaiCau: LoaiCauImport;
  phuongAn: PhuongAnImport[];
  /** Đáp án đúng: trả lời ngắn / điền khuyết / "Đúng"|"Sai" của Đúng/Sai đơn */
  dapAnGoiY?: string;
}

interface CauBocTach {
  id: string;
  /** Mã câu hỏi theo quy ước import, VD "CH-TN1" */
  maCauHoi?: string;
  /** Mẫu TN THPT: tiền tố phân loại gốc trong tệp, VD "1.1_2_3_1" */
  maPhanLoai?: string;
  loaiCau: LoaiCauImport;
  /** HTML — công thức MathType bóc tách thành <span data-cong-thuc="LaTeX"> */
  noiDung: string;
  phuongAn: PhuongAnImport[];
  /** Đáp án đúng (trả lời ngắn / điền khuyết / Đúng-Sai đơn) hoặc lời giải (tự luận) */
  dapAnGoiY?: string;
  /** Ngữ liệu chung (câu hỏi nhóm/chùm) */
  nguLieu?: string;
  /** Danh sách câu hỏi con (câu hỏi nhóm/chùm) */
  cauCon?: CauConBocTach[];
  cdtd: CapDoTuDuy;
  tieuMucId?: string;
  tpnlIds: string[];
  diemGoiY: number;
  /** Kho riêng của câu — bỏ trống = theo kho chung của lượt nhập */
  khoId?: string;
  /** Giá trị trường riêng của hệ (khóa = TruongMoRong.khoa — VD mục đích sử dụng, loại hình thi, nhóm câu neo) */
  giaTriMoRong: Record<string, string | undefined>;
  /** Khả năng đảo lệnh hỏi/đáp án khi hoán vị đề — bắt buộc cài cho từng câu import */
  cheDoDao: CheDoDaoCauHoi;
  trangThai: TrangThaiBocTach;
  lyDo?: string;
}

const LOAI_CAU_HOP_LE = new Set<string>(Object.values(LoaiCauHoi));

/** Chế độ đảo mặc định theo loại câu (người soát chỉnh lại từng câu nếu cần) */
const cheDoDaoMacDinh = (loaiCau: LoaiCauImport): CheDoDaoCauHoi =>
  loaiCau === LoaiCauHoi.TracNghiem1DapAn ||
  loaiCau === LoaiCauHoi.TracNghiemNhieuDapAn ||
  loaiCau === LoaiCauHoi.DungSai4Y ||
  loaiCau === LoaiCauHoi.CauChum
    ? CheDoDaoCauHoi.DaoLenhHoiVaDapAn
    : CheDoDaoCauHoi.KhongDao;

let demIdImport = 0;
const idImport = () => `import-${Date.now().toString(36)}-${++demIdImport}`;

/** Loại câu plugin trả về mà web chưa hỗ trợ → coi như chưa phân loại (người soát chọn lại) */
const loaiCauAnToan = (loai: string): LoaiCauImport =>
  LOAI_CAU_HOP_LE.has(loai) ? (loai as LoaiCauHoi) : '';

/** Danh sách chọn loại câu cho câu chưa phân loại: theo danh mục mã CH-… của plugin */
const luaChonLoaiCau = danhSachMaLoaiCau()
  .filter((m) => LOAI_CAU_HOP_LE.has(m.loaiCau))
  .map((m) => ({ value: m.loaiCau, label: `CH-${m.ma} · ${nhanLoaiCau[m.loaiCau as LoaiCauHoi] ?? m.ten}` }));

const thanhPhuongAn = (ds: CauHoiBocTach['phuongAn']) =>
  ds.map((p) => ({ id: idImport(), noiDung: p.noiDung, dung: p.dung }));

const LY_DO_CHON_LOAI = 'Chưa phân biệt được loại câu hỏi — chọn "Loại câu" ở khung bên phải';

/** Kết quả plugin oImportWord → câu hỏi của màn soát (thêm phân loại mặc định) */
function thanhCauBocTach(kq: CauHoiBocTach): CauBocTach {
  const loaiCau = loaiCauAnToan(kq.loaiCau);
  const lyDo = kq.nhan ? [`${kq.nhan}${kq.phan ? ` (${kq.phan.slice(0, 40)})` : ''}`] : [];
  if (!loaiCau && kq.loaiCau) lyDo.push(`Loại câu "${kq.loaiCau}" chưa hỗ trợ — chọn lại loại câu`);
  const trangThai: TrangThaiBocTach = loaiCau ? kq.trangThai : 'loi';
  return {
    id: idImport(),
    maCauHoi: kq.maCauHoi,
    loaiCau,
    noiDung: kq.noiDung,
    phuongAn: thanhPhuongAn(kq.phuongAn),
    dapAnGoiY: kq.dapAn ?? kq.loiGiai,
    nguLieu: kq.nguLieu,
    cauCon: kq.cauCon?.map((c) => ({
      id: idImport(),
      maCauHoi: c.maCauHoi,
      loaiCau: loaiCauAnToan(c.loaiCau),
      noiDung: c.noiDung,
      phuongAn: thanhPhuongAn(c.phuongAn),
      dapAnGoiY: c.dapAn,
    })),
    cdtd: CapDoTuDuy.NhanBiet,
    tpnlIds: [],
    giaTriMoRong: {},
    diemGoiY: loaiCau === LoaiCauHoi.CauChum ? 1 : 0.5,
    cheDoDao: cheDoDaoMacDinh(loaiCau),
    trangThai,
    lyDo: trangThai === 'ok' ? undefined : [...lyDo, ...kq.lyDo].join(' — '),
  };
}

const CDTD_THEO_SO = [CapDoTuDuy.NhanBiet, CapDoTuDuy.ThongHieu, CapDoTuDuy.VanDung];
/** Khả năng đảo 1–4 theo thứ tự YC-NH-05b */
const DAO_THEO_SO = [
  CheDoDaoCauHoi.DaoLenhHoiVaDapAn,
  CheDoDaoCauHoi.ChiDaoLenhHoi,
  CheDoDaoCauHoi.ChiDaoDapAn,
  CheDoDaoCauHoi.KhongDao,
];

/**
 * Mẫu TN THPT: gán phân loại từ tiền tố "<Chủ đề>.<Tiểu mục>_<CĐTD>_<TPNL>_<Khả năng đảo>" — số thứ tự đối chiếu
 * với danh mục Môn – Khối đã chọn; số không có trong danh mục → câu cần xem lại (chọn lại ở khung sửa nhanh).
 */
function apPhanLoaiTienTo(c: CauBocTach, p: PhanLoaiTienTo, cayChuDe: NutChuDe[], dsTpnl: MucDanhMuc[]): CauBocTach {
  const tieuMuc = cayChuDe[p.chuDe - 1]?.con?.[p.tieuMuc - 1];
  const tpnlIds = p.tpnl.map((so) => dsTpnl[so - 1]?.id).filter((id): id is string => !!id);
  const thieu = [
    !tieuMuc && `chủ đề ${p.chuDe} / tiểu mục ${p.tieuMuc}`,
    tpnlIds.length < p.tpnl.length && `thành phần năng lực ${p.tpnl.join('+')}`,
  ].filter(Boolean);
  const kq: CauBocTach = {
    ...c,
    maPhanLoai: p.maGoc,
    tieuMucId: tieuMuc?.id ?? c.tieuMucId,
    cdtd: CDTD_THEO_SO[p.capDoTuDuy - 1] ?? c.cdtd,
    tpnlIds: tpnlIds.length ? tpnlIds : c.tpnlIds,
    cheDoDao: DAO_THEO_SO[p.khaNangDao - 1] ?? c.cheDoDao,
  };
  if (!thieu.length) return kq;
  const lyDo = `Tiền tố ${p.maGoc}: ${thieu.join(', ')} không có trong danh mục Môn – Khối đã chọn — chọn lại phân loại`;
  return {
    ...kq,
    trangThai: kq.trangThai === 'ok' ? 'canh-bao' : kq.trangThai,
    lyDo: [kq.lyDo, lyDo].filter(Boolean).join(' — '),
  };
}

/** Câu (hoặc câu con nào đó) còn chưa có loại → chưa được lưu */
const thieuLoaiCau = (c: CauBocTach) => !c.loaiCau || (c.cauCon ?? []).some((cc) => !cc.loaiCau);

const TagMaCau = ({ ma }: { ma?: string }) =>
  ma ? (
    <Tag color={ma.startsWith('CHC') ? 'geekblue' : 'blue'} style={{ marginRight: 4, fontFamily: 'monospace' }}>
      {ma}
    </Tag>
  ) : (
    <Tag color="error" style={{ marginRight: 4 }}>
      Chưa phân loại
    </Tag>
  );

/**
 * Khu đáp án theo loại câu — dùng chung cho câu hỏi và câu hỏi con.
 * `sua` nhận phần thay đổi (phuongAn/dapAnGoiY).
 */
function KhuDapAn({
  loaiCau,
  phuongAn,
  dapAnGoiY,
  sua,
  gon,
}: {
  loaiCau: LoaiCauImport;
  phuongAn: PhuongAnImport[];
  dapAnGoiY?: string;
  sua: (thay: { phuongAn?: PhuongAnImport[]; dapAnGoiY?: string }) => void;
  gon?: boolean;
}) {
  const suaNoiDungPa = (id: string, html: string) =>
    sua({ phuongAn: phuongAn.map((p) => (p.id === id ? { ...p, noiDung: html } : p)) });
  const nhanDapAn = (text: string) =>
    gon ? null : <label className="import-word__nhan">{text}</label>;

  if (!loaiCau) return null;
  if (loaiCau === LoaiCauHoi.TraLoiNgan || loaiCau === LoaiCauHoi.DienKhuyet) {
    return (
      <>
        {nhanDapAn(loaiCau === LoaiCauHoi.DienKhuyet ? 'Đáp án các ô trống' : 'Đáp án đúng (trả lời ngắn)')}
        <Input
          addonBefore={gon ? 'Đáp án đúng' : undefined}
          style={gon ? { marginTop: 8 } : undefined}
          placeholder={
            loaiCau === LoaiCauHoi.DienKhuyet
              ? 'VD: (1) which; (2) leading'
              : 'Tối đa 4 ký tự, dấu phẩy thập phân — VD: 12,5'
          }
          value={dapAnGoiY}
          onChange={(e) => sua({ dapAnGoiY: e.target.value })}
        />
      </>
    );
  }
  if (loaiCau === LoaiCauHoi.DungSai) {
    return (
      <>
        {nhanDapAn('Đáp án')}
        <Radio.Group
          style={gon ? { marginTop: 8 } : undefined}
          value={dapAnGoiY}
          onChange={(e) => sua({ dapAnGoiY: e.target.value })}
          options={[
            { value: 'Đúng', label: 'Đúng' },
            { value: 'Sai', label: 'Sai' },
          ]}
        />
      </>
    );
  }
  if (loaiCau === LoaiCauHoi.TuLuan) {
    return gon ? null : (
      <>
        {nhanDapAn('Đáp án gợi ý / hướng dẫn chấm')}
        <OEditor value={dapAnGoiY ?? ''} minHeight={60} onChange={(html) => sua({ dapAnGoiY: html })} />
      </>
    );
  }
  const laDungSai4Y = loaiCau === LoaiCauHoi.DungSai4Y;
  const nhieuDapAn = loaiCau === LoaiCauHoi.TracNghiemNhieuDapAn;
  return (
    <>
      {nhanDapAn(laDungSai4Y ? 'Các ý (đánh dấu Đúng/Sai từng ý)' : 'Phương án (chọn đáp án đúng)')}
      {phuongAn.map((pa, j) => (
        <div key={pa.id} className="import-word__pa">
          {laDungSai4Y ? (
            <Radio.Group
              size="small"
              optionType="button"
              buttonStyle="solid"
              value={pa.dung ? 'd' : 's'}
              onChange={(e) =>
                sua({ phuongAn: phuongAn.map((p) => (p.id === pa.id ? { ...p, dung: e.target.value === 'd' } : p)) })
              }
              options={[
                { value: 'd', label: 'Đ' },
                { value: 's', label: 'S' },
              ]}
            />
          ) : (
            <Radio
              checked={pa.dung}
              onChange={() =>
                sua({
                  phuongAn: phuongAn.map((p) => ({
                    ...p,
                    dung: nhieuDapAn ? (p.id === pa.id ? !p.dung : p.dung) : p.id === pa.id,
                  })),
                })
              }
            />
          )}
          <span className="import-word__pa-ky-tu">
            {laDungSai4Y ? `${String.fromCharCode(97 + j)})` : String.fromCharCode(65 + j)}
          </span>
          <div className="import-word__pa-editor">
            <OEditor key={pa.id} gon value={pa.noiDung} onChange={(html) => suaNoiDungPa(pa.id, html)} />
          </div>
        </div>
      ))}
    </>
  );
}

const iconTrangThai: Record<TrangThaiBocTach, React.ReactNode> = {
  ok: <CheckCircleOutlined style={{ color: 'var(--success)', fontSize: 18 }} />,
  'canh-bao': <WarningOutlined style={{ color: 'var(--warning)', fontSize: 18 }} />,
  loi: <CloseCircleOutlined style={{ color: 'var(--accent-red)', fontSize: 18 }} />,
};

export default function ImportWordCauHoi({
  duongDanKetThuc,
  nguon,
  cauHinh,
  monHocIds,
  khoiIds,
  onLuu,
  nhanNutLuu = 'Lưu tất cả câu hợp lệ vào Nháp',
  nutQuayLai,
  duongDanQuayLai,
}: ImportWordCauHoiProps) {
  const navigate = useNavigate();
  const xacNhan = useXacNhan();
  const { message } = App.useApp();
  const baoLoi = (noiDung: string) => message.error(noiDung);
  const baoThanhCong = (noiDung: string) => message.success(noiDung);
  // Mở từ trang Chi tiết kho: chọn sẵn kho chung (+ môn của kho); web đọc từ URL và đặt đường dẫn kết thúc
  const khoTuUrl = cauHinh.khoMacDinh;
  const ketThuc = duongDanKetThuc;
  const phamVi = cauHinh.phamVi ?? null;
  const khoiHopLe = (mon: string | undefined, khoi: string) => !phamVi || phamVi.khoiHopLe(mon, khoi);
  const truongMoRong = cauHinh.truongMoRong ?? [];

  const [buoc, setBuoc] = useState(0);
  const [tenFile, setTenFile] = useState('');
  const [dangBocTach, setDangBocTach] = useState(false);
  const [phanTram, setPhanTram] = useState(0);
  const [danhSach, setDanhSach] = useState<CauBocTach[]>([]);
  const [idDangChon, setIdDangChon] = useState<string>();
  const [daLuu, setDaLuu] = useState(false);
  const [dangLuu, setDangLuu] = useState(false);

  // Phạm vi import — chọn 1 lần ở bước 1, áp cho toàn bộ câu
  const [monHocId, setMonHocId] = useState<string>();
  const [khoiId, setKhoiId] = useState<string>();
  // Kho câu hỏi chung của lượt nhập (bắt buộc như Môn/Khối); từng câu có thể đổi kho riêng
  const [khoIdChung, setKhoIdChung] = useState<string | undefined>(khoTuUrl);
  const [dsKho, setDsKho] = useState<KhoCauHoiChon[]>([]);
  useEffect(() => {
    // Chỉ kho của tầng đang làm (kho Trường / Tổ / riêng — YC-NH-00b)
    nguon.layDanhSachKho().then((ds) => {
      setDsKho(ds);
      // Kho chọn sẵn gắn môn → chọn luôn môn của kho
      const monCuaKho = ds.find((k) => k.id === khoTuUrl)?.monHocId;
      if (monCuaKho) setMonHocId(monCuaKho);
      // Không mở từ một kho cụ thể → mặc định kho hệ thống "Chưa phân kho" (phân kho sau bằng Chuyển kho)
      const chuaPhanKho = ds.find((k) => k.laChuaPhanKho);
      if (!khoTuUrl && chuaPhanKho) setKhoIdChung((cu) => cu ?? chuaPhanKho.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khoTuUrl]);
  const luaChonKho = dsKho
    .filter((k) => !k.monHocId || !monHocId || k.monHocId === monHocId)
    .sort((a, b) => Number(!!b.laChuaPhanKho) - Number(!!a.laChuaPhanKho))
    .map((k) => ({ value: k.id, label: k.ten, moTa: k.moTa }));

  // Định dạng tệp (mẫu cố định) — nhớ lựa chọn lần trước theo trình duyệt
  const [mau, chonMau] = useMauImport();
  const moTaMau = layMauImport(mau);

  const [dsMon, setDsMon] = useState<LuaChon[]>([]);
  const [dsKhoi, setDsKhoi] = useState<LuaChon[]>([]);
  // Cấp Trường: GV chỉ nhập cho khối có lớp được phân công dạy môn đang chọn (YC-NH-00b)
  const dsKhoiChon = useMemo(
    () =>
      dsKhoi.filter(
        (k) => khoiHopLe(monHocId, k.value) && (!khoiIds || khoiIds.includes(k.value)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dsKhoi, phamVi, monHocId, khoiIds],
  );
  const [dsTpnl, setDsTpnl] = useState<MucDanhMuc[]>([]);
  const [cayChuDe, setCayChuDe] = useState<NutChuDe[]>([]);
  // Lựa chọn của trường riêng — theo Môn/Khối của lượt nhập (VD nhóm câu neo cùng môn–khối)
  const [luaChonMoRong, setLuaChonMoRong] = useState<Record<string, LuaChon[]>>({});
  /** Ngữ cảnh của một câu soát cho trường riêng */
  const nguCanhCau = (c: CauBocTach): NguCanhTruongMoRong => ({
    loaiCau: (c.loaiCau || LoaiCauHoi.TracNghiem1DapAn) as LoaiCauHoi,
    monHocId,
    khoiId,
  });
  /** Lý do chặn giá trị trường riêng của một câu (VD loại câu không khách quan không vào nhóm câu neo) */
  const lyDoChanMoRong = (c: CauBocTach, khoa: string) => {
    const t = truongMoRong.find((x) => x.khoa === khoa);
    return t?.kiemTra && c.loaiCau ? t.kiemTra(c.giaTriMoRong[khoa], nguCanhCau(c)) : [];
  };
  useEffect(() => {
    let huy = false;
    truongMoRong.forEach((t) =>
      Promise.resolve(t.luaChon({ loaiCau: LoaiCauHoi.TracNghiem1DapAn, monHocId, khoiId })).then((ds) => {
        if (!huy) setLuaChonMoRong((cu) => ({ ...cu, [t.khoa]: ds }));
      }),
    );
    return () => {
      huy = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monHocId, khoiId]);

  useDirtyGuard(buoc === 1 && !daLuu);

  // Điều hướng sau khi lưu — chờ dirty-guard tắt ở render kế tiếp
  useEffect(() => {
    if (daLuu) navigate(ketThuc);
  }, [daLuu, navigate, ketThuc]);

  useEffect(() => {
    nguon.layDanhSachMonHoc().then((ds) => {
      const loc = monHocIds ? ds.filter((m) => monHocIds.includes(m.id)) : ds;
      setDsMon(loc.map((m) => ({ value: m.id, label: m.ten })));
      // Chỉ 1 môn được chọn (VD Tổ chuyên môn) → chọn sẵn
      if (loc.length === 1) setMonHocId(loc[0].id);
    });
    nguon.layDanhSachKhoi().then((ds) =>
      setDsKhoi(ds.map((k) => ({ value: k.id, label: k.ten }))),
    );
    // Danh mục nạp một lần khi mở màn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cây chủ đề + TPNL theo Môn/Khối đã chọn ở bước 1
  useEffect(() => {
    if (!monHocId || !khoiId) {
      setCayChuDe([]);
      return;
    }
    nguon.layCayChuDe(monHocId, khoiId).then(setCayChuDe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monHocId, khoiId]);

  useEffect(() => {
    if (!monHocId) {
      setDsTpnl([]);
      return;
    }
    nguon.layDanhSachTpnl(monHocId).then(setDsTpnl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monHocId]);

  /** Đọc tệp Word thật và bóc tách bằng plugin oImportWord (cùng định dạng với chức năng dán) */
  const batDauBocTach = async (file: File) => {
    setTenFile(file.name);
    setDangBocTach(true);
    setPhanTram(0);
    try {
      const kq = await docTepWord(file, { onTienTrinh: setPhanTram, mau });
      const macDinh = Object.fromEntries(truongMoRong.map((t) => [t.khoa, t.macDinh]));
      // Mẫu TN THPT: nạp mới danh mục Môn – Khối để đối chiếu số thứ tự trong tiền tố (không chờ effect)
      const [cay, tpnl] =
        mau === 'tn-thpt' && monHocId && khoiId
          ? await Promise.all([nguon.layCayChuDe(monHocId, khoiId), nguon.layDanhSachTpnl(monHocId)])
          : [cayChuDe, dsTpnl];
      const ds = kq.cauHoi.map((cau) => {
        const c = { ...thanhCauBocTach(cau), giaTriMoRong: { ...macDinh } };
        // Câu hỏi nhóm không có tiền tố riêng → theo câu con đầu tiên
        const phanLoai = cau.phanLoai ?? cau.cauCon?.find((cc) => cc.phanLoai)?.phanLoai;
        return phanLoai ? apPhanLoaiTienTo(c, phanLoai, cay, tpnl) : c;
      });
      if (!ds.length) {
        baoLoi(kq.ghiChu[0] ?? `Không bóc tách được câu hỏi nào từ ${file.name}`);
        return;
      }
      if (mau === 'tn-thpt') {
        setCayChuDe(cay);
        setDsTpnl(tpnl);
      }
      setDanhSach(ds);
      setIdDangChon(ds[0]?.id);
      setBuoc(1);
      const dem = (loai: LoaiCauHoi) => ds.filter((c) => c.loaiCau === loai).length;
      const soTracNghiem = dem(LoaiCauHoi.TracNghiem1DapAn) + dem(LoaiCauHoi.TracNghiemNhieuDapAn);
      const chiTiet = [
        soTracNghiem && `${soTracNghiem} trắc nghiệm`,
        dem(LoaiCauHoi.DungSai4Y) && `${dem(LoaiCauHoi.DungSai4Y)} đúng/sai`,
        dem(LoaiCauHoi.TraLoiNgan) && `${dem(LoaiCauHoi.TraLoiNgan)} trả lời ngắn`,
        dem(LoaiCauHoi.TuLuan) && `${dem(LoaiCauHoi.TuLuan)} tự luận`,
        dem(LoaiCauHoi.DungSai) && `${dem(LoaiCauHoi.DungSai)} đúng/sai đơn`,
        dem(LoaiCauHoi.DienKhuyet) && `${dem(LoaiCauHoi.DienKhuyet)} điền khuyết`,
        dem(LoaiCauHoi.CauChum) && `${dem(LoaiCauHoi.CauChum)} câu hỏi nhóm`,
        ds.some(thieuLoaiCau) && `${ds.filter(thieuLoaiCau).length} câu CHƯA phân loại — cần chọn loại câu`,
        ds.some((c) => c.trangThai === 'loi' && !thieuLoaiCau(c)) &&
          `${ds.filter((c) => c.trangThai === 'loi' && !thieuLoaiCau(c)).length} câu không đúng ${moTaMau.ten} — xem lý do từng câu`,
      ].filter(Boolean);
      baoThanhCong(
        `Đã bóc tách ${ds.length} câu hỏi từ ${file.name} (${chiTiet.join(', ')})${kq.soCongThuc ? ` — ${kq.soCongThuc} công thức MathType/OMML đã chuyển thành công thức sống` : ''}`,
      );
    } catch {
      baoLoi(`Không đọc được tệp ${file.name} — kiểm tra tệp đúng định dạng .docx và không bị hỏng`);
    } finally {
      setDangBocTach(false);
    }
  };

  const cauDangChon = danhSach.find((c) => c.id === idDangChon);

  const suaCau = (id: string, thay: Partial<CauBocTach>) => {
    setDanhSach((cu) => cu.map((c) => (c.id === id ? { ...c, ...thay } : c)));
  };

  const suaCauCon = (idCau: string, idCon: string, thay: Partial<CauConBocTach>) => {
    setDanhSach((cu) =>
      cu.map((c) =>
        c.id === idCau
          ? {
              ...c,
              cauCon: (c.cauCon ?? []).map((cc) =>
                cc.id === idCon ? { ...cc, ...thay } : cc,
              ),
            }
          : c,
      ),
    );
  };

  /** Người soát chọn loại cho câu chưa phân loại: sinh mã câu, câu chuyển sang "cần xem lại" */
  const doiLoaiCau = (cau: CauBocTach, loai: LoaiCauHoi) => {
    const conThieu = { ...cau, loaiCau: loai };
    suaCau(cau.id, {
      loaiCau: loai,
      maCauHoi: taoMaCauHoi(loai),
      cheDoDao: cheDoDaoMacDinh(loai),
      ...(cau.trangThai === 'loi' && !thieuLoaiCau(conThieu)
        ? { trangThai: 'canh-bao' as const, lyDo: 'Đã chọn loại câu thủ công — nhập đáp án/phương án rồi "Đánh dấu hợp lệ"' }
        : {}),
    });
  };

  const doiLoaiCauCon = (cau: CauBocTach, idCon: string, loai: LoaiCauHoi) => {
    const cauCon = (cau.cauCon ?? []).map((cc) =>
      cc.id === idCon ? { ...cc, loaiCau: loai, maCauHoi: taoMaCauHoi(loai, true) } : cc,
    );
    suaCau(cau.id, {
      cauCon,
      ...(cau.trangThai === 'loi' && !thieuLoaiCau({ ...cau, cauCon })
        ? { trangThai: 'canh-bao' as const, lyDo: 'Đã chọn loại câu con thủ công — kiểm tra lại rồi "Đánh dấu hợp lệ"' }
        : {}),
    });
  };

  const xoaCau = (cau: CauBocTach) => {
    const viTri = danhSach.findIndex((c) => c.id === cau.id);
    xacNhan({
      tieuDe: 'Xóa câu hỏi khỏi lần import?',
      doiTuong: `Câu ${viTri + 1}`,
      nhanDien: `${danhSach.length} câu đã bóc tách`,
      anhHuong:
        'Câu này bị loại khỏi danh sách import hiện tại và sẽ KHÔNG được lưu vào ngân hàng. File Word gốc không bị ảnh hưởng.',
      nhanNutXacNhan: 'Xóa khỏi lần import',
      mucDo: 'do',
      onXacNhan: () => {
        setDanhSach((cu) => {
          const conLai = cu.filter((c) => c.id !== cau.id);
          setIdDangChon(conLai[Math.min(viTri, conLai.length - 1)]?.id);
          return conLai;
        });
        baoThanhCong('Đã xóa câu hỏi khỏi lần import');
      },
    });
  };

  const soHopLe = useMemo(
    () => danhSach.filter((c) => c.trangThai !== 'loi' && !thieuLoaiCau(c)).length,
    [danhSach],
  );
  const soLoi = danhSach.length - soHopLe;

  const timTieuMuc = (tieuMucId?: string) => {
    for (const cd of cayChuDe) {
      const tm = (cd.con ?? []).find((t) => t.id === tieuMucId);
      if (tm) return { chuDe: cd, tieuMuc: tm };
    }
    return null;
  };

  const luuVaoNhap = async () => {
    const hopLe = danhSach.filter(
      (c): c is CauBocTach & { loaiCau: LoaiCauHoi } => c.trangThai !== 'loi' && !thieuLoaiCau(c),
    );
    if (!hopLe.length || !monHocId || !khoiId || !khoIdChung) return;
    setDangLuu(true);
    try {
      const tieuMucDau = cayChuDe[0]?.con?.[0];
      const dsLuu: DuLieuLuuCauHoi[] = hopLe.map((c) => {
        const tm = timTieuMuc(c.tieuMucId);
        // Giá trị trường riêng bị chặn (VD loại câu không vào được nhóm câu neo) → bỏ, câu vẫn lưu
        const giaTriMoRong = Object.fromEntries(
          Object.entries(c.giaTriMoRong).map(([khoa, gt]) => [khoa, lyDoChanMoRong(c, khoa).length ? undefined : gt]),
        );
        return {
          // Câu chùm lưu theo quy ước màn soạn: ưu tiên lời dẫn, trống thì dùng ngữ liệu
          noiDung: c.loaiCau === LoaiCauHoi.CauChum && !c.noiDung ? (c.nguLieu ?? '') : c.noiDung,
          loaiCau: c.loaiCau,
          monHocId,
          khoiId,
          tieuMucId: tm?.tieuMuc.id ?? tieuMucDau?.id ?? '',
          tenChuDe: tm?.chuDe.ten ?? cayChuDe[0]?.ten ?? '',
          tenTieuMuc: tm?.tieuMuc.ten ?? tieuMucDau?.ten ?? '',
          cdtd: c.cdtd,
          tpnlIds: c.tpnlIds,
          trangThai: TrangThaiNoiDung.Nhap,
          phuongAn: c.loaiCau === LoaiCauHoi.CauChum ? [] : c.phuongAn.filter((p) => p.noiDung.trim()),
          dapAnGoiY: c.dapAnGoiY || undefined,
          kieuHienThi: c.loaiCau === LoaiCauHoi.CauChum ? 'tren-duoi' : undefined,
          diemGoiY: c.diemGoiY,
          khoId: c.khoId ?? khoIdChung,
          cheDoDao: c.cheDoDao,
          nguLieu: c.loaiCau === LoaiCauHoi.CauChum ? c.nguLieu : undefined,
          giaTriMoRong,
          nguonTao: 'import',
        };
      });
      if (onLuu) {
        try {
          await onLuu(dsLuu);
        } catch (e) {
          baoLoi(e instanceof Error ? e.message : 'Không lưu được — thử lại');
          return;
        }
        setDaLuu(true);
        return;
      }
      const ketQua = await Promise.all(dsLuu.map((d) => nguon.tao(d)));
      // Gộp ghi chú của web (VD "được đề xuất vào nhóm câu neo") thành 1 thông báo
      const demGhiChu = new Map<string, number>();
      ketQua.forEach((k) => k.ghiChu && demGhiChu.set(k.ghiChu, (demGhiChu.get(k.ghiChu) ?? 0) + 1));
      setDaLuu(true);
      baoThanhCong(
        `Đã lưu ${hopLe.length} câu hỏi vào Nháp${[...demGhiChu].map(([g, n]) => ` · ${n} câu ${g}`).join('')}`,
      );
    } finally {
      setDangLuu(false);
    }
  };

  const treeDataChuDe = useMemo(
    () =>
      cayChuDe.map((cd) => ({
        value: cd.id,
        ten: cd.ten,
        selectable: false,
        title: <b>{cd.ten}</b>,
        children: (cd.con ?? []).map((tm) => ({
          value: tm.id,
          ten: tm.ten,
          title: tm.ten,
        })),
      })),
    [cayChuDe],
  );

  /** TPNL gợi ý theo tiểu mục của câu đang chọn hiển thị trước */
  const tpnlSapXep = useMemo(() => {
    const goiY = new Set(timTieuMuc(cauDangChon?.tieuMucId)?.tieuMuc.tpnlIds ?? []);
    return [...dsTpnl].sort((a, b) => Number(goiY.has(b.id)) - Number(goiY.has(a.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dsTpnl, cauDangChon?.tieuMucId, cayChuDe]);

  const buoc1 = (
    <div className="import-word__buoc1">
      <div className="import-word__pham-vi">
        <div className="import-word__o-form">
          <label className="import-word__nhan">
            Môn <span className="bat-buoc">*</span>
          </label>
          <FormSelect
            luaChon={dsMon}
            value={monHocId}
            placeholder="Chọn môn học"
            onChange={(v) => {
              setMonHocId(v);
              if (khoiId && !khoiHopLe(v, khoiId)) setKhoiId(undefined);
            }}
          />
        </div>
        <div className="import-word__o-form">
          <label className="import-word__nhan">
            Khối <span className="bat-buoc">*</span>
          </label>
          <FormSelect
            luaChon={dsKhoiChon}
            value={khoiId}
            placeholder="Chọn khối"
            onChange={(v) => setKhoiId(v)}
          />
        </div>
        <div className="import-word__o-form">
          <label className="import-word__nhan">
            Kho câu hỏi <span className="bat-buoc">*</span>
          </label>
          <FormSelect
            luaChon={luaChonKho}
            value={khoIdChung}
            placeholder="Chọn kho chứa các câu nhập"
            onChange={(v) => setKhoIdChung(v)}
          />
        </div>
        <div className="import-word__o-form">
          <label className="import-word__nhan">
            Định dạng <span className="bat-buoc">*</span>{' '}
            <Tooltip title="Cách trình bày câu hỏi trong tệp Word. Cách bóc tách và xử lý lỗi của từng định dạng xem ở hướng dẫn (biểu tượng ? góc phải).">
              <InfoCircleOutlined className="import-word__icon-i" />
            </Tooltip>
          </label>
          <FormSelect luaChon={luaChonMauImport} value={mau} onChange={(v) => chonMau(v as MaMauImport)} />
        </div>
      </div>
      <div className="import-word__dinh-dang">
        <span>
          <b>{moTaMau.ten}:</b> {moTaMau.tomTat}
        </span>
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={() =>
            xuatTepMauImportWord(undefined, mau)
              .then(() => baoThanhCong(`Đã tải tệp mẫu định dạng ${moTaMau.ten} (.docx) — kiểm tra thư mục Tải xuống`))
              .catch(() => baoLoi('Không tạo được tệp mẫu — thử lại'))
          }
        >
          Tải file mẫu {moTaMau.ten}
        </Button>
      </div>
      <Upload.Dragger
        className="import-word__keo-tha"
        accept=".docx"
        maxCount={1}
        showUploadList={false}
        disabled={dangBocTach || !monHocId || !khoiId || !khoIdChung}
        beforeUpload={(file) => {
          batDauBocTach(file);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          Kéo-thả file Word (.docx) vào đây hoặc bấm để chọn file
        </p>
        <p className="ant-upload-hint">
          {monHocId && khoiId && khoIdChung
            ? `Hệ thống bóc tách từng câu hỏi, phương án, đáp án và công thức MathType theo định dạng ${moTaMau.ten}`
            : 'Chọn Môn, Khối và Kho câu hỏi phía trên trước khi tải file — toàn bộ câu trong file sẽ thuộc phạm vi này'}
        </p>
      </Upload.Dragger>
      {dangBocTach && (
        <div className="import-word__tien-trinh">
          <Progress percent={phanTram} status="active" />
          <span className="import-word__tien-trinh-nhan">
            Đang bóc tách "{tenFile}"…
          </span>
        </div>
      )}
    </div>
  );

  const buoc2 = (
    <div className="import-word__buoc2">
      <div className="import-word__soat">
        <div className="import-word__ds-cau" role="list">
          {danhSach.map((c, i) => (
            <div
              key={c.id}
              role="listitem"
              className={`import-word__item ${c.id === idDangChon ? 'chon' : ''} import-word__item--${c.trangThai}`}
              onClick={() => setIdDangChon(c.id)}
            >
              <span className="import-word__item-icon">
                {iconTrangThai[c.trangThai]}
              </span>
              <span className="import-word__item-than">
                <span className="import-word__item-ten">
                  Câu {i + 1}. <TagMaCau ma={c.loaiCau ? c.maCauHoi : undefined} />
                  {c.maPhanLoai && (
                    <Tooltip title="Tiền tố phân loại TN THPT: Chủ đề.Tiểu mục_CĐTD_TPNL_Khả năng đảo">
                      <Tag style={{ marginRight: 4, fontFamily: 'monospace' }}>{c.maPhanLoai}</Tag>
                    </Tooltip>
                  )}
                  {c.loaiCau && c.loaiCau !== LoaiCauHoi.TracNghiem1DapAn && (
                    <Tag
                      color={c.loaiCau === LoaiCauHoi.CauChum ? 'purple' : 'cyan'}
                      style={{ marginRight: 4 }}
                    >
                      {nhanLoaiCau[c.loaiCau]}
                    </Tag>
                  )}
                  {c.noiDung || c.nguLieu ? (
                    <NoiDungHtml inline html={c.noiDung || c.nguLieu || ''} />
                  ) : (
                    '(trống)'
                  )}
                </span>
                {truongMoRong.map((t) => {
                  const gt = c.giaTriMoRong[t.khoa];
                  return t.theDanhSach && gt ? (
                    <span key={t.khoa} className="import-word__item-ly-do" style={{ color: 'var(--text-sub)' }}>
                      {t.theDanhSach(gt)}
                    </span>
                  ) : null;
                })}
                {c.lyDo && (
                  <span className="import-word__item-ly-do">{c.lyDo}</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="import-word__sua-nhanh">
          {cauDangChon ? (
            <>
              <div className="import-word__sua-header">
                <b>Sửa nhanh câu đang chọn</b>
                <span className="import-word__sua-header-nut">
                  {cauDangChon.trangThai !== 'ok' && (
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      disabled={thieuLoaiCau(cauDangChon)}
                      onClick={() =>
                        suaCau(cauDangChon.id, { trangThai: 'ok', lyDo: undefined })
                      }
                    >
                      Đánh dấu hợp lệ
                    </Button>
                  )}
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => xoaCau(cauDangChon)}
                  >
                    Xóa
                  </Button>
                </span>
              </div>
              {cauDangChon.lyDo && (
                <div className={`import-word__ly-do import-word__ly-do--${cauDangChon.trangThai}`}>
                  {cauDangChon.lyDo}
                </div>
              )}
              <div className="import-word__o-form">
                <label className="import-word__nhan-nho">
                  Loại câu <span className="bat-buoc">*</span>{' '}
                  {cauDangChon.loaiCau && <TagMaCau ma={cauDangChon.maCauHoi} />}
                </label>
                <Select
                  style={{ width: '100%' }}
                  status={cauDangChon.loaiCau ? undefined : 'error'}
                  placeholder={LY_DO_CHON_LOAI}
                  value={cauDangChon.loaiCau || undefined}
                  options={luaChonLoaiCau}
                  popupMatchSelectWidth={false}
                  onChange={(v) => doiLoaiCau(cauDangChon, v as LoaiCauHoi)}
                />
              </div>
              {cauDangChon.loaiCau === LoaiCauHoi.CauChum && (
                <>
                  <label className="import-word__nhan">Ngữ liệu chung</label>
                  <OEditor
                    key={`nl-${cauDangChon.id}`}
                    value={cauDangChon.nguLieu ?? ''}
                    minHeight={90}
                    placeholder="Đoạn văn/bảng/hình mà các câu hỏi con cùng tham chiếu"
                    onChange={(html) => suaCau(cauDangChon.id, { nguLieu: html })}
                  />
                </>
              )}
              <label className="import-word__nhan">
                {cauDangChon.loaiCau === LoaiCauHoi.CauChum
                  ? 'Lời dẫn chung (không bắt buộc)'
                  : 'Nội dung câu hỏi'}
              </label>
              <OEditor
                key={`nd-${cauDangChon.id}`}
                value={cauDangChon.noiDung}
                minHeight={cauDangChon.loaiCau === LoaiCauHoi.CauChum ? 60 : 90}
                placeholder="Nhập nội dung — dán từ Word giữ nguyên công thức MathType/OMML"
                onChange={(html) => suaCau(cauDangChon.id, { noiDung: html })}
              />
              {cauDangChon.loaiCau === LoaiCauHoi.CauChum ? (
                <>
                  <label className="import-word__nhan">
                    Câu hỏi con ({(cauDangChon.cauCon ?? []).length})
                  </label>
                  {(cauDangChon.cauCon ?? []).map((cc, i) => (
                    <div key={cc.id} className="import-word__cau-con">
                      <div className="import-word__cau-con-header">
                        <b>Câu {i + 1}</b>
                        <TagMaCau ma={cc.loaiCau ? cc.maCauHoi : undefined} />
                        <Select
                          size="small"
                          style={{ minWidth: 200 }}
                          status={cc.loaiCau ? undefined : 'error'}
                          placeholder="Chọn loại câu con"
                          value={cc.loaiCau || undefined}
                          options={luaChonLoaiCau
                            .filter((l) => l.value !== LoaiCauHoi.CauChum)
                            .map((l) => ({ ...l, label: l.label.replace(/^CH-/, 'CHC-') }))}
                          popupMatchSelectWidth={false}
                          onChange={(v) => doiLoaiCauCon(cauDangChon, cc.id, v as LoaiCauHoi)}
                        />
                      </div>
                      <OEditor
                        key={`cc-${cc.id}`}
                        gon
                        value={cc.noiDung}
                        onChange={(html) =>
                          suaCauCon(cauDangChon.id, cc.id, { noiDung: html })
                        }
                      />
                      <KhuDapAn
                        gon
                        loaiCau={cc.loaiCau}
                        phuongAn={cc.phuongAn}
                        dapAnGoiY={cc.dapAnGoiY}
                        sua={(thay) => suaCauCon(cauDangChon.id, cc.id, thay)}
                      />
                    </div>
                  ))}
                </>
              ) : (
                <KhuDapAn
                  key={`da-${cauDangChon.id}`}
                  loaiCau={cauDangChon.loaiCau}
                  phuongAn={cauDangChon.phuongAn}
                  dapAnGoiY={cauDangChon.dapAnGoiY}
                  sua={(thay) => suaCau(cauDangChon.id, thay)}
                />
              )}
              <label className="import-word__nhan">Phân loại</label>
              <div className="import-word__phan-loai">
                <div className="import-word__o-form import-word__o-form--rong">
                  <label className="import-word__nhan-nho">
                    Chủ đề / Tiểu mục <span className="bat-buoc">*</span>
                  </label>
                  <TreeSelect
                    style={{ width: '100%' }}
                    showSearch
                    treeDefaultExpandAll
                    treeNodeFilterProp="ten"
                    filterTreeNode={(input, node) =>
                      khopTimKiem(input, String((node as { ten?: string }).ten ?? ''))
                    }
                    placeholder="Chọn tiểu mục trong cây chủ đề"
                    value={cauDangChon.tieuMucId}
                    treeData={treeDataChuDe}
                    popupMatchSelectWidth={false}
                    onChange={(v) => suaCau(cauDangChon.id, { tieuMucId: v })}
                  />
                </div>
                <div className="import-word__o-form">
                  <label className="import-word__nhan-nho">
                    Cấp độ tư duy <span className="bat-buoc">*</span>
                  </label>
                  <Radio.Group
                    buttonStyle="solid"
                    value={cauDangChon.cdtd}
                    onChange={(e) => suaCau(cauDangChon.id, { cdtd: e.target.value })}
                  >
                    <Radio.Button value={CapDoTuDuy.NhanBiet}>Nhận biết</Radio.Button>
                    <Radio.Button value={CapDoTuDuy.ThongHieu}>Thông hiểu</Radio.Button>
                    <Radio.Button value={CapDoTuDuy.VanDung}>Vận dụng</Radio.Button>
                  </Radio.Group>
                </div>
                <div className="import-word__o-form import-word__o-form--rong">
                  <label className="import-word__nhan-nho">
                    Thành phần năng lực{' '}
                    <Tooltip title="Các thành phần được gợi ý theo tiểu mục đã chọn hiển thị trước">
                      <InfoCircleOutlined className="import-word__icon-i" />
                    </Tooltip>
                  </label>
                  <FormSelect
                    mode="multiple"
                    luaChon={tpnlSapXep.map((t) => ({
                      value: t.id,
                      label: t.ten,
                      moTa: timTieuMuc(cauDangChon.tieuMucId)?.tieuMuc.tpnlIds.includes(t.id)
                        ? 'Gợi ý theo tiểu mục đã chọn'
                        : undefined,
                    }))}
                    value={cauDangChon.tpnlIds}
                    placeholder="Chọn thành phần năng lực"
                    onChange={(v) => suaCau(cauDangChon.id, { tpnlIds: v as string[] })}
                  />
                </div>
                <div className="import-word__o-form import-word__o-form--rong">
                  <label className="import-word__nhan-nho">
                    Khả năng đảo câu hỏi <span className="bat-buoc">*</span>{' '}
                    <Tooltip title="Cách hoán vị áp dụng cho câu này khi sinh mã đề: đảo vị trí lệnh hỏi (câu hỏi con trong câu chùm/Đúng-Sai) và/hoặc đảo đáp án của mỗi lệnh hỏi (câu chùm/Đúng-Sai/trắc nghiệm đơn)">
                      <InfoCircleOutlined className="import-word__icon-i" />
                    </Tooltip>
                  </label>
                  <FormSelect
                    luaChon={luaChonCheDoDao}
                    value={cauDangChon.cheDoDao}
                    onChange={(v) =>
                      suaCau(cauDangChon.id, { cheDoDao: v as CheDoDaoCauHoi })
                    }
                  />
                </div>
                <div className="import-word__o-form">
                  <label className="import-word__nhan-nho">Điểm gợi ý</label>
                  <InputNumber
                    min={0}
                    step={0.25}
                    style={{ width: '100%' }}
                    value={cauDangChon.diemGoiY}
                    onChange={(v) => suaCau(cauDangChon.id, { diemGoiY: v ?? 0 })}
                  />
                </div>
                <div className="import-word__o-form">
                  <label className="import-word__nhan-nho">Kho câu hỏi</label>
                  <FormSelect
                    luaChon={luaChonKho}
                    value={cauDangChon.khoId ?? khoIdChung}
                    placeholder="Theo kho chung của lượt nhập"
                    onChange={(v) => suaCau(cauDangChon.id, { khoId: v })}
                  />
                </div>
                {truongMoRong.map((t) => {
                  const luaChon = luaChonMoRong[t.khoa] ?? [];
                  const lyDo = lyDoChanMoRong(cauDangChon, t.khoa);
                  return (
                    <div key={t.khoa} className="import-word__o-form">
                      <label className="import-word__nhan-nho">
                        {t.nhan} {t.batBuoc && <span className="bat-buoc">*</span>}
                      </label>
                      <FormSelect
                        allowClear={!t.batBuoc}
                        luaChon={luaChon}
                        value={cauDangChon.giaTriMoRong[t.khoa]}
                        placeholder={luaChon.length ? (t.batBuoc ? 'Chọn' : 'Không bắt buộc') : 'Chưa có lựa chọn cho môn này'}
                        disabled={!luaChon.length}
                        onChange={(v) =>
                          suaCau(cauDangChon.id, { giaTriMoRong: { ...cauDangChon.giaTriMoRong, [t.khoa]: v } })
                        }
                      />
                      {lyDo.length > 0 && (
                        <span className="import-word__nhan-nho" style={{ color: 'var(--accent-red)' }}>
                          Không chọn được: {lyDo.join('; ')}
                        </span>
                      )}
                      {t.ghiChu?.(cauDangChon.giaTriMoRong[t.khoa])}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <span className="import-word__nhan">Chọn một câu bên trái để soát/sửa</span>
          )}
        </div>
      </div>
      <div className="import-word__thanh-duoi">
        <span className="import-word__tong">
          <Tag color={soLoi ? 'warning' : 'success'}>
            {soHopLe}/{danhSach.length} câu hợp lệ
          </Tag>
          {soLoi > 0 && <span className="import-word__tong-loi">{soLoi} câu lỗi sẽ bị bỏ qua nếu không sửa</span>}
        </span>
        <span className="import-word__thanh-duoi-nut">
          {soLoi > 0 && (
            <Button loading={dangLuu} onClick={luuVaoNhap}>
              Bỏ câu lỗi và lưu ({soHopLe} câu)
            </Button>
          )}
          <Tooltip
            title={
              soLoi > 0
                ? `Còn ${soLoi} câu lỗi — sửa và "Đánh dấu hợp lệ", hoặc chọn "Bỏ câu lỗi và lưu"`
                : undefined
            }
          >
            <Button
              type="primary"
              loading={dangLuu}
              disabled={soLoi > 0 || !danhSach.length}
              onClick={luuVaoNhap}
            >
              {nhanNutLuu}
            </Button>
          </Tooltip>
        </span>
      </div>
    </div>
  );

  return (
    <BoxNoiDung
      tieuDe="Nhập câu hỏi từ Word"
      nutQuayLai={nutQuayLai}
      duongDanQuayLai={duongDanQuayLai}
      huongDan={
        <div>
          <p>
            Chọn <b>Môn</b>, <b>Khối</b> (bắt buộc), <b>Kho câu hỏi</b> (mặc định "Chưa phân kho" — phân kho sau bằng
            Chuyển kho) và <b>Định dạng</b> của tệp; tải file mẫu đúng định dạng, soạn câu hỏi trong Word rồi tải lên.
          </p>
          <p>
            Ở bước soát: câu <b>xanh</b> đã sẵn sàng, câu <b>vàng</b> cần xem lại, câu <b>đỏ</b> bị lỗi bóc tách, không
            đúng định dạng hoặc chưa phân loại được — sửa nhanh bên phải rồi "Đánh dấu hợp lệ", hoặc bỏ qua khi lưu. Chỉ các
            câu hợp lệ được lưu vào ngân hàng ở trạng thái Nháp.
          </p>
          <HuongDanMauImport
            mau={mau}
            bangTraCuu={
              monHocId && khoiId
                ? {
                    chuDe: cayChuDe.map((cd) => ({ ten: cd.ten, tieuMuc: (cd.con ?? []).map((tm) => tm.ten) })),
                    tpnl: dsTpnl.map((t) => t.ten),
                  }
                : undefined
            }
          />
        </div>
      }
    >
      <Steps
        className="import-word__steps"
        current={buoc}
        items={[{ title: 'Chọn file' }, { title: 'Soát dữ liệu & lưu' }]}
      />
      {buoc === 0 ? buoc1 : buoc2}
    </BoxNoiDung>
  );
}
