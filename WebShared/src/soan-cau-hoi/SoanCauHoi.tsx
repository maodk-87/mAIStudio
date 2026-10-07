/**
 * MÀN SOẠN CÂU HỎI DÙNG CHUNG (docs/ui/5 mục 3) — KTĐG, NHCH, DVCC dùng qua wrapper mỏng của từng web.
 * Bố cục 2 cột 70/30: trái = Môn · Khối · Loại câu + nội dung + khu đáp án theo loại câu;
 * phải = Thiết lập câu hỏi (Chủ đề/Tiểu mục · TPNL · CĐTD · đảo · điểm · kho · trường riêng của hệ · kiểu hiển thị ·
 * phân loại câu con). Footer: Lưu nháp / Lưu & soạn tiếp / Gửi duyệt (hoặc "Lưu" khi không phê duyệt).
 * Dữ liệu và khác biệt theo hệ đi qua `nguon` + `cauHinh` (nguon.ts) — KHÔNG sao chép file này vào web.
 */
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Collapse,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Radio,
  Tag,
  Tooltip,
  TreeSelect,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BoxNoiDung, FormSelect, useDirtyGuard, khopTimKiem, type LuaChon } from '../giao-dien';
import { OEditor } from '../oeditor';
import {
  KhuBanDocDeBai,
  boDaoDapAn,
  coDaoDapAn,
  laKhoiCoBanDoc,
  type BanDocDeBai,
} from '../ban-doc-de-bai';
import type { CauHoiBocTach } from '../oimportword';
import { TrinhSoanRubric, kiemTraHopLe as kiemTraRubric, type CayRubric } from '../rubric';
import { anhXaPhanLoai, coLoiPhanLoai, moTaLoiPhanLoai, tuPhanLoaiTienTo, type LoiPhanLoai } from './anhXaPhanLoai';
import { CapDoTuDuy, CheDoDaoCauHoi, LoaiCauHoi, TrangThaiNoiDung } from './hang';
import { luaChonCheDoDao, luaChonLoaiCau, moTaLoaiCau, nhanKieuHienThi, nhanLoaiCau } from './nhan';
import XemTruocCauHoi, { type CauHoiXemTruoc } from './XemTruocCauHoi';
import type { CauHinhSoanCauHoi, NguonSoanCauHoi } from './nguon';
import type {
  DuLieuLuuCauHoi,
  KhoCauHoiChon,
  KieuHienThiCauHoi,
  MucDanhMuc,
  NutChuDe,
  PhuongAnCauHoi,
} from './types';
import './soan-cau-hoi.scss';

export interface SoanCauHoiProps {
  /** Có giá trị = chế độ sửa (nạp dữ liệu câu hỏi qua nguon.layChiTiet) */
  cauHoiId?: string;
  duongDanQuayLai: string;
  /** Hiện nút "Quay lại" ở header box chính (đi tới duongDanQuayLai) */
  nutQuayLai?: boolean;
  nguon: NguonSoanCauHoi;
  cauHinh: CauHinhSoanCauHoi;
  /** Gọi sau mỗi lần lưu thành công */
  onDaLuu?: (id: string) => void;
}

interface MucVanBan {
  id: string;
  noiDung: string;
  dung: boolean;
}

interface CapGhep {
  id: string;
  trai: string;
  phai: string;
}

interface DapAnChapNhan {
  id: string;
  giaTri: string;
  saiSo: number;
}


interface CauCon {
  id: string;
  loaiCau: LoaiCauHoi;
  noiDung: string;
  phuongAn: MucVanBan[];
  /** Phân loại riêng của câu con — mặc định lấy theo câu chính khi thêm */
  tieuMucId?: string;
  tpnlId?: string;
  cdtd?: CapDoTuDuy;
}

let demId = 0;
const idMoi = () => `soan-${Date.now().toString(36)}-${++demId}`;

const taoPhuongAnMacDinh = (): MucVanBan[] =>
  [0, 1, 2, 3].map((i) => ({ id: idMoi(), noiDung: '', dung: i === 0 }));

const tao4Y = (): MucVanBan[] =>
  [0, 1, 2, 3].map((i) => ({ id: idMoi(), noiDung: '', dung: i % 2 === 0 }));

