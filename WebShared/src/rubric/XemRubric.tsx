/**
 * Xem rubric chỉ đọc — dạng hướng dẫn chấm: mã, mô tả, đáp án mẫu, các mức, điểm tối đa (nút cha tự tính).
 * Nhánh Phương án thay thế in "Cách 1 / Cách 2"; nhánh mở in "Học sinh làm cách khác đúng vẫn cho điểm tối đa".
 */
import { Tag, Typography } from 'antd';
import type { CayRubric, NutRubric } from './types';
import { conCua, hienDiem, lapChiMuc, tinhDiemToiDa } from './tinhToan';
import NoiDungRubric from './NoiDungRubric';
import './rubric.scss';

export default function XemRubric({ cay, diemMucTieu, thuGon = false }: { cay: CayRubric; diemMucTieu: number; thuGon?: boolean }) {
  const cm = lapChiMuc(cay);
  const tong = tinhDiemToiDa(cm);

  const dong = (n: NutRubric, cap: number, nhanh?: number): React.ReactNode[] => {
    const la = n.loai === 'tieu-chi' || n.loai === 'tieu-chi-muc' || n.loai === 'diem-tru';
    const diem =
      n.loai === 'diem-tru' ? (
        <Typography.Text type="danger">−{hienDiem(n.diemToiDa)}</Typography.Text>
      ) : la ? (
        hienDiem(tinhDiemToiDa(cm, n.khoaNut))
      ) : (
        <b>{hienDiem(tinhDiemToiDa(cm, n.khoaNut))}</b>
      );
    const ds: React.ReactNode[] = [
      <div key={n.khoaNut} className="xem-rubric__dong" style={{ paddingLeft: cap * 18 }}>
        <div>
          <span className="xem-rubric__ma">{n.maHienThi}</span>
          {nhanh != null && <Tag color="magenta">Cách {nhanh}</Tag>}
          {n.laNhanhMo ? <i>Học sinh làm cách khác đúng vẫn cho điểm tối đa</i> : la || !n.khoaCha ? <NoiDungRubric html={n.moTa} /> : <b><NoiDungRubric html={n.moTa} /></b>}
          {n.loai === 'diem-tru' && <Tag color="red" style={{ marginLeft: 6 }}>Điểm trừ</Tag>}
          {!thuGon && n.dapAnMau && <div className="xem-rubric__dap-an"><NoiDungRubric html={n.dapAnMau} khoi /></div>}
          {n.loai === 'tieu-chi-muc' && (
            <ul className="xem-rubric__muc">
              {(n.muc ?? []).map((m) => (
                <li key={m.khoaMuc}>
                  <b>{m.nhan} ({hienDiem(m.diem)}đ)</b>
                  {!thuGon && m.moTa ? <>: <NoiDungRubric html={m.moTa} /></> : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="xem-rubric__diem">{diem}</div>
      </div>,
    ];
    conCua(cm, n.khoaNut).forEach((c, i) => ds.push(...dong(c, cap + 1, n.loai === 'phuong-an' ? i + 1 : undefined)));
    return ds;
  };

  if (!cm.goc) return <Typography.Text type="secondary">Chưa có rubric.</Typography.Text>;
  return (
    <div className="xem-rubric">
      {dong(cm.goc, 0)}
      {tong !== diemMucTieu && (
        <Typography.Text type="danger">
          Tổng rubric {hienDiem(tong)} khác điểm câu {hienDiem(diemMucTieu)}
        </Typography.Text>
      )}
    </div>
  );
}
