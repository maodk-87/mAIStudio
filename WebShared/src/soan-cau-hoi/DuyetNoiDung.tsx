/**
 * MÀN DUYỆT CÂU HỎI DÙNG CHUNG (docs/ui/4 mục 5) — KTĐG / NHCH / DVCC dùng qua wrapper `DuyetNoiDungChuan`.
 * Hàng chờ duyệt + chế độ duyệt nhanh toàn màn (phím tắt A=Duyệt, R=Từ chối, ←/→ chuyển mục, thanh tiến độ).
 * Dữ liệu qua `nguon` (NguonQuanLyCauHoi); câu nhóm Thi (NHCH/DVCC) ẩn nội dung khi `anNoiDungCauThi`.
 * Z4 (30/09/2026): KHÔNG duyệt/từ chối/yêu cầu sửa khi nội dung còn ẩn — tự "Mở xem" trước (NHCH: Passcode phiên xem nhạy cảm,
 * nhập một lần cho cả lượt duyệt nhanh); duyệt nhanh tự mở xem từng câu khi chuyển tới (máy chủ cũng chặn: 401 `CAN_PASSCODE`).
 */
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  MoreOutlined,
  RightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Input,
  Modal,
  Progress,
  Space,
  Tag,
  Tooltip,
} from 'antd';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BangChuan,
  khopTimKiem,
  useXacNhan,
  type BoLocBang,
  type CotBang,
  type LuaChon,
} from '../giao-dien';
import { OEditor } from '../oeditor';
import { TrangThaiNoiDung } from './hang';
import { nhanCdtd, nhanLoaiCau, taoNoiDungCu, tomTatNoiDung } from './nhan';
import type { LichSuThaoTacCau, NguonQuanLyCauHoi } from './nguon';
import type { CauHoiQuanLy } from './types';
import SoSanhPhienBan from './SoSanhPhienBan';
import XemTruocCauHoi from './XemTruocCauHoi';
import TomTatCauHoi from './TomTatCauHoi';
import './duyet-noi-dung.scss';

/** Nhận xét nhập bằng OEditor (có thể chứa công thức — HTML): rỗng khi bóc thẻ không còn chữ */
const nhanXetRong = (s: string) => !s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

export interface DuyetNoiDungProps {
  nguon: NguonQuanLyCauHoi;
  /** Chỉ lấy câu của 1 môn (người duyệt được phân công theo môn — NHCH) */
  monHocId?: string;
  /** Ẩn nội dung câu nhóm Thi trong hàng chờ, "Mở xem" có ghi vết (NHCH/DVCC; KTĐG bảo mật thường — YC-HT-05) */
  anNoiDungCauThi?: boolean;
  /** Cấp đang duyệt (truong/bo/so/phuong/dvcc…) — dùng cho mã bảng/ghi vết */
  capDuyet: string;
  /** Tên hiển thị của cấp duyệt (VD: "Tổ trưởng chuyên môn", "Thẩm định Bộ") */
  tenCapDuyet: string;
  /** Duyệt nhiều vòng (Phản biện 1 → Phản biện 2 → Phê duyệt) */
  coVongNhieuCap?: boolean;
  /** Dòng mô tả nhỏ dưới tiêu đề trong header box hàng chờ */
  moTa?: string;
  /** Không bọc box (khi đặt trong tab của trang cha) */
  khongBox?: boolean;
  /** Nội dung đặt trong box, phía trên hàng lọc (VD Alert quy trình) */
  phanTren?: ReactNode;
}

const tenVong = ['Phản biện 1', 'Phản biện 2', 'Phê duyệt'];
const mauVong = ['blue', 'geekblue', 'purple'];

/** Vòng duyệt: máy chủ trả `vongDuyet`; thiếu (dữ liệu cũ) thì suy từ id để ổn định giữa các lần render */
function vongCua(cau: CauHoiQuanLy): number {
  if (cau.vongDuyet !== undefined) return cau.vongDuyet;
  let tong = 0;
  for (const ch of cau.id) tong += ch.charCodeAt(0);
  return tong % 3;
}