const boThe = (html: string) =>
  (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** Các loại câu dùng danh sách phương án chọn */
const nhomTracNghiem: LoaiCauHoi[] = [
  LoaiCauHoi.TracNghiem1DapAn,
  LoaiCauHoi.TracNghiemNhieuDapAn,
];
const nhomGhep: LoaiCauHoi[] = [LoaiCauHoi.GhepDoi, LoaiCauHoi.NoiDay];
const nhomSapXep: LoaiCauHoi[] = [LoaiCauHoi.SapXep, LoaiCauHoi.KeoTha];
const nhomDien: LoaiCauHoi[] = [LoaiCauHoi.DienKhuyet, LoaiCauHoi.TraLoiNgan];

const loaiCauConChoPhep: LuaChon[] = [
  LoaiCauHoi.TracNghiem1DapAn,
  LoaiCauHoi.TracNghiemNhieuDapAn,
  LoaiCauHoi.DungSai,
].map((lc) => ({ value: lc, label: nhanLoaiCau[lc] }));

export default function SoanCauHoi({
  cauHoiId,
  duongDanQuayLai,
  nutQuayLai,
  nguon,
  cauHinh,
  onDaLuu,
}: SoanCauHoiProps) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const baoLoi = (noiDung: string) => message.error(noiDung);
  const baoThanhCong = (noiDung: string) => message.success(noiDung);
  const quayLai = duongDanQuayLai;
  // Mở từ trang Chi tiết kho: chọn sẵn kho (web đọc từ URL)
  const khoTuUrl = cauHinh.khoMacDinh;
  const phamVi = cauHinh.phamVi ?? null;
  const monHopLe = (mon: string) => !phamVi || phamVi.monHopLe(mon);
  const khoiHopLe = (mon: string | undefined, khoi: string) =>
    !phamVi || phamVi.khoiHopLe(mon, khoi);
  const coPheDuyet = cauHinh.coPheDuyet !== false;
  const truongMoRong = cauHinh.truongMoRong ?? [];

  // ------- trạng thái chung -------
  const [idDangSua, setIdDangSua] = useState<string | undefined>(cauHoiId);
  const [daSua, setDaSua] = useState(false);
  const [roiSau, setRoiSau] = useState<string | null>(null);
  const [dangLuu, setDangLuu] = useState(false);

  // ------- cột trái -------
  const [loaiCau, setLoaiCau] = useState<LoaiCauHoi>(LoaiCauHoi.TracNghiem1DapAn);
  const [noiDung, setNoiDung] = useState('');
  const [phuongAn, setPhuongAn] = useState<MucVanBan[]>(taoPhuongAnMacDinh);
  const [y4, setY4] = useState<MucVanBan[]>(tao4Y);
  const [capGhep, setCapGhep] = useState<CapGhep[]>([
    { id: idMoi(), trai: '', phai: '' },
    { id: idMoi(), trai: '', phai: '' },
  ]);
  const [mucSapXep, setMucSapXep] = useState<MucVanBan[]>([
    { id: idMoi(), noiDung: '', dung: false },
    { id: idMoi(), noiDung: '', dung: false },
  ]);
  const [dapAnChapNhan, setDapAnChapNhan] = useState<DapAnChapNhan[]>([
    { id: idMoi(), giaTri: '', saiSo: 0 },
  ]);
  const [dapAnGoiY, setDapAnGoiY] = useState('');
  // Rubric dạng cây của câu tự luận (undefined = chưa soạn → trình soạn tự khởi tạo)
  const [rubric, setRubric] = useState<CayRubric | undefined>();
  const [nguLieu, setNguLieu] = useState('');
  const [cauCon, setCauCon] = useState<CauCon[]>([]);
  const [dungSaiDapAn, setDungSaiDapAn] = useState(true); // loại Đúng/Sai đơn

  // ------- cột phải (phân loại 5 chiều) -------
  const [monHocId, setMonHocId] = useState<string>();
  const [khoiId, setKhoiId] = useState<string>();
  const [tieuMucId, setTieuMucId] = useState<string>();
  const [cdtd, setCdtd] = useState<CapDoTuDuy>();
  const [tpnlIds, setTpnlIds] = useState<string[]>([]);
  // Mã phân loại trong nội dung dán từ Word không khớp danh mục → trường báo đỏ tới khi chọn lại
  const [loiPhanLoai, setLoiPhanLoai] = useState<LoiPhanLoai>({});
  const boLoiPhanLoai = (...cacTruong: (keyof LoiPhanLoai)[]) =>
    setLoiPhanLoai((cu) => {
      if (!cacTruong.some((t) => cu[t])) return cu;
      const moi = { ...cu };
      cacTruong.forEach((t) => delete moi[t]);
      return moi;
    });
  // Câu vừa dán có mã phân loại nhưng CHƯA chọn Môn – Khối (danh mục chủ đề/TPNL nạp theo Môn – Khối):
  // giữ lại, chọn xong Môn – Khối và danh mục nạp về thì tự điền, không phải dán lại
  const [phanLoaiCho, setPhanLoaiCho] = useState<CauHoiBocTach | null>(null);
  // Trường riêng của hệ (Mục đích sử dụng, Loại hình thi…) — khóa = TruongMoRong.khoa
  const [giaTriMoRong, setGiaTriMoRong] = useState<Record<string, string | undefined>>({});
  const [luaChonMoRong, setLuaChonMoRong] = useState<Record<string, LuaChon[]>>({});
  // Giá trị trường riêng khi nạp câu để sửa (VD nhóm câu neo đang gắn)
  const [giaTriMoRongGoc, setGiaTriMoRongGoc] = useState<Record<string, string | undefined>>({});
  const [diemGoiY, setDiemGoiY] = useState<number>(0.5);
  // Kho câu hỏi (thay thẻ tự do) — bắt buộc, mỗi câu thuộc đúng 1 kho
  const [khoId, setKhoId] = useState<string>();
  const [kieuHienThi, setKieuHienThi] = useState<KieuHienThiCauHoi>('tren-duoi');
  const [cheDoDao, setCheDoDao] = useState<CheDoDaoCauHoi>(CheDoDaoCauHoi.KhongDao);
  // Bản đọc đề bài (.mp3) — chỉ Khối 1–3; có bản đọc thì không được đảo đáp án
  const [banDoc, setBanDoc] = useState<BanDocDeBai>();
  const coBanDoc = laKhoiCoBanDoc(khoiId) && !!banDoc;

  // ------- danh mục -------
  const [dsMon, setDsMon] = useState<LuaChon[]>([]);
  const [dsKhoi, setDsKhoi] = useState<LuaChon[]>([]);
  // Cấp Trường: GV chỉ soạn cho khối có lớp được phân công dạy môn đang chọn (YC-NH-00b)
  const dsKhoiChon = useMemo(
    () => dsKhoi.filter((k) => khoiHopLe(monHocId, k.value)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dsKhoi, phamVi, monHocId],
  );
  const [dsTpnl, setDsTpnl] = useState<MucDanhMuc[]>([]);
  const [dsKho, setDsKho] = useState<KhoCauHoiChon[]>([]);
  const [cayChuDe, setCayChuDe] = useState<NutChuDe[]>([]);

  // ------- modal/drawer -------
  const [moXemTruoc, setMoXemTruoc] = useState(false);
  const [moHuongDan, setMoHuongDan] = useState(false);
  const [moNhapNhanh, setMoNhapNhanh] = useState(false);
  const [vanBanNhapNhanh, setVanBanNhapNhanh] = useState('');

  useDirtyGuard(daSua && !roiSau);

  useEffect(() => {
    if (roiSau) navigate(roiSau);
  }, [roiSau, navigate]);

  const suaRoi = () => setDaSua(true);

  // Nạp danh mục
  useEffect(() => {
    nguon.layDanhSachMonHoc().then((ds) =>
      setDsMon(ds.map((m) => ({ value: m.id, label: m.ten }))),
    );
    nguon.layDanhSachKhoi().then((ds) =>
      setDsKhoi(ds.map((k) => ({ value: k.id, label: k.ten }))),
    );
    // Chỉ kho của tầng đang làm (kho Trường / Tổ / riêng — YC-NH-00b)
    nguon.layDanhSachKho().then(setDsKho);
    // Danh mục nạp một lần khi mở màn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Giữ ngữ cảnh Môn–Khối–Loại hình lần soạn trước (chỉ khi tạo mới)
  useEffect(() => {
    if (cauHoiId) return;
    try {
      const luu = localStorage.getItem(cauHinh.khoaNguCanh);
      if (luu) {
        const nc = JSON.parse(luu);
        // Ngữ cảnh cũ ngoài phạm vi phân công hiện tại (đổi không gian/phân công) thì bỏ qua
        const monDung = nc.monHocId && monHopLe(nc.monHocId);
        if (monDung) setMonHocId(nc.monHocId);
        if (monDung && nc.khoiId && khoiHopLe(nc.monHocId, nc.khoiId)) setKhoiId(nc.khoiId);
        if (nc.giaTriMoRong) setGiaTriMoRong(nc.giaTriMoRong);
        if (nc.khoId && !khoTuUrl) setKhoId(nc.khoId);
      }
    } catch {
      /* bỏ qua */
    }
    if (khoTuUrl) setKhoId(khoTuUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cauHoiId, khoTuUrl]);

  // Kho chọn sẵn gắn môn → chọn luôn môn của kho (bỏ khối nếu ngữ cảnh cũ là môn khác)
  const [daApMonCuaKho, setDaApMonCuaKho] = useState(false);
  useEffect(() => {
    if (cauHoiId || !khoTuUrl || daApMonCuaKho || !dsKho.length) return;
    setDaApMonCuaKho(true);
    const monCuaKho = dsKho.find((k) => k.id === khoTuUrl)?.monHocId;
    if (!monCuaKho || !monHopLe(monCuaKho) || monCuaKho === monHocId) return;
    setMonHocId(monCuaKho);
    setKhoiId(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cauHoiId, khoTuUrl, daApMonCuaKho, dsKho, monHocId]);

  // Nạp dữ liệu chế độ sửa
  useEffect(() => {
    if (!cauHoiId) return;
    nguon.layChiTiet(cauHoiId).then((cau) => {
      setLoaiCau(cau.loaiCau);
      setNoiDung(cau.noiDung);
      setMonHocId(cau.monHocId);
      setKhoiId(cau.khoiId);
      setTieuMucId(cau.tieuMucId);
      setCdtd(cau.cdtd);
      setTpnlIds(cau.tpnlIds.slice(0, 1));
      setGiaTriMoRong(cau.giaTriMoRong ?? {});
      setGiaTriMoRongGoc(cau.giaTriMoRong ?? {});
      setKhoId(cau.khoId);
      setDiemGoiY(cau.diemGoiY);
      setRubric(cau.rubric);
      setKieuHienThi(cau.kieuHienThi ?? 'tren-duoi');
      setCheDoDao(cau.cheDoDao ?? CheDoDaoCauHoi.KhongDao);
      setBanDoc(cau.banDocDeBai);
      if (cau.dapAnGoiY) setDapAnGoiY(cau.dapAnGoiY);
      if (cau.nguLieu) setNguLieu(cau.nguLieu);
      if (cau.cauCon?.length) setCauCon(cau.cauCon.map((cc) => ({ ...cc, phuongAn: cc.phuongAn.map((p) => ({ ...p })) })));
      const muc = cau.phuongAn.map((p) => ({ ...p }));
      if (cau.loaiCau === LoaiCauHoi.DungSai4Y && muc.length) setY4(muc);
      else if (muc.length) setPhuongAn(muc);
    });
    // Chỉ nạp theo id câu (nguồn có thể là hàm tạo mới mỗi lần render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cauHoiId]);

  // Cây chủ đề theo Môn–Khối
  useEffect(() => {
    if (!monHocId || !khoiId) {
      setCayChuDe([]);
      return;
    }
    nguon.layCayChuDe(monHocId, khoiId).then(setCayChuDe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monHocId, khoiId]);

  // TPNL theo Môn + Khối (khối quy ra cấp học)
  useEffect(() => {
    if (!monHocId || !khoiId) {
      setDsTpnl([]);
      return;
    }
    nguon.layDanhSachTpnl(monHocId).then(setDsTpnl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monHocId, khoiId]);

  /** Ngữ cảnh truyền cho trường riêng của hệ */
  const nguCanhMoRong = (khoa: string) => ({
    idDangSua,
    loaiCau,
    monHocId,
    khoiId,
    giaTriGoc: giaTriMoRongGoc[khoa],
  });
  const lyDoChanMoRong = (khoa: string) => {
    const t = truongMoRong.find((x) => x.khoa === khoa);
    return t?.kiemTra ? t.kiemTra(giaTriMoRong[khoa], nguCanhMoRong(khoa)) : [];
  };

  // Lựa chọn của trường riêng — nạp lại khi đổi Môn/Khối (VD nhóm câu neo cùng môn–khối)
  useEffect(() => {
    let huy = false;
    truongMoRong.forEach((t) =>
      Promise.resolve(t.luaChon(nguCanhMoRong(t.khoa))).then((ds) => {
        if (!huy) setLuaChonMoRong((cu) => ({ ...cu, [t.khoa]: ds }));
      }),
    );
    return () => {
      huy = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monHocId, khoiId, giaTriMoRongGoc]);

  const tieuMucDangChon = useMemo(() => {
    for (const cd of cayChuDe) {
      const tm = (cd.con ?? []).find((c) => c.id === tieuMucId);
      if (tm) return { chuDe: cd, tieuMuc: tm };
    }
    return null;
  }, [cayChuDe, tieuMucId]);

  /** TPNL gợi ý theo tiểu mục — hiện trước */
  const tpnlSapXep = useMemo(() => {
    const goiY = new Set(tieuMucDangChon?.tieuMuc.tpnlIds ?? []);
    return [...dsTpnl].sort((a, b) => Number(goiY.has(b.id)) - Number(goiY.has(a.id)));
  }, [dsTpnl, tieuMucDangChon]);

  /** TPNL sắp theo gợi ý của một tiểu mục bất kỳ (dùng cho câu con) */
  const tpnlTheoTieuMuc = (tmId?: string): LuaChon[] => {
    let goiY: string[] = [];
    for (const cd of cayChuDe) {
      const tm = (cd.con ?? []).find((c) => c.id === tmId);
      if (tm) goiY = tm.tpnlIds;
    }
    return [...dsTpnl]
      .sort((a, b) => Number(goiY.includes(b.id)) - Number(goiY.includes(a.id)))
      .map((t) => ({
        value: t.id,
        label: t.ten,
        moTa: goiY.includes(t.id) ? 'Gợi ý theo tiểu mục đã chọn' : undefined,
      }));
  };

  const phanLoaiCauConMacDinh = () => ({ tieuMucId, tpnlId: tpnlIds[0], cdtd });

  /**
   * Mã phân loại trong câu dán ("CH-TN:0100.010010_VD_TC_1") → tự chọn Tiểu mục · CĐTD · TPNL · Khả năng đảo
   * theo danh mục của Môn – Khối đang chọn; mã không có trong danh mục → ô tương ứng để trống + báo đỏ.
   */
  const apDungPhanLoaiCauChinh = (kq: CauHoiBocTach) => {
    if (!kq.phanLoai) return;
    const ma = tuPhanLoaiTienTo(kq.phanLoai);
    const pl = anhXaPhanLoai(ma, { cayChuDe, dsTpnl });
    setTieuMucId(pl.tieuMucId);
    setCdtd(pl.cdtd);
    setTpnlIds(pl.tpnlId ? [pl.tpnlId] : []);
    if (pl.cheDoDao) setCheDoDao(coBanDoc ? boDaoDapAn(pl.cheDoDao) : pl.cheDoDao);
    setLoiPhanLoai(pl.loi);
    if (coLoiPhanLoai(pl.loi)) baoLoi(`Mã phân loại ${ma.dongMa}: ${moTaLoiPhanLoai(pl.loi)} — chọn lại các ô báo đỏ`);
    else baoThanhCong(`Đã điền phân loại theo mã ${ma.dongMa}`);
  };
  /** Phân loại câu con thứ i: tiền tố riêng của câu con, không có thì dùng tiền tố của nhóm */
  const phanLoaiCauConTheoMa = (kq: CauHoiBocTach, i: number) => {
    const tienTo = kq.cauCon?.[i]?.phanLoai ?? kq.phanLoai;
    if (!tienTo) return null;
    const pl = anhXaPhanLoai(tuPhanLoaiTienTo(tienTo), { cayChuDe, dsTpnl }, i);
    return { tieuMucId: pl.tieuMucId, tpnlId: pl.tpnlId, cdtd: pl.cdtd };
  };
  const coMaPhanLoai = (kq: CauHoiBocTach) => !!kq.phanLoai || (kq.cauCon ?? []).some((c) => c.phanLoai);

  // Chọn xong Môn – Khối, danh mục đã nạp → điền phân loại của câu dán đang chờ
  useEffect(() => {
    if (!phanLoaiCho || !monHocId || !khoiId || !cayChuDe.length || !dsTpnl.length) return;
    apDungPhanLoaiCauChinh(phanLoaiCho);
    setCauCon((ds) => ds.map((cc, i) => ({ ...cc, ...(phanLoaiCauConTheoMa(phanLoaiCho, i) ?? {}) })));
    setPhanLoaiCho(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phanLoaiCho, monHocId, khoiId, cayChuDe, dsTpnl]);

  /** Đổi Môn/Khối thì tiểu mục (và TPNL khi đổi Môn) của câu con không còn hợp lệ */
  const boPhanLoaiCauConTheoMonKhoi = (doiMon: boolean) =>
    setCauCon((ds) =>
      ds.map((cc) => ({ ...cc, tieuMucId: undefined, tpnlId: doiMon ? undefined : cc.tpnlId })),
    );

  const laCauChumHoacTuLuan =
    loaiCau === LoaiCauHoi.CauChum || loaiCau === LoaiCauHoi.TuLuan;

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
          title: (
            <span className="soan-cau-hoi__node-tm">
              <span>{tm.ten}</span>
              <span className="soan-cau-hoi__node-mo-ta">
                {cd.ten} · {tm.soCauHoi} câu hiện có
              </span>
            </span>
          ),
        })),
      })),
    [cayChuDe],
  );

  // ================= NHẬP NHANH =================
  const apDungNhapNhanh = () => {
    const dong = vanBanNhapNhanh
      .split('\n')
      .map((d) => d.trim())
      .filter(Boolean);
    if (!dong.length) {
      setMoNhapNhanh(false);
      return;
    }
    if (nhomTracNghiem.includes(loaiCau)) {
      setPhuongAn(
        dong.map((d) => ({
          id: idMoi(),
          noiDung: d.replace(/^\*\s*/, ''),
          dung: d.startsWith('*'),
        })),
      );
    } else if (loaiCau === LoaiCauHoi.DungSai4Y) {
      setY4(
        dong.slice(0, 4).map((d) => ({
          id: idMoi(),
          noiDung: d.replace(/^\*\s*/, ''),
          dung: d.startsWith('*'),
        })),
      );
    } else if (nhomGhep.includes(loaiCau)) {
      setCapGhep(
        dong.map((d) => {
          const [trai, phai] = d.split('|').map((p) => p?.trim() ?? '');
          return { id: idMoi(), trai, phai };
        }),
      );
    } else if (nhomSapXep.includes(loaiCau)) {
      setMucSapXep(dong.map((d) => ({ id: idMoi(), noiDung: d, dung: false })));
    } else if (nhomDien.includes(loaiCau)) {
      setDapAnChapNhan(dong.map((d) => ({ id: idMoi(), giaTri: d, saiSo: 0 })));
    }
    suaRoi();
    setVanBanNhapNhanh('');
    setMoNhapNhanh(false);
    baoThanhCong(`Đã sinh ${dong.length} mục từ nội dung nhập nhanh`);
  };

  // ================= XÂY DỰNG DỮ LIỆU LƯU =================
  const xayPhuongAnLuu = (): PhuongAnCauHoi[] => {
    if (nhomTracNghiem.includes(loaiCau)) {
      return phuongAn
        .filter((p) => p.noiDung.trim())
        .map((p) => ({ id: p.id, noiDung: p.noiDung, dung: p.dung }));
    }
    if (loaiCau === LoaiCauHoi.DungSai) {
      return [
        { id: `${idMoi()}-d`, noiDung: 'Đúng', dung: dungSaiDapAn },
        { id: `${idMoi()}-s`, noiDung: 'Sai', dung: !dungSaiDapAn },
      ];
    }
    if (loaiCau === LoaiCauHoi.DungSai4Y) {
      return y4
        .filter((p) => p.noiDung.trim())
        .map((p) => ({ id: p.id, noiDung: p.noiDung, dung: p.dung }));
    }
    if (nhomGhep.includes(loaiCau)) {
      return capGhep
        .filter((c) => c.trai.trim() || c.phai.trim())
        .map((c) => ({ id: c.id, noiDung: `${c.trai} — ${c.phai}`, dung: true }));
    }
    if (nhomSapXep.includes(loaiCau)) {
      return mucSapXep
        .filter((m) => m.noiDung.trim())
        .map((m, i) => ({ id: m.id, noiDung: `${i + 1}. ${m.noiDung}`, dung: true }));
    }
    return [];
  };

  const xayDapAnGoiYLuu = (): string | undefined => {
    if (nhomDien.includes(loaiCau)) {
      const ds = dapAnChapNhan.filter((d) => d.giaTri.trim());
      if (!ds.length) return undefined;
      return ds
        .map((d) => (d.saiSo ? `${d.giaTri} (± ${d.saiSo})` : d.giaTri))
        .join('; ');
    }
    // Tự luận: rubric lưu có cấu trúc ở trường `rubric`, đáp án gợi ý chỉ còn phần trình bày chung
    if (loaiCau === LoaiCauHoi.TuLuan) return dapAnGoiY || undefined;
    return dapAnGoiY || undefined;
  };

  const kiemTraHopLe = (): boolean => {
    if (loaiCau === LoaiCauHoi.CauChum ? !boThe(nguLieu) && !boThe(noiDung) : !boThe(noiDung)) {
      baoLoi(
        loaiCau === LoaiCauHoi.CauChum
          ? 'Vui lòng nhập Ngữ liệu chung (hoặc Lời dẫn chung) cho câu hỏi nhóm'
          : 'Vui lòng nhập nội dung đề bài',
      );
      return false;
    }
    if (!monHocId || !khoiId) {
      baoLoi('Vui lòng chọn Môn và Khối');
      return false;
    }
    if (!monHopLe(monHocId) || !khoiHopLe(monHocId, khoiId)) {
      baoLoi('Môn – khối ngoài phạm vi được phân công');
      return false;
    }
    if (coLoiPhanLoai(loiPhanLoai)) {
      baoLoi(`Mã phân loại dán từ Word chưa khớp danh mục — chọn lại các ô báo đỏ: ${moTaLoiPhanLoai(loiPhanLoai)}`);
      return false;
    }
    if (!tieuMucId) {
      baoLoi('Vui lòng chọn Chủ đề/Tiểu mục');
      return false;
    }
    if (!cdtd) {
      baoLoi('Vui lòng chọn Cấp độ tư duy');
      return false;
    }
    // Kho câu hỏi không bắt buộc — có chọn thì phải đúng môn
    const kho = dsKho.find((k) => k.id === khoId);
    if (kho?.monHocId && kho.monHocId !== monHocId) {
      baoLoi(`Kho "${kho.ten}" không dùng cho môn đang chọn — chọn lại Kho câu hỏi`);
      return false;
    }
    if (!tpnlIds.length) {
      baoLoi('Vui lòng chọn Thành phần năng lực');
      return false;
    }
    const truongThieu = truongMoRong.find((t) => t.batBuoc && !giaTriMoRong[t.khoa]);
    if (truongThieu) {
      baoLoi(`Vui lòng chọn ${truongThieu.nhan}`);
      return false;
    }
    for (const t of truongMoRong) {
      const lyDo = lyDoChanMoRong(t.khoa);
      if (lyDo.length) {
        baoLoi(`${t.nhan}: ${lyDo.join('; ')}`);
        return false;
      }
    }
    if (loaiCau === LoaiCauHoi.CauChum) {
      const viTri = cauCon.findIndex((cc) => !cc.tieuMucId || !cc.tpnlId || !cc.cdtd);
      if (viTri >= 0) {
        baoLoi(`Câu con ${viTri + 1}: vui lòng chọn đủ Tiểu mục, Thành phần năng lực, Cấp độ tư duy`);
        return false;
      }
    }
    if (nhomTracNghiem.includes(loaiCau)) {
      const co = phuongAn.filter((p) => p.noiDung.trim());
      if (co.length < 2) {
        baoLoi('Cần ít nhất 2 phương án có nội dung');
        return false;
      }
      if (!co.some((p) => p.dung)) {
        baoLoi('Vui lòng đánh dấu ít nhất 1 phương án đúng');
        return false;
      }
    }
    return true;
  };

  const luuNguCanh = () => {
    try {
      localStorage.setItem(
        cauHinh.khoaNguCanh,
        JSON.stringify({ monHocId, khoiId, giaTriMoRong, khoId }),
      );
    } catch {
      /* bỏ qua */
    }
  };

  const luu = async (trangThai: TrangThaiNoiDung): Promise<{ id: string } | null> => {
    if (!kiemTraHopLe()) return null;
    // Rubric chỉ gửi duyệt/dùng ngay được khi không còn lỗi (cảnh báo không chặn); lưu nháp vẫn cho phép
    if (cauHinh.coRubric && loaiCau === LoaiCauHoi.TuLuan && trangThai !== TrangThaiNoiDung.Nhap) {
      const loiRubric = rubric ? kiemTraRubric(rubric, { diemMucTieu: diemGoiY, cheDo: 'dgtx' }).filter((v) => v.mucDo === 'loi') : [];
      if (!rubric) {
        baoLoi('Câu tự luận cần có rubric chấm');
        return null;
      }
      if (loiRubric.length) {
        baoLoi(`Rubric còn ${loiRubric.length} lỗi: ${loiRubric[0].thongBao}`);
        return null;
      }
    }
    setDangLuu(true);
    const laCauChum = loaiCau === LoaiCauHoi.CauChum;
    const duLieu: DuLieuLuuCauHoi = {
      noiDung: laCauChum && !boThe(noiDung) ? nguLieu : noiDung,
      loaiCau,
      monHocId: monHocId!,
      khoiId: khoiId!,
      tieuMucId: tieuMucId!,
      tenChuDe: tieuMucDangChon?.chuDe.ten ?? '',
      tenTieuMuc: tieuMucDangChon?.tieuMuc.ten ?? '',
      cdtd: cdtd!,
      tpnlIds,
      khoId,
      trangThai,
      phuongAn: xayPhuongAnLuu(),
      dapAnGoiY: xayDapAnGoiYLuu(),
      diemGoiY,
      rubric: cauHinh.coRubric && loaiCau === LoaiCauHoi.TuLuan ? rubric : undefined,
      kieuHienThi: laCauChumHoacTuLuan ? kieuHienThi : undefined,
      cheDoDao: coBanDoc ? boDaoDapAn(cheDoDao) : cheDoDao,
      banDocDeBai: coBanDoc ? banDoc : undefined,
      nguLieu: laCauChum ? nguLieu : undefined,
      cauCon: laCauChum
        ? cauCon.map((cc) => ({ ...cc, phuongAn: cc.phuongAn.filter((pa) => pa.noiDung.trim()) }))
        : undefined,
      giaTriMoRong,
    };
    try {
      const kq = idDangSua
        ? await nguon.capNhat(idDangSua, duLieu)
        : await nguon.tao(duLieu);
      luuNguCanh();
      onDaLuu?.(kq.id);
      return kq;
    } finally {
      setDangLuu(false);
    }
  };

  const lamTrongCotTrai = () => {
    setNoiDung('');
    setPhuongAn(taoPhuongAnMacDinh());
    setY4(tao4Y());
    setCapGhep([
      { id: idMoi(), trai: '', phai: '' },
      { id: idMoi(), trai: '', phai: '' },
    ]);
    setMucSapXep([
      { id: idMoi(), noiDung: '', dung: false },
      { id: idMoi(), noiDung: '', dung: false },
    ]);
    setDapAnChapNhan([{ id: idMoi(), giaTri: '', saiSo: 0 }]);
    setDapAnGoiY('');
    setRubric(undefined);
    setNguLieu('');
    setCauCon([]);
    setBanDoc(undefined);
  };

  const luuNhap = async () => {
    const kq = await luu(TrangThaiNoiDung.Nhap);
    if (kq) {
      baoThanhCong('Đã lưu nháp câu hỏi');
      setDaSua(false);
      setRoiSau(quayLai);
    }
  };

  /** Có phê duyệt: lưu nháp rồi soạn tiếp; không phê duyệt (ĐGTX): lưu thành câu dùng được ngay */
  const luuVaSoanTiep = async () => {
    const kq = await luu(coPheDuyet ? TrangThaiNoiDung.Nhap : TrangThaiNoiDung.DaDuyet);
    if (kq) {
      baoThanhCong('Đã lưu — phân loại được giữ nguyên, mời soạn câu tiếp theo');
      setIdDangSua(undefined); // chuyển sang chế độ tạo mới
      lamTrongCotTrai();
      setDaSua(false);
    }
  };

  /** Gửi duyệt; hoặc (không phê duyệt — ĐGTX) lưu thành câu dùng được ngay */
  const guiDuyet = async () => {
    const kq = await luu(coPheDuyet ? TrangThaiNoiDung.ChoDuyet : TrangThaiNoiDung.DaDuyet);
    if (kq) {
      baoThanhCong(coPheDuyet ? 'Đã gửi duyệt câu hỏi' : 'Đã lưu câu hỏi — dùng được ngay');
      setDaSua(false);
      setRoiSau(quayLai);
    }
  };

  // ================= DỮ LIỆU XEM TRƯỚC =================
  const cauXemTruoc: CauHoiXemTruoc = useMemo(() => {
    let paXem: CauHoiXemTruoc['phuongAn'] = [];
    if (nhomTracNghiem.includes(loaiCau)) {
      paXem = phuongAn.filter((p) => p.noiDung.trim());
    } else if (loaiCau === LoaiCauHoi.DungSai) {
      paXem = [
        { id: 'd', noiDung: 'Đúng', dung: dungSaiDapAn },
        { id: 's', noiDung: 'Sai', dung: !dungSaiDapAn },
      ];
    } else if (loaiCau === LoaiCauHoi.DungSai4Y) {
      paXem = y4.filter((p) => p.noiDung.trim());
    } else if (nhomGhep.includes(loaiCau)) {
      paXem = capGhep
        .filter((c) => c.trai || c.phai)
        .map((c) => ({ id: c.id, noiDung: `${c.trai} — ${c.phai}`, dung: false }));
    } else if (nhomSapXep.includes(loaiCau)) {
      paXem = mucSapXep
        .filter((m) => m.noiDung.trim())
        .map((m) => ({ id: m.id, noiDung: m.noiDung, dung: false }));
    }
    return {
      noiDung: noiDung || '<i>(Chưa có nội dung đề bài)</i>',
      loaiCau: loaiCau === LoaiCauHoi.DungSai4Y ? LoaiCauHoi.DungSai4Y : loaiCau,
      phuongAn: paXem,
      dapAnGoiY: xayDapAnGoiYLuu(),
      kieuHienThi: laCauChumHoacTuLuan ? kieuHienThi : undefined,
      nguLieu: loaiCau === LoaiCauHoi.CauChum ? nguLieu : undefined,
      banDocDeBai: coBanDoc ? banDoc : undefined,
      cauCon: cauCon.map((cc) => ({
        id: cc.id,
        noiDung: cc.noiDung,
        loaiCau: cc.loaiCau,
        phuongAn: cc.phuongAn.filter((p) => p.noiDung.trim()),
      })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loaiCau, noiDung, phuongAn, y4, capGhep, mucSapXep, dapAnChapNhan,
    dapAnGoiY, rubric, nguLieu, cauCon, kieuHienThi, dungSaiDapAn, laCauChumHoacTuLuan,
    coBanDoc, banDoc,
  ]);

  // ================= KHU ĐÁP ÁN THEO LOẠI CÂU =================
  const suaMuc = (
    ds: MucVanBan[],
    dat: (v: MucVanBan[]) => void,
    id: string,
    thay: Partial<MucVanBan>,
  ) => {
    dat(ds.map((m) => (m.id === id ? { ...m, ...thay } : m)));
    suaRoi();
  };

  /**
   * BÓC TÁCH TỰ ĐỘNG khi dán nguyên câu hỏi từ Word vào ô Đề bài — do plugin oImportWord
   * thực hiện theo LOẠI CÂU đang chọn (cùng bộ định dạng với chức năng import tệp Word);
   * ở đây chỉ ánh xạ kết quả vào các ô của form. Không tách được → OEditor dán nguyên văn.
   */
  const apDungBocTach = (kq: CauHoiBocTach) => {
    const thanhMuc = (ds: { noiDung: string; dung: boolean }[]): MucVanBan[] =>
      ds.map((p) => ({ id: idMoi(), noiDung: p.noiDung, dung: p.dung }));
    const chuDung = (ds: { dung: boolean }[], chuDau: number) =>
      ds
        .map((p, i) => (p.dung ? String.fromCharCode(chuDau + i) : null))
        .filter(Boolean)
        .join(', ');

    // Mã phân loại: danh mục Chủ đề – Tiểu mục, TPNL nạp theo Môn – Khối → đã chọn Môn – Khối thì điền ngay,
    // chưa chọn thì giữ lại và tự điền khi chọn xong (không phải dán lại)
    const coDanhMuc = !!monHocId && !!khoiId;
    if (coMaPhanLoai(kq) && !coDanhMuc) {
      setPhanLoaiCho(kq);
      message.info('Đã đọc mã phân loại trong nội dung dán — chọn Môn và Khối, hệ thống sẽ tự điền Tiểu mục, Cấp độ tư duy, Thành phần năng lực và Khả năng đảo');
    } else {
      setPhanLoaiCho(null);
      apDungPhanLoaiCauChinh(kq);
    }
    const phanLoaiCauCon = (_c: CauHoiBocTach, i: number) =>
      (coDanhMuc ? phanLoaiCauConTheoMa(kq, i) : null) ?? phanLoaiCauConMacDinh();

    if (nhomTracNghiem.includes(kq.loaiCau as LoaiCauHoi)) {
      const ds = thanhMuc(kq.phuongAn);
      if (loaiCau === LoaiCauHoi.TracNghiem1DapAn && !ds.some((d) => d.dung) && ds[0]) ds[0].dung = true;
      setPhuongAn(ds);
      baoThanhCong(
        kq.phuongAn.some((p) => p.dung)
          ? `Đã bóc tách đề bài + ${ds.length} phương án (đáp án đúng: ${chuDung(ds, 65)})`
          : `Đã bóc tách đề bài + ${ds.length} phương án — chưa nhận diện được đáp án đúng, hãy đánh dấu lại`,
      );
    } else if (kq.loaiCau === LoaiCauHoi.DungSai4Y) {
      const ds = thanhMuc(kq.phuongAn);
      while (ds.length < 4) ds.push({ id: idMoi(), noiDung: '', dung: false });
      setY4(ds.slice(0, 4));
      baoThanhCong(`Đã bóc tách đề bài + ${kq.phuongAn.length} ý Đúng/Sai — kiểm tra lại đánh dấu Đ/S từng ý`);
    } else if (kq.loaiCau === LoaiCauHoi.DungSai) {
      if (kq.dapAn) setDungSaiDapAn(kq.dapAn === 'Đúng');
      baoThanhCong(
        kq.dapAn
          ? `Đã bóc tách nhận định — đáp án: ${kq.dapAn}`
          : 'Đã bóc tách nhận định — chưa có "Đáp án: Đúng/Sai", hãy chọn đáp án',
      );
    } else if (kq.loaiCau === LoaiCauHoi.TraLoiNgan) {
      setDapAnChapNhan([{ id: idMoi(), giaTri: kq.dapAn ?? '', saiSo: 0 }]);
      baoThanhCong(
        `Đã tách dòng "Đáp án" → điền vào đáp án chấp nhận: ${kq.dapAn ?? ''}${kq.lyDo.length ? ` — ${kq.lyDo.join('; ')}` : ''}`,
      );
    } else if (kq.loaiCau === LoaiCauHoi.DienKhuyet) {
      const cacO = (kq.dapAn ?? '')
        .split(/\s*;\s*/)
        .map((d) => d.replace(/^\(\s*(?:\d+|N\*+(?:\s*\+\s*\d+)?)\s*\)\s*/, '').trim())
        .filter(Boolean);
      setDapAnChapNhan(
        (cacO.length ? cacO : ['']).map((giaTri) => ({ id: idMoi(), giaTri, saiSo: 0 })),
      );
      baoThanhCong(
        `Đã bóc tách ${kq.soOTrong ?? 0} ô trống${cacO.length ? ` — đáp án: ${cacO.join('; ')}` : ' — hãy nhập đáp án chấp nhận'}`,
      );
    } else if (kq.loaiCau === LoaiCauHoi.TuLuan) {
      setDapAnGoiY(kq.loiGiai ?? '');
      baoThanhCong('Đã tách phần lời giải → điền vào đáp án gợi ý cho người chấm');
    } else if (kq.loaiCau === LoaiCauHoi.CauChum) {
      const choPhep = loaiCauConChoPhep.map((l) => l.value);
      let soDoiLoai = 0;
      setNguLieu(kq.nguLieu ?? '');
      setCauCon(
        (kq.cauCon ?? []).map((c, i) => {
          const hopLe = choPhep.includes(c.loaiCau);
          if (!hopLe) soDoiLoai += 1;
          return {
            id: idMoi(),
            loaiCau: (hopLe ? c.loaiCau : LoaiCauHoi.TracNghiem1DapAn) as LoaiCauHoi,
            noiDung: c.noiDung,
            phuongAn: c.phuongAn.length ? thanhMuc(c.phuongAn) : taoPhuongAnMacDinh(),
            ...phanLoaiCauCon(c, i),
          };
        }),
      );
      baoThanhCong(
        `Đã bóc tách ngữ liệu + ${kq.cauCon?.length ?? 0} câu hỏi con${soDoiLoai ? ` — ${soDoiLoai} câu con không phải trắc nghiệm, cần kiểm tra loại câu` : ''}`,
      );
    }
    if (kq.loiGiai && kq.loaiCau !== LoaiCauHoi.TuLuan && !dapAnGoiY) setDapAnGoiY(kq.loiGiai);
    suaRoi();
  };

  const khuTracNghiem = (
    <div className="soan-cau-hoi__ds-muc">
      {phuongAn.map((pa, i) => (
        <div key={pa.id} className="soan-cau-hoi__muc">
          <span className="soan-cau-hoi__muc-ky-tu">
            {String.fromCharCode(65 + i)}
          </span>
          <OEditor
            gon
            value={pa.noiDung}
            placeholder={`Nội dung phương án ${String.fromCharCode(65 + i)} — nút Σ để chèn công thức`}
            onChange={(html) => suaMuc(phuongAn, setPhuongAn, pa.id, { noiDung: html })}
          />
          {loaiCau === LoaiCauHoi.TracNghiem1DapAn ? (
            <Radio
              checked={pa.dung}
              onChange={() => {
                setPhuongAn(phuongAn.map((p) => ({ ...p, dung: p.id === pa.id })));
                suaRoi();
              }}
            >
              Đúng
            </Radio>
          ) : (
            <Checkbox
              checked={pa.dung}
              onChange={(e) => suaMuc(phuongAn, setPhuongAn, pa.id, { dung: e.target.checked })}
            >
              Đúng
            </Checkbox>
          )}
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="Xóa phương án"
            disabled={phuongAn.length <= 2}
            onClick={() => {
              setPhuongAn(phuongAn.filter((p) => p.id !== pa.id));
              suaRoi();
            }}
          />
        </div>
      ))}
      <Button
        icon={<PlusOutlined />}
        onClick={() => {
          setPhuongAn([...phuongAn, { id: idMoi(), noiDung: '', dung: false }]);
          suaRoi();
        }}
      >
        Thêm phương án
      </Button>
    </div>
  );

  const khuDungSai = (
    <div className="soan-cau-hoi__ds-muc">
      <span className="soan-cau-hoi__nhan-nho">Nhận định của đề bài là:</span>
      <Radio.Group
        value={dungSaiDapAn}
        onChange={(e) => {
          setDungSaiDapAn(e.target.value);
          suaRoi();
        }}
        options={[
          { value: true, label: 'Đúng' },
          { value: false, label: 'Sai' },
        ]}
      />
    </div>
  );

  const khuDungSai4Y = (
    <div className="soan-cau-hoi__ds-muc">
      {y4.map((yItem, i) => (
        <div key={yItem.id} className="soan-cau-hoi__muc">
          <span className="soan-cau-hoi__muc-ky-tu">
            {String.fromCharCode(97 + i)})
          </span>
          <OEditor
            gon
            value={yItem.noiDung}
            placeholder={`Nội dung ý ${String.fromCharCode(97 + i)} — nút Σ để chèn công thức`}
            onChange={(html) => suaMuc(y4, setY4, yItem.id, { noiDung: html })}
          />
          <Radio.Group
            value={yItem.dung}
            onChange={(e) => suaMuc(y4, setY4, yItem.id, { dung: e.target.value })}
            options={[
              { value: true, label: 'Đ' },
              { value: false, label: 'S' },
            ]}
          />
        </div>
      ))}
    </div>
  );

  const khuGhepDoi = (
    <div className="soan-cau-hoi__ds-muc">
      <div className="soan-cau-hoi__ghep-header">
        <span>Vế trái</span>
        <span>Vế phải (đáp án ghép đúng)</span>
      </div>
      {capGhep.map((c, i) => (
        <div key={c.id} className="soan-cau-hoi__muc">
          <span className="soan-cau-hoi__muc-ky-tu">{i + 1}</span>
          <Input
            placeholder="VD: Hình vuông"
            value={c.trai}
            onChange={(e) => {
              setCapGhep(capGhep.map((x) => (x.id === c.id ? { ...x, trai: e.target.value } : x)));
              suaRoi();
            }}
          />
          <Input
            placeholder="VD: 4 cạnh bằng nhau, 4 góc vuông"
            value={c.phai}
            onChange={(e) => {
              setCapGhep(capGhep.map((x) => (x.id === c.id ? { ...x, phai: e.target.value } : x)));
              suaRoi();
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="Xóa cặp"
            disabled={capGhep.length <= 2}
            onClick={() => {
              setCapGhep(capGhep.filter((x) => x.id !== c.id));
              suaRoi();
            }}
          />
        </div>
      ))}
      <Button
        icon={<PlusOutlined />}
        onClick={() => {
          setCapGhep([...capGhep, { id: idMoi(), trai: '', phai: '' }]);
          suaRoi();
        }}
      >
        Thêm cặp ghép
      </Button>
    </div>
  );

  const doiViTri = (i: number, j: number) => {
    if (j < 0 || j >= mucSapXep.length) return;
    const moi = [...mucSapXep];
    [moi[i], moi[j]] = [moi[j], moi[i]];
    setMucSapXep(moi);
    suaRoi();
  };

  const khuSapXep = (
    <div className="soan-cau-hoi__ds-muc">
      <span className="soan-cau-hoi__nhan-nho">
        Nhập các mục theo <b>đúng thứ tự</b> — hệ thống sẽ tự xáo trộn khi học sinh làm bài.
      </span>
      {mucSapXep.map((m, i) => (
        <div key={m.id} className="soan-cau-hoi__muc">
          <span className="soan-cau-hoi__muc-ky-tu">{i + 1}</span>
          <Input
            placeholder={`Mục thứ ${i + 1}`}
            value={m.noiDung}
            onChange={(e) => suaMuc(mucSapXep, setMucSapXep, m.id, { noiDung: e.target.value })}
          />
          <Button type="text" icon={<ArrowUpOutlined />} aria-label="Chuyển lên" disabled={i === 0} onClick={() => doiViTri(i, i - 1)} />
          <Button type="text" icon={<ArrowDownOutlined />} aria-label="Chuyển xuống" disabled={i === mucSapXep.length - 1} onClick={() => doiViTri(i, i + 1)} />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="Xóa mục"
            disabled={mucSapXep.length <= 2}
            onClick={() => {
              setMucSapXep(mucSapXep.filter((x) => x.id !== m.id));
              suaRoi();
            }}
          />
        </div>
      ))}
      <Button
        icon={<PlusOutlined />}
        onClick={() => {
          setMucSapXep([...mucSapXep, { id: idMoi(), noiDung: '', dung: false }]);
          suaRoi();
        }}
      >
        Thêm mục
      </Button>
    </div>
  );

  const khuDienKhuyet = (
    <div className="soan-cau-hoi__ds-muc">
      <div className="soan-cau-hoi__ghep-header">
        <span>Đáp án chấp nhận</span>
        <span>
          Sai số ±{' '}
          <Tooltip title="Áp dụng cho đáp án là số — bài làm trong khoảng [đáp án − sai số, đáp án + sai số] được tính đúng">
            <InfoCircleOutlined />
          </Tooltip>
        </span>
      </div>
      {dapAnChapNhan.map((d, i) => (
        <div key={d.id} className="soan-cau-hoi__muc">
          <span className="soan-cau-hoi__muc-ky-tu">{i + 1}</span>
          <Input
            placeholder="VD: 12,5  hoặc  châu Á"
            value={d.giaTri}
            onChange={(e) => {
              setDapAnChapNhan(dapAnChapNhan.map((x) => (x.id === d.id ? { ...x, giaTri: e.target.value } : x)));
              suaRoi();
            }}
          />
          <InputNumber
            min={0}
            style={{ width: 110 }}
            value={d.saiSo}
            onChange={(v) => {
              setDapAnChapNhan(dapAnChapNhan.map((x) => (x.id === d.id ? { ...x, saiSo: v ?? 0 } : x)));
              suaRoi();
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label="Xóa đáp án"
            disabled={dapAnChapNhan.length <= 1}
            onClick={() => {
              setDapAnChapNhan(dapAnChapNhan.filter((x) => x.id !== d.id));
              suaRoi();
            }}
          />
        </div>
      ))}
      <Button
        icon={<PlusOutlined />}
        onClick={() => {
          setDapAnChapNhan([...dapAnChapNhan, { id: idMoi(), giaTri: '', saiSo: 0 }]);
          suaRoi();
        }}
      >
        Thêm đáp án chấp nhận
      </Button>
    </div>
  );

  const khuTuLuan = (
    <div className="soan-cau-hoi__ds-muc">
      <span className="soan-cau-hoi__nhan-nho">Đáp án gợi ý cho người chấm</span>
      <OEditor
        value={dapAnGoiY}
        onChange={(html) => {
          setDapAnGoiY(html);
          suaRoi();
        }}
        placeholder="Trình bày các ý chính, các bước giải mong đợi…"
        minHeight={120}
      />
      {/* Rubric dạng cây (SRS rubric chấm tự luận) — tổng phải bằng Điểm gợi ý của câu (VR-01) */}
      {cauHinh.coRubric && (
      <>
      <span className="soan-cau-hoi__nhan-nho" style={{ marginTop: 12 }}>
        Rubric chấm — tổng điểm rubric phải bằng <b>Điểm gợi ý</b> của câu ({diemGoiY})
      </span>
      <TrinhSoanRubric
        value={rubric}
        onChange={(cay) => {
          setRubric(cay);
          suaRoi();
        }}
        diemMucTieu={diemGoiY}
        cheDo="dgtx"
        monHocId={monHocId}
        khoiId={khoiId}
        tieuDe="Hướng dẫn chấm câu tự luận"
        nguon={nguon.nguonRubric}
      />
      </>
      )}
    </div>
  );

  const suaCauCon = (id: string, thay: Partial<CauCon>) => {
    setCauCon((ds) => ds.map((cc) => (cc.id === id ? { ...cc, ...thay } : cc)));
    suaRoi();
  };

  const khuCauChum = (
    <div className="soan-cau-hoi__ds-muc">
      <span className="soan-cau-hoi__nhan-nho">
        Ngữ liệu chung (đoạn văn/bảng/hình mà các câu con cùng tham chiếu)
      </span>
      <OEditor
        value={nguLieu}
        onChange={(html) => {
          setNguLieu(html);
          suaRoi();
        }}
        placeholder="Dán/soạn ngữ liệu chung tại đây…"
        minHeight={140}
      />
      <div className="soan-cau-hoi__cau-con-header">
        <span className="soan-cau-hoi__nhan-nho">Danh sách câu hỏi con ({cauCon.length})</span>
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setCauCon([
              ...cauCon,
              {
                id: idMoi(),
                loaiCau: LoaiCauHoi.TracNghiem1DapAn,
                noiDung: '',
                phuongAn: taoPhuongAnMacDinh(),
                ...phanLoaiCauConMacDinh(),
              },
            ]);
            suaRoi();
          }}
        >
          Thêm câu con
        </Button>
      </div>
      {cauCon.length > 0 && (
        <Collapse
          className="soan-cau-hoi__ds-cau-con"
          items={cauCon.map((cc, i) => ({
            key: cc.id,
            label: `Câu ${i + 1} — ${nhanLoaiCau[cc.loaiCau]}${cc.noiDung ? `: ${boThe(cc.noiDung).slice(0, 50)}` : ''}`,
            extra: (
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                aria-label="Xóa câu con"
                onClick={(e) => {
                  e.stopPropagation();
                  setCauCon(cauCon.filter((x) => x.id !== cc.id));
                  suaRoi();
                }}
              />
            ),
            children: (
              <div className="soan-cau-hoi__cau-con-than">
                <FormSelect
                  luaChon={loaiCauConChoPhep}
                  value={cc.loaiCau}
                  style={{ maxWidth: 280 }}
                  onChange={(v) => suaCauCon(cc.id, { loaiCau: v as LoaiCauHoi })}
                />
                <OEditor
                  value={cc.noiDung}
                  onChange={(html) => {
                    suaCauCon(cc.id, { noiDung: html });
                    suaRoi();
                  }}
                  placeholder="Nội dung câu hỏi con"
                  minHeight={90}
                />
                {cc.loaiCau !== LoaiCauHoi.DungSai ? (
                  <div className="soan-cau-hoi__ds-muc">
                    {cc.phuongAn.map((pa, j) => (
                      <div key={pa.id} className="soan-cau-hoi__muc">
                        <span className="soan-cau-hoi__muc-ky-tu">
                          {String.fromCharCode(65 + j)}
                        </span>
                        <OEditor
                          gon
                          value={pa.noiDung}
                          placeholder={`Phương án ${String.fromCharCode(65 + j)} — nút Σ để chèn công thức`}
                          onChange={(html) =>
                            suaCauCon(cc.id, {
                              phuongAn: cc.phuongAn.map((p) =>
                                p.id === pa.id ? { ...p, noiDung: html } : p,
                              ),
                            })
                          }
                        />
                        {cc.loaiCau === LoaiCauHoi.TracNghiem1DapAn ? (
                          <Radio
                            checked={pa.dung}
                            onChange={() =>
                              suaCauCon(cc.id, {
                                phuongAn: cc.phuongAn.map((p) => ({ ...p, dung: p.id === pa.id })),
                              })
                            }
                          >
                            Đúng
                          </Radio>
                        ) : (
                          <Checkbox
                            checked={pa.dung}
                            onChange={(e) =>
                              suaCauCon(cc.id, {
                                phuongAn: cc.phuongAn.map((p) =>
                                  p.id === pa.id ? { ...p, dung: e.target.checked } : p,
                                ),
                              })
                            }
                          >
                            Đúng
                          </Checkbox>
                        )}
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          aria-label="Xóa phương án"
                          disabled={cc.phuongAn.length <= 2}
                          onClick={() =>
                            suaCauCon(cc.id, {
                              phuongAn: cc.phuongAn.filter((p) => p.id !== pa.id),
                            })
                          }
                        />
                      </div>
                    ))}
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() =>
                        suaCauCon(cc.id, {
                          phuongAn: [...cc.phuongAn, { id: idMoi(), noiDung: '', dung: false }],
                        })
                      }
                    >
                      Thêm phương án
                    </Button>
                  </div>
                ) : (
                  <Radio.Group
                    value={cc.phuongAn[0]?.dung ?? true}
                    onChange={(e) =>
                      suaCauCon(cc.id, {
                        phuongAn: [
                          { id: `${cc.id}-d`, noiDung: 'Đúng', dung: e.target.value },
                          { id: `${cc.id}-s`, noiDung: 'Sai', dung: !e.target.value },
                        ],
                      })
                    }
                    options={[
                      { value: true, label: 'Nhận định Đúng' },
                      { value: false, label: 'Nhận định Sai' },
                    ]}
                  />
                )}
              </div>
            ),
          }))}
        />
      )}
    </div>
  );

  const khuToMau = (
    <Alert
      type="info"
      showIcon
      title="Loại câu tương tác trên hình"
      description="Bản mô phỏng chưa hỗ trợ soạn vùng tô màu trên hình vẽ — chèn ảnh vào đề bài và mô tả vùng cần tô trong đáp án gợi ý."
    />
  );

  const khuDapAn = () => {
    if (nhomTracNghiem.includes(loaiCau)) return khuTracNghiem;
    if (loaiCau === LoaiCauHoi.DungSai) return khuDungSai;
    if (loaiCau === LoaiCauHoi.DungSai4Y) return khuDungSai4Y;
    if (nhomGhep.includes(loaiCau)) return khuGhepDoi;
    if (nhomSapXep.includes(loaiCau)) return khuSapXep;
    if (nhomDien.includes(loaiCau)) return khuDienKhuyet;
    if (loaiCau === LoaiCauHoi.TuLuan) return khuTuLuan;
    if (loaiCau === LoaiCauHoi.CauChum) return khuCauChum;
    return khuToMau;
  };

  const coNhapNhanh =
    nhomTracNghiem.includes(loaiCau) ||
    loaiCau === LoaiCauHoi.DungSai4Y ||
    nhomGhep.includes(loaiCau) ||
    nhomSapXep.includes(loaiCau) ||
    nhomDien.includes(loaiCau);

  // ================= KIỂU HIỂN THỊ (4 thẻ minh họa) =================
  const cacKieu: NonNullable<KieuHienThiCauHoi>[] = [
    'tren-duoi',
    'trai-40',
    'trai-50',
    'trai-60',
  ];

  const veMinhHoa = useCallback((kieu: NonNullable<KieuHienThiCauHoi>) => {
    if (kieu === 'tren-duoi') {
      return (
        <span className="soan-cau-hoi__minh-hoa soan-cau-hoi__minh-hoa--doc">
          <span className="o o--dam" />
          <span className="o" />
        </span>
      );
    }
    const rong = kieu === 'trai-40' ? 40 : kieu === 'trai-50' ? 50 : 60;
    return (
      <span className="soan-cau-hoi__minh-hoa">
        <span className="o o--dam" style={{ width: `${rong}%` }} />
        <span className="o" style={{ width: `${100 - rong}%` }} />
      </span>
    );
  }, []);

  return (
    <div className="soan-cau-hoi">
      <div className="soan-cau-hoi__hai-cot">
        {/* ============ CỘT TRÁI 70% ============ */}
        <div className="soan-cau-hoi__trai">
          <BoxNoiDung
            tieuDe={idDangSua ? 'Sửa câu hỏi' : 'Soạn câu hỏi mới'}
            nutQuayLai={nutQuayLai}
            duongDanQuayLai={quayLai}
            phanPhai={
              <span className="soan-cau-hoi__nut-header">
                <Button icon={<EyeOutlined />} onClick={() => setMoXemTruoc(true)}>
                  Xem trước
                </Button>
                <Tooltip title="Hướng dẫn soạn loại câu đang chọn">
                  <Button
                    icon={<QuestionCircleOutlined />}
                    aria-label="Hướng dẫn soạn"
                    onClick={() => setMoHuongDan(true)}
                  />
                </Tooltip>
              </span>
            }
          >
            <div className="soan-cau-hoi__luoi-phan-loai">
              <div className="soan-cau-hoi__o-form">
                <label className="soan-cau-hoi__nhan">
                  Môn <span className="bat-buoc">*</span>
                </label>
                <FormSelect
                  luaChon={dsMon}
                  value={monHocId}
                  placeholder="Chọn môn học"
                  status={phanLoaiCho && !monHocId ? 'warning' : undefined}
                  onChange={(v) => {
                    setMonHocId(v);
                    boPhanLoaiCauConTheoMonKhoi(true);
                    if (khoiId && !khoiHopLe(v, khoiId)) setKhoiId(undefined);
                    setTieuMucId(undefined);
                    setTpnlIds([]);
                    setLoiPhanLoai({});
                    suaRoi();
                  }}
                />
              </div>
              <div className="soan-cau-hoi__o-form">
                <label className="soan-cau-hoi__nhan">
                  Khối <span className="bat-buoc">*</span>
                </label>
                <FormSelect
                  luaChon={dsKhoiChon}
                  value={khoiId}
                  placeholder="Chọn khối"
                  status={phanLoaiCho && !khoiId ? 'warning' : undefined}
                  onChange={(v) => {
                    setKhoiId(v);
                    setTieuMucId(undefined);
                    boPhanLoaiCauConTheoMonKhoi(false);
                    suaRoi();
                  }}
                />
              </div>
              <div className="soan-cau-hoi__o-form">
                <label className="soan-cau-hoi__nhan">
                  Loại câu hỏi <span className="bat-buoc">*</span>
                </label>
                <FormSelect
                  luaChon={luaChonLoaiCau}
                  value={loaiCau}
                  onChange={(v) => {
                    setLoaiCau(v as LoaiCauHoi);
                    suaRoi();
                  }}
                />
              </div>
            </div>

            <div className="soan-cau-hoi__o-form">
              <label className="soan-cau-hoi__nhan">
                {loaiCau === LoaiCauHoi.CauChum ? (
                  <>
                    Lời dẫn chung{' '}
                    <span className="soan-cau-hoi__nhan-nho">
                      (không bắt buộc — có thể chỉ có Ngữ liệu &amp; câu hỏi con)
                    </span>
                  </>
                ) : (
                  <>
                    Đề bài <span className="bat-buoc">*</span>
                  </>
                )}
              </label>
              <OEditor
                value={noiDung}
                onChange={(html) => {
                  setNoiDung(html);
                  suaRoi();
                }}
                placeholder="Soạn đề bài tại đây — dán nguyên câu hỏi từ Word (kèm A/B/C/D, dòng Đáp án) là hệ thống tự tách đề bài & phương án…"
                minHeight={170}
                cheDo="cau-hoi"
                bocTachKhiDan={{ loaiCau, onBocTach: apDungBocTach }}
              />
            </div>

            {laKhoiCoBanDoc(khoiId) && (
              <div className="soan-cau-hoi__o-form">
                <label className="soan-cau-hoi__nhan">Bản đọc đề bài</label>
                <KhuBanDocDeBai
                  value={banDoc}
                  onChange={(v) => {
                    setBanDoc(v);
                    if (v) setCheDoDao((c) => boDaoDapAn(c));
                    suaRoi();
                  }}
                />
              </div>
            )}

            <div className="soan-cau-hoi__o-form">
              <div className="soan-cau-hoi__tieu-de-dap-an">
                <label className="soan-cau-hoi__nhan">
                  {loaiCau === LoaiCauHoi.TuLuan
                    ? 'Đáp án gợi ý & rubric'
                    : loaiCau === LoaiCauHoi.CauChum
                      ? 'Ngữ liệu & câu hỏi con'
                      : 'Đáp án / phương án'}
                </label>
                {coNhapNhanh && (
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    onClick={() => setMoNhapNhanh(true)}
                  >
                    Nhập nhanh
                  </Button>
                )}
              </div>
              {khuDapAn()}
            </div>
          </BoxNoiDung>
        </div>

        {/* ============ CỘT PHẢI 30% (cao bằng cột trái) ============ */}
        <div className="soan-cau-hoi__phai">
          <BoxNoiDung tieuDe="Thiết lập câu hỏi">
            <div className="soan-cau-hoi__o-form">
              <label className="soan-cau-hoi__nhan">
                Chủ đề / Tiểu mục <span className="bat-buoc">*</span>
              </label>
              <TreeSelect
                style={{ width: '100%' }}
                showSearch
                treeDefaultExpandAll
                treeNodeFilterProp="ten"
                treeNodeLabelProp="ten"
                filterTreeNode={(input, node) =>
                  khopTimKiem(input, String((node as { ten?: string }).ten ?? ''))
                }
                placeholder={
                  monHocId && khoiId
                    ? 'Chọn tiểu mục trong cây chủ đề'
                    : 'Chọn Môn và Khối trước'
                }
                disabled={!monHocId || !khoiId}
                status={loiPhanLoai.chuDe || loiPhanLoai.tieuMuc ? 'error' : undefined}
                value={tieuMucId}
                treeData={treeDataChuDe}
                popupMatchSelectWidth={false}
                onChange={(v) => {
                  setTieuMucId(v);
                  boLoiPhanLoai('chuDe', 'tieuMuc');
                  suaRoi();
                }}
              />
              {(loiPhanLoai.chuDe || loiPhanLoai.tieuMuc) && (
                <span className="soan-cau-hoi__loi-ma">{loiPhanLoai.chuDe ?? loiPhanLoai.tieuMuc} — chọn lại</span>
              )}
            </div>
            <div className="soan-cau-hoi__o-form">
              <label className="soan-cau-hoi__nhan">
                Thành phần năng lực <span className="bat-buoc">*</span>{' '}
                <Tooltip title="Chọn 1 thành phần năng lực — các thành phần được gợi ý theo tiểu mục đã chọn hiển thị trước">
                  <InfoCircleOutlined className="soan-cau-hoi__icon-i" />
                </Tooltip>
              </label>
              <FormSelect
                luaChon={tpnlSapXep.map((t) => ({
                  value: t.id,
                  label: t.ten,
                  moTa: tieuMucDangChon?.tieuMuc.tpnlIds.includes(t.id)
                    ? 'Gợi ý theo tiểu mục đã chọn'
                    : undefined,
                }))}
                value={tpnlSapXep.length ? tpnlIds[0] : undefined}
                placeholder={tpnlSapXep.length ? 'Chọn thành phần năng lực' : undefined}
                disabled={!tpnlSapXep.length}
                status={loiPhanLoai.tpnl ? 'error' : undefined}
                onChange={(v) => {
                  setTpnlIds(v ? [v as string] : []);
                  boLoiPhanLoai('tpnl');
                  suaRoi();
                }}
              />
              {loiPhanLoai.tpnl && <span className="soan-cau-hoi__loi-ma">{loiPhanLoai.tpnl} — chọn lại</span>}
            </div>
            <div className="soan-cau-hoi__o-form">
              <label className="soan-cau-hoi__nhan">
                Cấp độ tư duy <span className="bat-buoc">*</span>
              </label>
              <Radio.Group
                className="soan-cau-hoi__cdtd"
                buttonStyle="solid"
                value={cdtd}
                onChange={(e) => {
                  setCdtd(e.target.value);
                  boLoiPhanLoai('cdtd');
                  suaRoi();
                }}
              >
                <Radio.Button value={CapDoTuDuy.NhanBiet}>Nhận biết</Radio.Button>
                <Radio.Button value={CapDoTuDuy.ThongHieu}>Thông hiểu</Radio.Button>
                <Radio.Button value={CapDoTuDuy.VanDung}>Vận dụng</Radio.Button>
              </Radio.Group>
              {loiPhanLoai.cdtd && <span className="soan-cau-hoi__loi-ma">{loiPhanLoai.cdtd} — chọn lại</span>}
            </div>
            <div className="soan-cau-hoi__o-form">
              <label className="soan-cau-hoi__nhan">
                Khả năng đảo câu hỏi <span className="bat-buoc">*</span>{' '}
                <Tooltip title="Quy định cách hoán vị áp dụng cho câu này khi sinh mã đề: đảo vị trí lệnh hỏi (câu hỏi con trong câu chùm/Đúng-Sai) và/hoặc đảo đáp án của mỗi lệnh hỏi (câu chùm/Đúng-Sai/trắc nghiệm đơn)">
                  <InfoCircleOutlined className="soan-cau-hoi__icon-i" />
                </Tooltip>
              </label>
              <FormSelect
                luaChon={
                  coBanDoc
                    ? luaChonCheDoDao.filter((l) => !coDaoDapAn(String(l.value)))
                    : luaChonCheDoDao
                }
                status={loiPhanLoai.cheDoDao ? 'error' : undefined}
                value={loiPhanLoai.cheDoDao ? undefined : cheDoDao}
                placeholder="Chọn khả năng đảo"
                onChange={(v) => {
                  setCheDoDao(v as CheDoDaoCauHoi);
                  boLoiPhanLoai('cheDoDao');
                  suaRoi();
                }}
              />
              {loiPhanLoai.cheDoDao && <span className="soan-cau-hoi__loi-ma">{loiPhanLoai.cheDoDao} — chọn lại</span>}
              {coBanDoc && (
                <span className="soan-cau-hoi__nhan-nho">
                  Câu có bản đọc đề bài — không cho phép đảo đáp án
                </span>
              )}
            </div>
            <div className="soan-cau-hoi__o-form">
              <label className="soan-cau-hoi__nhan">Điểm gợi ý</label>
              <InputNumber
                min={0}
                step={0.25}
                style={{ width: '100%' }}
                value={diemGoiY}
                onChange={(v) => {
                  setDiemGoiY(v ?? 0);
                  suaRoi();
                }}
              />
            </div>
            <div className="soan-cau-hoi__o-form">
              <label className="soan-cau-hoi__nhan">
                Kho câu hỏi
              </label>
              <FormSelect
                luaChon={dsKho
                  .filter((k) => !k.monHocId || !monHocId || k.monHocId === monHocId)
                  .map((k) => ({ value: k.id, label: k.ten, moTa: k.moTa }))}
                value={khoId}
                placeholder={monHocId ? 'Chọn kho chứa câu hỏi (không bắt buộc)' : 'Chọn Môn để hiện kho của môn'}
                allowClear
                onChange={(v) => {
                  setKhoId(v);
                  suaRoi();
                }}
              />
            </div>
            {truongMoRong.map((t) => {
              const khoa = t.canMon && !monHocId;
              const lyDo = lyDoChanMoRong(t.khoa);
              return (
                <div key={t.khoa} className="soan-cau-hoi__o-form">
                  <label className="soan-cau-hoi__nhan">
                    {t.nhan} {t.batBuoc && <span className="bat-buoc">*</span>}
                    {t.goiY && (
                      <>
                        {' '}
                        <Tooltip title={t.goiY}>
                          <InfoCircleOutlined className="soan-cau-hoi__icon-i" />
                        </Tooltip>
                      </>
                    )}
                  </label>
                  <FormSelect
                    luaChon={luaChonMoRong[t.khoa] ?? []}
                    value={giaTriMoRong[t.khoa]}
                    disabled={khoa}
                    placeholder={
                      khoa
                        ? 'Chọn Môn trước'
                        : (t.placeholder ?? `Chọn ${t.nhan.toLowerCase()}${t.batBuoc ? '' : ' (không bắt buộc)'}`)
                    }
                    allowClear={!t.batBuoc}
                    onChange={(v) => {
                      setGiaTriMoRong((cu) => ({ ...cu, [t.khoa]: v }));
                      suaRoi();
                    }}
                  />
                  {lyDo.length > 0 && (
                    <span className="soan-cau-hoi__nhan-nho soan-cau-hoi__ly-do-chan">
                      Không chọn được: {lyDo.join('; ')}
                    </span>
                  )}
                  {t.ghiChu?.(giaTriMoRong[t.khoa])}
                </div>
              );
            })}

            {laCauChumHoacTuLuan && (
              <div className="soan-cau-hoi__o-form">
                <label className="soan-cau-hoi__nhan">
                  Kiểu hiển thị khi làm bài{' '}
                  <Tooltip title="Trên màn hình hẹp/di động hệ thống tự chuyển về kiểu Trên – Dưới">
                    <InfoCircleOutlined className="soan-cau-hoi__icon-i" />
                  </Tooltip>
                </label>
                <div className="soan-cau-hoi__kieu-hien-thi">
                  {cacKieu.map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`soan-cau-hoi__the-kieu ${kieuHienThi === k ? 'chon' : ''}`}
                      onClick={() => {
                        setKieuHienThi(k);
                        suaRoi();
                      }}
                    >
                      {veMinhHoa(k)}
                      <span className="soan-cau-hoi__the-kieu-nhan">
                        {nhanKieuHienThi[k]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loaiCau === LoaiCauHoi.CauChum && cauCon.length > 0 && (
              <div className="soan-cau-hoi__o-form">
                <label className="soan-cau-hoi__nhan">
                  Cài đặt câu hỏi con ({cauCon.length}){' '}
                  <Tooltip title="Phân loại riêng của từng câu con — khi thêm câu con mặc định lấy theo câu chính">
                    <InfoCircleOutlined className="soan-cau-hoi__icon-i" />
                  </Tooltip>
                </label>
                <Collapse
                  size="small"
                  className="soan-cau-hoi__cai-dat-cau-con"
                  items={cauCon.map((cc, i) => ({
                    key: cc.id,
                    label: (
                      <span>
                        Câu {i + 1}
                        {(!cc.tieuMucId || !cc.tpnlId || !cc.cdtd) && (
                          <span className="soan-cau-hoi__cai-dat-cau-con-thieu"> · chưa đủ</span>
                        )}
                      </span>
                    ),
                    children: (
                      <>
                        <div className="soan-cau-hoi__o-form">
                          <label className="soan-cau-hoi__nhan">
                            Tiểu mục <span className="bat-buoc">*</span>
                          </label>
                          <TreeSelect
                            style={{ width: '100%' }}
                            showSearch
                            treeDefaultExpandAll
                            treeNodeFilterProp="ten"
                            treeNodeLabelProp="ten"
                            filterTreeNode={(input, node) =>
                              khopTimKiem(input, String((node as { ten?: string }).ten ?? ''))
                            }
                            placeholder={monHocId && khoiId ? 'Chọn tiểu mục' : undefined}
                            disabled={!monHocId || !khoiId}
                            value={cc.tieuMucId}
                            treeData={treeDataChuDe}
                            popupMatchSelectWidth={false}
                            onChange={(v) => {
                              suaCauCon(cc.id, { tieuMucId: v });
                              suaRoi();
                            }}
                          />
                        </div>
                        <div className="soan-cau-hoi__o-form">
                          <label className="soan-cau-hoi__nhan">
                            Thành phần năng lực <span className="bat-buoc">*</span>
                          </label>
                          <FormSelect
                            luaChon={tpnlTheoTieuMuc(cc.tieuMucId)}
                            value={dsTpnl.length ? cc.tpnlId : undefined}
                            placeholder={dsTpnl.length ? 'Chọn thành phần năng lực' : undefined}
                            disabled={!dsTpnl.length}
                            onChange={(v) => {
                              suaCauCon(cc.id, { tpnlId: v as string });
                              suaRoi();
                            }}
                          />
                        </div>
                        <div className="soan-cau-hoi__o-form">
                          <label className="soan-cau-hoi__nhan">
                            Cấp độ tư duy <span className="bat-buoc">*</span>
                          </label>
                          <Radio.Group
                            className="soan-cau-hoi__cdtd"
                            buttonStyle="solid"
                            value={cc.cdtd}
                            onChange={(e) => {
                              suaCauCon(cc.id, { cdtd: e.target.value });
                              suaRoi();
                            }}
                          >
                            <Radio.Button value={CapDoTuDuy.NhanBiet}>Nhận biết</Radio.Button>
                            <Radio.Button value={CapDoTuDuy.ThongHieu}>Thông hiểu</Radio.Button>
                            <Radio.Button value={CapDoTuDuy.VanDung}>Vận dụng</Radio.Button>
                          </Radio.Group>
                        </div>
                      </>
                    ),
                  }))}
                />
              </div>
            )}
          </BoxNoiDung>
        </div>
      </div>

      {/* ============ FOOTER STICKY ============ */}
      <div className="soan-cau-hoi__footer">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(quayLai)}
        >
          Quay lại
        </Button>
        <div className="soan-cau-hoi__footer-phai">
          <Button icon={<SaveOutlined />} loading={dangLuu} onClick={luuNhap}>
            Lưu nháp
          </Button>
          {!cauHinh.anLuuSoanTiep && (
            <Button icon={<SaveOutlined />} loading={dangLuu} onClick={luuVaSoanTiep}>
              Lưu &amp; soạn tiếp
            </Button>
          )}
          <Button
            type="primary"
            icon={coPheDuyet ? <SendOutlined /> : <SaveOutlined />}
            loading={dangLuu}
            onClick={guiDuyet}
          >
            {coPheDuyet ? 'Gửi duyệt' : 'Lưu'}
          </Button>
        </div>
      </div>

      {/* ============ DRAWER XEM TRƯỚC ============ */}
      <Drawer
        title="Xem trước như học sinh"
        open={moXemTruoc}
        size={990}
        onClose={() => setMoXemTruoc(false)}
      >
        <XemTruocCauHoi cauHoi={cauXemTruoc} hienDapAn khoiId={khoiId} />
      </Drawer>

      {/* ============ KHUNG HƯỚNG DẪN LOẠI CÂU (bên phải, cao 100%) ============ */}
      <Drawer
        title={`Hướng dẫn soạn — ${nhanLoaiCau[loaiCau]}`}
        open={moHuongDan}
        size={676}
        footer={<Button onClick={() => setMoHuongDan(false)}>Đóng</Button>}
        onClose={() => setMoHuongDan(false)}
      >
        <p>
          <b>{nhanLoaiCau[loaiCau]}:</b> {moTaLoaiCau[loaiCau]}
        </p>
        <ul>
          <li>Đề bài viết ngắn gọn, một yêu cầu rõ ràng; tránh phủ định kép.</li>
          <li>
            Phương án nhiễu phải hợp lý (sai lầm học sinh thường mắc), cùng độ dài
            và cấu trúc với đáp án đúng.
          </li>
          <li>
            Dùng nút <b>Nhập nhanh</b> khi đã có sẵn danh sách đáp án — mỗi dòng 1
            mục, dòng bắt đầu bằng <code>*</code> là đáp án đúng.
          </li>
          <li>
            Chọn đủ phân loại 5 chiều (Môn · Khối · Tiểu mục · Cấp độ tư duy · Thành phần năng lực) để câu
            hỏi được rút vào đề đúng ma trận.
          </li>
        </ul>
      </Drawer>

      {/* ============ MODAL NHẬP NHANH ============ */}
      <Modal
        title="Nhập nhanh đáp án / lựa chọn"
        open={moNhapNhanh}
        okText="Áp dụng"
        cancelText="Hủy"
        onCancel={() => setMoNhapNhanh(false)}
        onOk={apDungNhapNhanh}
      >
        <p className="soan-cau-hoi__nhap-nhanh-huong-dan">
          <InfoCircleOutlined /> Mỗi dòng = 1 đáp án/lựa chọn. Dòng bắt đầu bằng{' '}
          <code>*</code> được đánh dấu là <b>đáp án đúng</b>. Ghép đôi dùng cú pháp{' '}
          <code>vế trái | vế phải</code>.
        </p>
        <p className="soan-cau-hoi__nhap-nhanh-vi-du">
          Ví dụ (trắc nghiệm): <code>*(x − 2)²</code> · <code>(x + 2)²</code> ·{' '}
          <code>x(x − 4)</code> — mỗi mục 1 dòng.
        </p>
        <Input.TextArea
          rows={10}
          value={vanBanNhapNhanh}
          onChange={(e) => setVanBanNhapNhanh(e.target.value)}
          placeholder={'*(x − 2)²\n(x + 2)²\n(x − 4)²\nx(x − 4)'}
        />
      </Modal>
    </div>
  );
}
