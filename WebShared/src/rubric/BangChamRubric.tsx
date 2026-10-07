/**
 * Bảng chấm theo rubric (vùng phải của màn chấm, FR-RB-041 … 045): rubric trải phẳng theo thứ tự hiển thị,
 * mỗi lá một ô; nhóm có tổng tạm tức thời; Phương án thay thế chọn nhánh (Alt+1, Alt+2…);
 * Tiêu chí theo mức chọn bằng thẻ hoặc phím 1–9 (0 = mức 0 điểm); ô chưa chấm tô nổi; Enter/Tab sang ô kế tiếp.
 * Dùng chung: màn chấm, xem trước khi soạn ("như giám khảo"), chấm kiểm tra xác suất, phúc khảo.
 */
import { Alert, Button, Input, Segmented, Space, Tag, Tooltip, Typography } from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { CayRubric, DuLieuChamRubric, NutRubric } from './types';
import { useXacNhan } from './useXacNhan';
import {
  BUOC_MAC_DINH,
  chuThuan,
  conCua,
  docSo,
  duyetCay,
  hienDiem,
  kiemTraGiaTriLa,
  laHieuLuc,
  laNutLa,
  lapChiMuc,
  sangNguyen,
  tinhDiem,
  tinhDiemToiDa,
  tuNguyen,
} from './tinhToan';
import NoiDungRubric from './NoiDungRubric';
import './rubric.scss';

export interface GhiLaRubric {
  khoaNut: string;
  giaTri?: number | null;
  khoaMuc?: string;
  ghiChu?: string;
}

export interface BangChamRubricProps {
  cay: CayRubric;
  duLieu: DuLieuChamRubric;
  onGhi: (thayDoi: GhiLaRubric[]) => void | Promise<unknown>;
  onChonNhanh: (khoaPhuongAn: string, khoaNhanh: string) => void | Promise<unknown>;
  chiDoc?: boolean;
  /** Lá phải nhập lại sau điều chỉnh rubric — tô đỏ */
  laPhaiNhapLai?: string[];
  /** Mặc định mở đáp án mẫu */
  hienDapAn?: boolean;
  /** Enter/Tab ở ô cuối */
  onHetO?: () => void;
}

export interface BangChamRubricRef {
  /** Focus ô đầu tiên còn trống (hoặc ô đầu) */
  focusODau: () => void;
  /** Alt+số: chọn nhánh thứ `so` của Phương án chưa chọn đầu tiên (hoặc Phương án chứa ô đang nhập) */
  chonNhanhTheoSo: (so: number) => void;
}

const giaTriHopLe = (n: NutRubric) => {
  const max = sangNguyen(n.diemToiDa ?? 0);
  const buoc = sangNguyen(n.buocDiem ?? BUOC_MAC_DINH) || 25;
  const ds: number[] = [];
  for (let v = 0; v <= max; v += buoc) ds.push(tuNguyen(v));
  return ds;
};