function dinhDangNgay(iso: string): string {
  const [nam, thang, ngay] = iso.split('-');
  return `${ngay}/${thang}/${nam}`;
}

export default function DuyetNoiDung({
  nguon,
  monHocId,
  anNoiDungCauThi,
  capDuyet,
  tenCapDuyet,
  coVongNhieuCap,
  moTa,
  khongBox,
  phanTren,
}: DuyetNoiDungProps) {
  const xacNhan = useXacNhan();
  const { message } = App.useApp();
  const baoLoi = (noiDung: string) => message.error(noiDung);
  const baoThanhCong = (noiDung: string) => message.success(noiDung);
  const baoThongTin = (noiDung: string) => message.info(noiDung);
  // Câu nhóm Thi đã bấm "Mở xem" (đã ghi vết)
  const [daMoXem, setDaMoXem] = useState<Set<string>>(new Set());
  // Câu người dùng đã hủy hộp Passcode ở chế độ duyệt nhanh — không tự hỏi lại (còn nút "Mở xem")
  const [boQuaTuMo, setBoQuaTuMo] = useState<Set<string>>(new Set());

  const [hangCho, setHangCho] = useState<CauHoiQuanLy[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [tenMon, setTenMon] = useState<Map<string, string>>(new Map());
  const [tenKhoi, setTenKhoi] = useState<Map<string, string>>(new Map());

  // Modal từ chối / yêu cầu sửa
  const [cauTuChoi, setCauTuChoi] = useState<CauHoiQuanLy | null>(null);
  const [cauYeuCauSua, setCauYeuCauSua] = useState<CauHoiQuanLy | null>(null);
  const [nhanXetModal, setNhanXetModal] = useState('');

  // Drawer chi tiết
  const [cauChiTiet, setCauChiTiet] = useState<CauHoiQuanLy | null>(null);

  // Chế độ duyệt nhanh
  const [moDuyetNhanh, setMoDuyetNhanh] = useState(false);
  const [chiSo, setChiSo] = useState(0);
  const [tongBanDau, setTongBanDau] = useState(0);
  const [daXuLy, setDaXuLy] = useState(0);
  const [nhanXetNhanh, setNhanXetNhanh] = useState('');

  const taiHangCho = useCallback(() => {
    setDangTai(true);
    // Lỗi tải (VD thiếu quyền duyệt) → dừng vòng chờ, hàng chờ rỗng (thông báo lỗi do tầng API hiển thị)
    nguon
      .layHangChoDuyet(monHocId)
      .then(setHangCho)
      .catch(() => setHangCho([]))
      .finally(() => setDangTai(false));
    // Nguồn cố định theo web; chỉ nạp lại khi đổi môn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monHocId]);

  useEffect(() => {
    taiHangCho();
    nguon.layDanhSachMonHoc().then((ds) => setTenMon(new Map(ds.map((m) => [m.id, m.ten]))));
    nguon.layDanhSachKhoi().then((ds) => setTenKhoi(new Map(ds.map((k) => [k.id, k.ten]))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taiHangCho]);

  /** Câu còn ẩn nội dung (nhóm Thi, chưa mở xem) */
  const dangAn = (c: CauHoiQuanLy) => !!anNoiDungCauThi && !!c.laCauThi && !daMoXem.has(c.id);

  /** Mở xem nội dung câu nhóm Thi (ghi vết) — trả câu đã có nội dung, `null` khi hủy/lỗi */
  const moXem = async (c: CauHoiQuanLy): Promise<CauHoiQuanLy | null> => {
    if (!dangAn(c)) return c;
    let cauDayDu: CauHoiQuanLy | null = c;
    if (nguon.moXemNoiDung) {
      try {
        cauDayDu = await nguon.moXemNoiDung(c.id);
      } catch {
        cauDayDu = null;
      }
      if (!cauDayDu) return null;
      const moi = cauDayDu;
      setHangCho((ds) => ds.map((x) => (x.id === moi.id ? moi : x)));
    } else {
      nguon.ghiVetMoXem?.(c.id);
    }
    setDaMoXem((cu) => new Set(cu).add(c.id));
    baoThongTin('Đã ghi nhận lượt mở xem (audit)');
    return cauDayDu;
  };

  const moChiTiet = async (c: CauHoiQuanLy) => {
    const cau = await moXem(c);
    if (cau) setCauChiTiet(cau);
  };

  /** Câu đã xem được nội dung (mở xem nếu còn ẩn) — `null` khi người dùng hủy: không cho duyệt "mù" */
  const canXemTruoc = async (c: CauHoiQuanLy): Promise<CauHoiQuanLy | null> => {
    if (!dangAn(c)) return c;
    baoThongTin('Mở xem nội dung câu trước khi duyệt / từ chối');
    return moXem(c);
  };

  const duyetCau = async (c: CauHoiQuanLy) => {
    const cau = await canXemTruoc(c);
    if (!cau) return;
    xacNhan({
      tieuDe: 'Duyệt câu hỏi?',
      doiTuong: tomTatNoiDung(cau.noiDung, 60),
      nhanDien: cau.ma,
      anhHuong:
        'Câu hỏi sẽ chuyển sang trạng thái Đã duyệt và có thể được rút vào đề.',
      nhanNutXacNhan: 'Duyệt',
      mucDo: 'xanh',
      onXacNhan: async () => {
        await nguon.duyet(cau.id);
        baoThanhCong(`Đã duyệt câu ${cau.ma}`);
        taiHangCho();
      },
    });
  };

  const guiTuChoi = async () => {
    if (!cauTuChoi) return;
    if (!(await canXemTruoc(cauTuChoi))) return;
    if (nhanXetRong(nhanXetModal)) {
      baoLoi('Vui lòng nhập nhận xét — người soạn cần biết lý do từ chối');
      return;
    }
    await nguon.tuChoi(cauTuChoi.id, nhanXetModal.trim());
    baoThanhCong(`Đã từ chối câu ${cauTuChoi.ma} kèm nhận xét`);
    setCauTuChoi(null);
    setNhanXetModal('');
    taiHangCho();
  };

  const guiYeuCauSua = async () => {
    if (!cauYeuCauSua) return;
    if (!(await canXemTruoc(cauYeuCauSua))) return;
    if (nhanXetRong(nhanXetModal)) {
      baoLoi('Vui lòng nêu rõ nội dung cần chỉnh sửa');
      return;
    }
    await nguon.yeuCauSua(cauYeuCauSua.id, nhanXetModal.trim());
    baoThanhCong(`Đã trả câu ${cauYeuCauSua.ma} về Nháp kèm yêu cầu sửa`);
    setCauYeuCauSua(null);
    setNhanXetModal('');
    taiHangCho();
  };

  const boLoc: BoLocBang<CauHoiQuanLy>[] = useMemo(
    () => [
      {
        key: 'mon',
        nhan: 'Môn',
        luaChon: [...tenMon.entries()].map(([value, label]) => ({ value, label })),
        locItem: (c, v) => c.monHocId === v,
        doRong: 140,
      },
      {
        key: 'khoi',
        nhan: 'Khối',
        luaChon: [...tenKhoi.entries()].map(([value, label]) => ({ value, label })),
        locItem: (c, v) => c.khoiId === v,
        doRong: 120,
      },
      {
        key: 'loaicau',
        nhan: 'Loại câu',
        luaChon: Object.entries(nhanLoaiCau).map(([value, label]) => ({ value, label })),
        locItem: (c, v) => c.loaiCau === v,
        doRong: 150,
      },
      ...(coVongNhieuCap
        ? [
            {
              key: 'vong',
              nhan: 'Vòng',
              luaChon: tenVong.map((t, i) => ({ value: String(i), label: t })) as LuaChon[],
              locItem: (c: CauHoiQuanLy, v: string) => vongCua(c) === Number(v),
              doRong: 130,
            },
          ]
        : []),
    ],
    [tenMon, tenKhoi, coVongNhieuCap],
  );

  const cot: CotBang<CauHoiQuanLy>[] = useMemo(() => {
    const cacCot: CotBang<CauHoiQuanLy>[] = [
      {
        title: 'Nội dung',
        key: 'noiDung',
        fixed: 'left',
        width: 320,
        render: (_, c) => {
          if (dangAn(c)) {
            return (
              <span className="duyet-nd__cau-thi">
                <span className="duyet-nd__cau-thi-an">•••</span>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    void moXem(c);
                  }}
                >
                  Mở xem
                </Button>
              </span>
            );
          }
          return (
            <span className="duyet-nd__tom-tat">
              <TomTatCauHoi html={c.noiDung} />
              {c.phienBan > 1 && (
                <Tooltip title="Câu sửa lại (có phiên bản cũ) — mở Chi tiết để xem so sánh 2 bản">
                  <Tag color="orange" style={{ marginLeft: 6 }}>
                    v{c.phienBan}
                  </Tag>
                </Tooltip>
              )}
            </span>
          );
        },
      },
      {
        title: 'Loại',
        key: 'loaiCau',
        width: 150,
        render: (_, c) => nhanLoaiCau[c.loaiCau],
      },
      {
        title: 'Người gửi',
        key: 'nguoiSoan',
        width: 160,
        render: (_, c) => c.nguoiSoan,
      },
      {
        title: 'Phân loại',
        key: 'phanLoai',
        width: 240,
        render: (_, c) => (
          <Space size={4} wrap>
            <Tag>{tenMon.get(c.monHocId) ?? c.monHocId}</Tag>
            <Tag>{tenKhoi.get(c.khoiId) ?? c.khoiId}</Tag>
            <Tag color="blue">{nhanCdtd[c.cdtd]}</Tag>
          </Space>
        ),
      },
      {
        title: 'Ngày gửi',
        key: 'ngayGui',
        width: 110,
        render: (_, c) => dinhDangNgay(c.ngayTao),
      },
    ];
    if (coVongNhieuCap) {
      cacCot.push({
        title: 'Vòng',
        key: 'vong',
        width: 120,
        render: (_, c) => {
          const v = vongCua(c);
          return <Tag color={mauVong[v]}>{tenVong[v]}</Tag>;
        },
      });
    }
    cacCot.push({
      title: 'Thao tác',
      key: 'thao-tac',
      fixed: 'right',
      width: 230,
      render: (_, c) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Button
            size="small"
            icon={<CheckOutlined />}
            className="duyet-nd__nut-duyet"
            onClick={() => void duyetCau(c)}
          >
            Duyệt
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => {
              setNhanXetModal('');
              setCauTuChoi(c);
            }}
          >
            Từ chối
          </Button>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'chi-tiet', label: 'Chi tiết', icon: <EyeOutlined /> },
                { key: 'yeu-cau-sua', label: 'Yêu cầu sửa', icon: <EditOutlined /> },
              ],
              onClick: ({ key }) => {
                if (key === 'chi-tiet') void moChiTiet(c);
                else {
                  setNhanXetModal('');
                  setCauYeuCauSua(c);
                }
              },
            }}
          >
            <Button size="small" type="text" icon={<MoreOutlined />} aria-label="Thao tác khác" />
          </Dropdown>
        </Space>
      ),
    });
    return cacCot;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daMoXem, anNoiDungCauThi, tenMon, tenKhoi, coVongNhieuCap]);

  // ================= CHẾ ĐỘ DUYỆT NHANH =================
  const cauHienTai = hangCho[chiSo];

  const moCheDoDuyetNhanh = () => {
    if (!hangCho.length) {
      baoThongTin('Hàng chờ trống — không có mục nào cần duyệt');
      return;
    }
    setChiSo(0);
    setTongBanDau(hangCho.length);
    setDaXuLy(0);
    setNhanXetNhanh('');
    setBoQuaTuMo(new Set());
    setMoDuyetNhanh(true);
  };

  // Duyệt nhanh: tự mở xem câu đang hiển thị nếu còn ẩn (NHCH: hộp Passcode chỉ hiện ở câu đầu — token phiên dùng tiếp cho các câu sau)
  const idCauHienTai = cauHienTai?.id;
  const canTuMo = !!cauHienTai && moDuyetNhanh && dangAn(cauHienTai) && !boQuaTuMo.has(cauHienTai.id);
  useEffect(() => {
    if (!canTuMo || !cauHienTai) return;
    const c = cauHienTai;
    void moXem(c).then((kq) => {
      if (!kq) setBoQuaTuMo((cu) => new Set(cu).add(c.id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canTuMo, idCauHienTai]);

  const sauKhiXuLyNhanh = (idVuaXuLy: string) => {
    const conLai = hangCho.filter((c) => c.id !== idVuaXuLy);
    setHangCho(conLai);
    setDaXuLy((d) => d + 1);
    setNhanXetNhanh('');
    if (!conLai.length) {
      setMoDuyetNhanh(false);
      baoThanhCong('Đã xử lý hết hàng chờ duyệt');
    } else if (chiSo >= conLai.length) {
      setChiSo(conLai.length - 1);
    }
  };

  const duyetNhanh = useCallback(async () => {
    const cau = hangCho[chiSo];
    if (!cau) return;
    if (dangAn(cau)) {
      baoThongTin('Nội dung câu đang ẩn — mở xem trước khi duyệt');
      return;
    }
    await nguon.duyet(cau.id);
    baoThanhCong(`Đã duyệt câu ${cau.ma}`);
    sauKhiXuLyNhanh(cau.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hangCho, chiSo, daMoXem]);

  const tuChoiNhanh = useCallback(async () => {
    const cau = hangCho[chiSo];
    if (!cau) return;
    if (dangAn(cau)) {
      baoThongTin('Nội dung câu đang ẩn — mở xem trước khi từ chối');
      return;
    }
    if (nhanXetRong(nhanXetNhanh)) {
      baoLoi('Từ chối bắt buộc nhập nhận xét — gõ vào ô nhận xét bên phải');
      document.querySelector<HTMLElement>('#duyet-nhanh-nhan-xet .ProseMirror')?.focus();
      return;
    }
    await nguon.tuChoi(cau.id, nhanXetNhanh.trim());
    baoThanhCong(`Đã từ chối câu ${cau.ma}`);
    sauKhiXuLyNhanh(cau.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hangCho, chiSo, nhanXetNhanh, daMoXem]);

  useEffect(() => {
    if (!moDuyetNhanh) return;
    const xuLyPhim = (e: KeyboardEvent) => {
      const mucTieu = e.target as HTMLElement;
      const dangGo =
        mucTieu.tagName === 'TEXTAREA' || mucTieu.tagName === 'INPUT' || mucTieu.isContentEditable;
      if (e.key === 'Escape') {
        setMoDuyetNhanh(false);
        return;
      }
      if (dangGo) return;
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        void duyetNhanh();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        void tuChoiNhanh();
      } else if (e.key === 'ArrowRight') {
        setChiSo((i) => Math.min(i + 1, hangCho.length - 1));
        setNhanXetNhanh('');
      } else if (e.key === 'ArrowLeft') {
        setChiSo((i) => Math.max(i - 1, 0));
        setNhanXetNhanh('');
      }
    };
    window.addEventListener('keydown', xuLyPhim);
    return () => window.removeEventListener('keydown', xuLyPhim);
  }, [moDuyetNhanh, duyetNhanh, tuChoiNhanh, hangCho.length]);

  const khoiSoSanh = (cau: CauHoiQuanLy) =>
    cau.phienBan > 1 ? (
      <div className="duyet-nd__so-sanh">
        <div className="duyet-nd__so-sanh-tieu-de">
          So sánh với phiên bản trước (v{cau.phienBan - 1} ↔ v{cau.phienBan})
        </div>
        <SoSanhPhienBan
          tieuDeCu={`Bản cũ (v${cau.phienBan - 1})`}
          tieuDeMoi={`Bản mới (v${cau.phienBan})`}
          noiDungCu={taoNoiDungCu(cau.noiDung)}
          noiDungMoi={cau.noiDung}
        />
      </div>
    ) : null;

  const panelPhanLoai = (cau: CauHoiQuanLy) => (
    <Descriptions
      size="small"
      column={1}
      items={[
        { key: 'ma', label: 'Mã', children: cau.ma },
        { key: 'loai', label: 'Loại câu', children: nhanLoaiCau[cau.loaiCau] },
        { key: 'mon', label: 'Môn', children: tenMon.get(cau.monHocId) ?? cau.monHocId },
        { key: 'khoi', label: 'Khối', children: tenKhoi.get(cau.khoiId) ?? cau.khoiId },
        {
          key: 'chu-de',
          label: 'Chủ đề',
          children: `${cau.tenChuDe} › ${cau.tenTieuMuc}`,
        },
        { key: 'cdtd', label: 'CĐTD', children: nhanCdtd[cau.cdtd] },
        { key: 'diem', label: 'Điểm gợi ý', children: cau.diemGoiY },
        { key: 'nguoi', label: 'Người gửi', children: cau.nguoiSoan },
        ...(coVongNhieuCap
          ? [
              {
                key: 'vong',
                label: 'Vòng duyệt',
                children: (
                  <Tag color={mauVong[vongCua(cau)]}>{tenVong[vongCua(cau)]}</Tag>
                ),
              },
            ]
          : []),
      ]}
    />
  );

  /** Lịch sử thao tác của câu đang duyệt nhanh (nguồn thật nếu web cung cấp; ngược lại chỉ dữ kiện có trên câu) */
  const lichSuDuyet = (cau: CauHoiQuanLy) => <LichSuDuyet key={cau.id} cau={cau} nguon={nguon} />;

  const nutDuyetNhanh = (
    <Button icon={<ThunderboltOutlined />} onClick={moCheDoDuyetNhanh}>
      Chế độ duyệt nhanh
    </Button>
  );

  return (
    <div className="duyet-nd">
      <BangChuan<CauHoiQuanLy>
        maBang={`duyet-nhch-${capDuyet}`}
        khongBox={khongBox}
        tieuDe={`Hàng chờ duyệt câu hỏi — ${tenCapDuyet} (${hangCho.length})`}
        moTa={moTa}
        phanTren={phanTren}
        // Trong tab (không box): nút nằm ở cụm phải dòng lọc, ngay trước nút chọn cột
        nutTrai={khongBox ? nutDuyetNhanh : undefined}
        phanPhaiHeader={khongBox ? undefined : nutDuyetNhanh}
        huongDan={
          <div>
            <p>
              Danh sách các câu hỏi đang chờ {tenCapDuyet} duyệt. Duyệt xong câu
              sẽ rời khỏi hàng chờ; Từ chối bắt buộc kèm nhận xét cho người soạn.
            </p>
            <p>
              Dùng <b>Chế độ duyệt nhanh</b> để duyệt lần lượt toàn màn hình với
              phím tắt: <b>A</b> = Duyệt, <b>R</b> = Từ chối, <b>←/→</b> chuyển mục.
            </p>
          </div>
        }
        cot={cot}
        duLieu={hangCho}
        dangTai={dangTai}
        placeholderTimKiem="Tìm theo nội dung hoặc mã…"
        timKiem={(c, tk) => khopTimKiem(tk, `${tomTatNoiDung(c.noiDung, 500)} ${c.ma}`)}
        boLoc={boLoc}
        onClickHang={(c) => void moChiTiet(c)}
        dongBoUrl
        moTaRong="Hàng chờ trống — không có câu hỏi nào cần duyệt"
      />

      {/* ===== Modal Từ chối (bắt buộc nhận xét) ===== */}
      <Modal
        title="Từ chối câu hỏi"
        open={!!cauTuChoi}
        okText="Từ chối"
        okButtonProps={{ danger: true }}
        cancelText="Hủy"
        onCancel={() => setCauTuChoi(null)}
        onOk={guiTuChoi}
      >
        <p>
          Đang từ chối: <b>{cauTuChoi && <TomTatCauHoi html={cauTuChoi.noiDung} doDai={80} />}</b>{' '}
          ({cauTuChoi?.ma})
        </p>
        <p className="duyet-nd__ghi-chu">
          <InfoCircleOutlined /> Nhận xét là bắt buộc — người soạn sẽ thấy nội dung
          này ở tab "Bị từ chối".
        </p>
        <OEditor
          gon
          keoGian
          minHeight={110}
          value={nhanXetModal}
          onChange={setNhanXetModal}
          placeholder="VD: Phương án nhiễu C và D chưa hợp lý, đề nghị chỉnh lại… (bấm fx để chèn công thức)"
        />
      </Modal>

      {/* ===== Modal Yêu cầu sửa ===== */}
      <Modal
        title="Yêu cầu sửa câu hỏi"
        open={!!cauYeuCauSua}
        okText="Gửi yêu cầu sửa"
        cancelText="Hủy"
        onCancel={() => setCauYeuCauSua(null)}
        onOk={guiYeuCauSua}
      >
        <p>
          Câu hỏi sẽ được trả về trạng thái <b>Nháp</b> để người soạn chỉnh sửa và
          gửi duyệt lại.
        </p>
        <OEditor
          gon
          keoGian
          minHeight={110}
          value={nhanXetModal}
          onChange={setNhanXetModal}
          placeholder="Nêu rõ nội dung cần chỉnh sửa… (bấm fx để chèn công thức)"
        />
      </Modal>

      {/* ===== Drawer chi tiết ===== */}
      <Drawer
        title={`Chi tiết câu hỏi ${cauChiTiet?.ma ?? ''}`}
        open={!!cauChiTiet}
        size={860}
        onClose={() => setCauChiTiet(null)}
        extra={
          cauChiTiet && (
            <Space>
              <Button
                icon={<CheckOutlined />}
                className="duyet-nd__nut-duyet"
                onClick={() => {
                  setCauChiTiet(null);
                  duyetCau(cauChiTiet);
                }}
              >
                Duyệt
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => {
                  setNhanXetModal('');
                  setCauTuChoi(cauChiTiet);
                  setCauChiTiet(null);
                }}
              >
                Từ chối
              </Button>
            </Space>
          )
        }
      >
        {cauChiTiet && (
          <>
            <XemTruocCauHoi cauHoi={cauChiTiet} hienDapAn khoiId={cauChiTiet.khoiId} />
            {khoiSoSanh(cauChiTiet)}
            <div className="duyet-nd__drawer-phan-loai">{panelPhanLoai(cauChiTiet)}</div>
          </>
        )}
      </Drawer>

      {/* ===== CHẾ ĐỘ DUYỆT NHANH (overlay toàn màn) ===== */}
      {moDuyetNhanh && cauHienTai && (
        <div className="duyet-nd__overlay">
          <div className="duyet-nd__overlay-header">
            <span className="duyet-nd__overlay-tieu-de">
              <ThunderboltOutlined /> Duyệt nhanh — {tenCapDuyet}
            </span>
            <span className="duyet-nd__overlay-tien-do">
              <Progress
                percent={Math.round((daXuLy / Math.max(1, tongBanDau)) * 100)}
                showInfo={false}
                style={{ width: 180, margin: 0 }}
              />
              <b>
                {daXuLy}/{tongBanDau}
              </b>{' '}
              đã xử lý · đang xem mục {chiSo + 1}/{hangCho.length}
            </span>
            <span className="duyet-nd__overlay-phim-tat">
              Phím tắt: <Tag>A</Tag>Duyệt · <Tag>R</Tag>Từ chối · <Tag>←</Tag>
              <Tag>→</Tag>Chuyển mục
            </span>
            <Button icon={<CloseOutlined />} onClick={() => setMoDuyetNhanh(false)}>
              Thoát
            </Button>
          </div>
          <div className="duyet-nd__overlay-than">
            <div className="duyet-nd__overlay-trai">
              {dangAn(cauHienTai) ? (
                <Empty
                  image={<EyeOutlined style={{ fontSize: 48 }} />}
                  description={`Nội dung câu ${cauHienTai.ma} đang ẩn — mở xem (có ghi vết) để duyệt`}
                >
                  <Button type="primary" icon={<EyeOutlined />} onClick={() => void moXem(cauHienTai)}>
                    Mở xem
                  </Button>
                </Empty>
              ) : (
                <>
                  <XemTruocCauHoi
                    cauHoi={cauHienTai}
                    hienDapAn
                    anChonTheme
                    khoiId={cauHienTai.khoiId}
                  />
                  {khoiSoSanh(cauHienTai)}
                </>
              )}
            </div>
            <div className="duyet-nd__overlay-phai">
              <h4>Phân loại</h4>
              {panelPhanLoai(cauHienTai)}
              <h4>Lịch sử</h4>
              {lichSuDuyet(cauHienTai)}
              <h4>Nhận xét</h4>
              <div id="duyet-nhanh-nhan-xet">
                <OEditor
                  gon
                  keoGian
                  minHeight={110}
                  value={nhanXetNhanh}
                  onChange={setNhanXetNhanh}
                  placeholder="Bắt buộc khi Từ chối — VD: phương án nhiễu chưa hợp lý…"
                />
              </div>
              <div className="duyet-nd__overlay-nut">
                <Button
                  icon={<CheckOutlined />}
                  className="duyet-nd__nut-duyet"
                  disabled={dangAn(cauHienTai)}
                  onClick={() => void duyetNhanh()}
                >
                  Duyệt (A)
                </Button>
                <Button danger icon={<CloseOutlined />} disabled={dangAn(cauHienTai)} onClick={() => void tuChoiNhanh()}>
                  Từ chối (R)
                </Button>
              </div>
              <div className="duyet-nd__overlay-chuyen">
                <Button
                  icon={<LeftOutlined />}
                  disabled={chiSo === 0}
                  onClick={() => {
                    setChiSo(chiSo - 1);
                    setNhanXetNhanh('');
                  }}
                >
                  Mục trước
                </Button>
                <Button
                  icon={<RightOutlined />}
                  iconPlacement="end"
                  disabled={chiSo >= hangCho.length - 1}
                  onClick={() => {
                    setChiSo(chiSo + 1);
                    setNhanXetNhanh('');
                  }}
                >
                  Mục sau
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {moDuyetNhanh && !cauHienTai && (
        <div className="duyet-nd__overlay">
          <div className="duyet-nd__overlay-than duyet-nd__overlay-than--trong">
            <Empty description="Đã xử lý hết hàng chờ" />
            <Button type="primary" onClick={() => setMoDuyetNhanh(false)}>
              Đóng
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Panel "Lịch sử" khi duyệt nhanh — gọi `nguon.layLichSuThaoTac` (không bịa dữ liệu) */
function LichSuDuyet({ cau, nguon }: { cau: CauHoiQuanLy; nguon: NguonQuanLyCauHoi }) {
  const [ds, setDs] = useState<LichSuThaoTacCau[] | null>(null);
  useEffect(() => {
    if (!nguon.layLichSuThaoTac) return;
    let huy = false;
    nguon
      .layLichSuThaoTac(cau.id)
      .then((kq) => !huy && setDs(kq))
      .catch(() => !huy && setDs([]));
    return () => {
      huy = true;
    };
  }, [cau.id, nguon]);
  if (!nguon.layLichSuThaoTac || !ds?.length)
    return (
      <ul className="duyet-nd__lich-su">
        <li>
          <b>{dinhDangNgay(cau.ngayTao)}</b> — {cau.nguoiSoan} tạo câu hỏi (phiên bản hiện tại v{cau.phienBan})
        </li>
        {cau.nhanXetDuyet && <li>Nhận xét gần nhất: {cau.nhanXetDuyet}</li>}
      </ul>
    );
  return (
    <ul className="duyet-nd__lich-su">
      {ds.map((d, i) => (
        <li key={i}>
          <b>{dinhDangNgay(d.thoiGian.slice(0, 10))}</b> — {d.nguoi} {d.hanhDong.toLowerCase()}
          {d.soPhienBan ? ` (v${d.soPhienBan})` : ''}
          {d.lyDo ? `: ${d.lyDo}` : ''}
        </li>
      ))}
    </ul>
  );
}