const BangChamRubric = forwardRef<BangChamRubricRef, BangChamRubricProps>(function BangChamRubric(
  { cay, duLieu, onGhi, onChonNhanh, chiDoc, laPhaiNhapLai = [], hienDapAn = false, onHetO },
  ref,
) {
  const xacNhan = useXacNhan();
  const cm = useMemo(() => lapChiMuc(cay), [cay]);
  const [nhap, setNhap] = useState<Record<string, string>>({});
  const [loiO, setLoiO] = useState<Record<string, string>>({});
  const [moDapAn, setMoDapAn] = useState<Record<string, boolean>>({});
  const [moGhiChu, setMoGhiChu] = useState<Record<string, boolean>>({});
  const [dangO, setDangO] = useState<string>();
  const oRef = useRef<Record<string, HTMLElement | null>>({});

  const hieuLuc = useMemo(() => laHieuLuc(cm, duLieu), [cm, duLieu]);
  const thuTuO = hieuLuc.map((n) => n.khoaNut);

  // Đồng bộ nội dung ô từ dữ liệu (trừ ô đang gõ)
  useEffect(() => {
    setNhap((cu) => {
      const moi: Record<string, string> = {};
      hieuLuc.forEach((n) => {
        const v = duLieu.giaTri[n.khoaNut]?.giaTri;
        moi[n.khoaNut] = n.khoaNut === dangO && cu[n.khoaNut] !== undefined ? cu[n.khoaNut] : v == null ? '' : hienDiem(v);
      });
      return moi;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duLieu, hieuLuc]);

  const focusO = (khoa?: string) => {
    if (!khoa) return;
    const el = oRef.current[khoa];
    el?.focus();
    if (el instanceof HTMLInputElement) el.select();
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const sangOKeTiep = (khoa: string, lui = false) => {
    const i = thuTuO.indexOf(khoa);
    const k = thuTuO[i + (lui ? -1 : 1)];
    if (k) focusO(k);
    else if (!lui) onHetO?.();
  };

  const phuongAnCuaO = (khoa?: string) => {
    let n = khoa ? cm.theoKhoa.get(khoa) : undefined;
    while (n) {
      if (n.loai === 'phuong-an') return n;
      n = n.khoaCha ? cm.theoKhoa.get(n.khoaCha) : undefined;
    }
    return undefined;
  };

  const chonNhanh = (pa: NutRubric, khoaNhanh: string) => {
    const cu = duLieu.nhanhChon[pa.khoaNut];
    if (cu === khoaNhanh) return;
    const coGiaTri = cu && duyetCay(cm, cu).some((n) => laNutLa(n) && n.loai !== 'diem-tru' && duLieu.giaTri[n.khoaNut]?.giaTri != null);
    if (!coGiaTri) {
      onChonNhanh(pa.khoaNut, khoaNhanh);
      return;
    }
    xacNhan({
      tieuDe: 'Đổi cách chấm?',
      doiTuong: chuThuan(pa.moTa),
      anhHuong: 'Điểm đã nhập ở các tiêu chí của nhánh cũ sẽ bị xóa (có ghi nhật ký).',
      nhanNutXacNhan: 'Đổi nhánh',
      mucDo: 'cam',
      onXacNhan: () => void onChonNhanh(pa.khoaNut, khoaNhanh),
    });
  };

  useImperativeHandle(ref, () => ({
    focusODau: () => focusO(thuTuO.find((k) => cm.theoKhoa.get(k)?.loai !== 'diem-tru' && duLieu.giaTri[k]?.giaTri == null) ?? thuTuO[0]),
    chonNhanhTheoSo: (so: number) => {
      const pa =
        phuongAnCuaO(dangO) ??
        [...cm.theoKhoa.values()].find((n) => n.loai === 'phuong-an' && !duLieu.nhanhChon[n.khoaNut] && laPhanHieuLuc(n));
      const nhanh = pa && conCua(cm, pa.khoaNut)[so - 1];
      if (pa && nhanh) chonNhanh(pa, nhanh.khoaNut);
    },
  }));

  /** Nút có nằm trong phần cây đang hiệu lực (tổ tiên Phương án đã chọn đúng nhánh) */
  function laPhanHieuLuc(n: NutRubric): boolean {
    let con = n;
    let cha = n.khoaCha ? cm.theoKhoa.get(n.khoaCha) : undefined;
    while (cha) {
      if (cha.loai === 'phuong-an' && duLieu.nhanhChon[cha.khoaNut] !== con.khoaNut) return false;
      con = cha;
      cha = cha.khoaCha ? cm.theoKhoa.get(cha.khoaCha) : undefined;
    }
    return true;
  }

  const ghiSo = async (n: NutRubric) => {
    const chuoi = nhap[n.khoaNut] ?? '';
    const v = n.loai === 'diem-tru' && !chuoi.trim() ? 0 : docSo(chuoi);
    if (Number.isNaN(v)) return setLoiO((l) => ({ ...l, [n.khoaNut]: 'Không phải số' }));
    const ma = kiemTraGiaTriLa(n, v);
    if (ma)
      return setLoiO((l) => ({
        ...l,
        [n.khoaNut]: ma === 'SCORE_OFF_STEP' ? `Bước ${hienDiem(n.buocDiem ?? BUOC_MAC_DINH)}` : `0 – ${hienDiem(n.diemToiDa)}`,
      }));
    setLoiO((l) => ({ ...l, [n.khoaNut]: '' }));
    if ((duLieu.giaTri[n.khoaNut]?.giaTri ?? null) !== v) await onGhi([{ khoaNut: n.khoaNut, giaTri: v }]);
    return true;
  };

  const phimO = async (e: KeyboardEvent<HTMLElement>, n: NutRubric) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (n.loai !== 'tieu-chi-muc' && (await ghiSo(n)) !== true) return;
      sangOKeTiep(n.khoaNut);
    } else if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (n.loai !== 'tieu-chi-muc' && (await ghiSo(n)) !== true) return;
      sangOKeTiep(n.khoaNut, e.shiftKey);
    } else if (n.loai === 'tieu-chi-muc' && /^[0-9]$/.test(e.key) && !e.ctrlKey && !e.altKey && !chiDoc) {
      e.preventDefault();
      const muc = n.muc ?? [];
      const m = e.key === '0' ? muc.find((x) => sangNguyen(x.diem) === 0) : muc[Number(e.key) - 1];
      if (m) {
        await onGhi([{ khoaNut: n.khoaNut, khoaMuc: m.khoaMuc }]);
        sangOKeTiep(n.khoaNut);
      }
    }
  };

  const oLa = (n: NutRubric) => {
    const v = duLieu.giaTri[n.khoaNut];
    const trong = n.loai !== 'diem-tru' && v?.giaTri == null;
    const nhapLai = laPhaiNhapLai.includes(n.khoaNut);
    const canGhiChu = !!n.laNhanhMo;
    const dapAn = n.dapAnMau && (moDapAn[n.khoaNut] ?? hienDapAn);
    const giaTriNhanh = n.loai === 'tieu-chi' ? giaTriHopLe(n) : n.loai === 'diem-tru' ? giaTriHopLe(n) : [];
    return (
      <div
        key={n.khoaNut}
        className={`bang-cham-rubric__la ${dangO === n.khoaNut ? 'dang-nhap' : nhapLai ? 'nhap-lai' : trong ? 'trong' : ''}`}
      >
        <div>
          <div className="bang-cham-rubric__mo-ta">
            <span className="bang-cham-rubric__ma">{n.maHienThi}</span>
            {n.laNhanhMo ? <b>Cách khác (học sinh làm đúng theo cách rubric không lường trước)</b> : <NoiDungRubric html={n.moTa} />}
            {n.loai === 'diem-tru' && <Tag color="red" style={{ marginLeft: 6 }}>Điểm trừ</Tag>}
            {nhapLai && <Tag color="error" style={{ marginLeft: 6 }}>Rubric đã đổi — chấm lại</Tag>}
            {n.dapAnMau && (
              <Button type="link" size="small" tabIndex={-1} onClick={() => setMoDapAn((x) => ({ ...x, [n.khoaNut]: !dapAn }))}>
                {dapAn ? 'Ẩn đáp án' : 'Đáp án mẫu'}
              </Button>
            )}
            {!chiDoc && !canGhiChu && !v?.ghiChu && !moGhiChu[n.khoaNut] && (
              <Button type="link" size="small" tabIndex={-1} onClick={() => setMoGhiChu((x) => ({ ...x, [n.khoaNut]: true }))}>
                + Ghi chú
              </Button>
            )}
          </div>
          {dapAn && <div className="bang-cham-rubric__dap-an"><NoiDungRubric html={n.dapAnMau} khoi /></div>}
        </div>

        {n.loai !== 'tieu-chi-muc' ? (
          <div className="bang-cham-rubric__nhap">
            {/* Nút điểm nhanh cùng dòng với ô nhập (ít giá trị) — giữ mỗi tiêu chí gọn một dòng */}
            {giaTriNhanh.length > 1 && giaTriNhanh.length <= 5 && !chiDoc && (
              <Space size={4} className="bang-cham-rubric__nhanh-diem">
                {giaTriNhanh.map((g) => (
                  <Button
                    key={g}
                    size="small"
                    type={v?.giaTri != null && sangNguyen(v.giaTri) === sangNguyen(g) ? 'primary' : 'default'}
                    tabIndex={-1}
                    onClick={async () => {
                      setNhap((x) => ({ ...x, [n.khoaNut]: hienDiem(g) }));
                      await onGhi([{ khoaNut: n.khoaNut, giaTri: g }]);
                    }}
                  >
                    {n.loai === 'diem-tru' && g ? '−' : ''}
                    {hienDiem(g)}
                  </Button>
                ))}
              </Space>
            )}
            {n.loai === 'diem-tru' && <b style={{ color: '#cf1322', fontSize: 18 }}>−</b>}
            <Input
              ref={(el) => {
                oRef.current[n.khoaNut] = el?.input ?? null;
              }}
              className="o-diem"
              value={nhap[n.khoaNut] ?? ''}
              placeholder={n.loai === 'diem-tru' ? '0' : '—'}
              disabled={chiDoc}
              status={loiO[n.khoaNut] ? 'error' : undefined}
              inputMode="decimal"
              aria-label={`Điểm ${n.maHienThi}`}
              onFocus={(e) => {
                setDangO(n.khoaNut);
                e.target.select();
              }}
              onBlur={() => {
                setDangO(undefined);
                void ghiSo(n);
              }}
              onChange={(e) => setNhap((x) => ({ ...x, [n.khoaNut]: e.target.value }))}
              onKeyDown={(e) => void phimO(e, n)}
            />
            <span className="toi-da">/ {hienDiem(n.diemToiDa)}</span>
          </div>
        ) : (
          <div className="bang-cham-rubric__nhap">
            <b style={{ fontSize: 18 }}>{v?.giaTri == null ? '—' : hienDiem(v.giaTri)}</b>
            <span className="toi-da">/ {hienDiem(tinhDiemToiDa(cm, n.khoaNut))}</span>
          </div>
        )}

        {loiO[n.khoaNut] && (
          <Typography.Text type="danger" style={{ gridColumn: '1 / -1', fontSize: 13 }}>
            Điểm không hợp lệ ({loiO[n.khoaNut]})
          </Typography.Text>
        )}

        {n.loai === 'tieu-chi-muc' && (
          <div
            className="bang-cham-rubric__muc"
            tabIndex={chiDoc ? -1 : 0}
            ref={(el) => {
              oRef.current[n.khoaNut] = el;
            }}
            onFocus={() => setDangO(n.khoaNut)}
            onBlur={() => setDangO(undefined)}
            onKeyDown={(e) => void phimO(e, n)}
            aria-label={`Chọn mức ${n.maHienThi}`}
          >
            {(n.muc ?? []).map((m, i) => (
              <div
                key={m.khoaMuc}
                className={`bang-cham-rubric__the-muc ${v?.khoaMuc === m.khoaMuc ? 'chon' : ''}`}
                onClick={() => !chiDoc && void onGhi([{ khoaNut: n.khoaNut, khoaMuc: m.khoaMuc }])}
              >
                <div className="tieu-de">
                  <span>
                    <kbd>{sangNguyen(m.diem) === 0 ? '0' : i + 1}</kbd>
                    {m.nhan}
                  </span>
                  <span>{hienDiem(m.diem)}đ</span>
                </div>
                {m.moTa && <div className="mo-ta"><NoiDungRubric html={m.moTa} /></div>}
              </div>
            ))}
          </div>
        )}

        {(moGhiChu[n.khoaNut] || v?.ghiChu || canGhiChu) && (
          <div className="bang-cham-rubric__ghi-chu">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 4 }}
              placeholder={canGhiChu ? 'Bắt buộc: mô tả cách làm của học sinh (bài sẽ vào danh sách TTCM xem lại)' : 'Ghi chú cho tiêu chí này'}
              status={canGhiChu && v?.giaTri != null && !v?.ghiChu?.trim() ? 'error' : undefined}
              disabled={chiDoc}
              defaultValue={v?.ghiChu}
              onBlur={(e) => e.target.value !== (v?.ghiChu ?? '') && void onGhi([{ khoaNut: n.khoaNut, ghiChu: e.target.value }])}
            />
          </div>
        )}
      </div>
    );
  };

  const khoiNhom = (n: NutRubric, laGoc: boolean): React.ReactNode[] => {
    const ds: React.ReactNode[] = [];
    if (!laGoc) {
      const dat = tinhDiem(cm, duLieu, n.khoaNut);
      ds.push(
        <div key={`h-${n.khoaNut}`} className="bang-cham-rubric__nhom">
          <span>
            <span className="bang-cham-rubric__ma">{n.maHienThi}</span>
            <NoiDungRubric html={n.moTa} />
          </span>
          <span className="bang-cham-rubric__nhom-diem">
            {hienDiem(dat)} / {hienDiem(tinhDiemToiDa(cm, n.khoaNut))}
          </span>
        </div>,
      );
    }
    conCua(cm, n.khoaNut).forEach((c) => ds.push(...ve(c)));
    return ds;
  };

  function ve(n: NutRubric): React.ReactNode[] {
    if (laNutLa(n)) return [oLa(n)];
    if (n.loai === 'phuong-an') {
      const nhanh = conCua(cm, n.khoaNut);
      const chon = duLieu.nhanhChon[n.khoaNut];
      const b = chon ? cm.theoKhoa.get(chon) : undefined;
      return [
        <div key={`pa-${n.khoaNut}`} className="bang-cham-rubric__phuong-an">
          <Space orientation="vertical" size={6} style={{ width: '100%' }}>
            <span>
              <span className="bang-cham-rubric__ma">{n.maHienThi}</span>
              <b><NoiDungRubric html={n.moTa} /></b> — học sinh làm theo cách nào?
            </span>
            <Segmented
              block
              disabled={chiDoc}
              value={chon}
              onChange={(k) => chonNhanh(n, k as string)}
              options={nhanh.map((c, i) => ({
                value: c.khoaNut,
                label: (
                  <Tooltip title={`Alt+${i + 1}`}>
                    <span>{c.laNhanhMo ? 'Cách khác' : `Cách ${i + 1}`}</span>
                  </Tooltip>
                ),
              }))}
            />
            {!chon && <Alert type="warning" showIcon title="Chọn cách làm của học sinh để hiện các tiêu chí tương ứng." />}
          </Space>
        </div>,
        ...(b ? (laNutLa(b) ? [oLa(b)] : khoiNhom(b, false)) : []),
      ];
    }
    return khoiNhom(n, !n.khoaCha);
  }

  return <div className="bang-cham-rubric">{cm.goc ? ve(cm.goc) : null}</div>;
});

export default BangChamRubric;
