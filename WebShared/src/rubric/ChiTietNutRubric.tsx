/** Khung chi tiết của nút đang chọn trong trình soạn rubric: đáp án mẫu, bước điểm, mức, nhánh mở, nhãn (FR-RB-023, 024) */
import { DeleteOutlined, PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Input, InputNumber, Select, Space, Tooltip, Typography } from 'antd';
import { NoiDungOEditor, OEditor } from '../oeditor';
import type { CayRubric, NutRubric } from './types';
import type { NhanRubricLuaChon } from './nguon';
import { chuThuan, conCua, hienDiem, lapChiMuc, nhanHieuLuc, sangNguyen, taoKhoa, tinhDiemToiDa } from './tinhToan';
import { datNhanhMo, suaNut } from './thaoTac';

export type { NhanRubricLuaChon } from './nguon';

export default function ChiTietNutRubric({
  cay,
  nut,
  nhan,
  buocChoPhep,
  chiDoc,
  onDoi,
}: {
  cay: CayRubric;
  nut: NutRubric;
  nhan: NhanRubricLuaChon;
  buocChoPhep: number[];
  chiDoc?: boolean;
  onDoi: (cay: CayRubric) => void;
}) {
  const cm = lapChiMuc(cay);
  const cha = nut.khoaCha ? cm.theoKhoa.get(nut.khoaCha) : undefined;
  const sua = (td: Partial<NutRubric>) => onDoi(suaNut(cay, nut.khoaNut, td));
  // Nhãn kế thừa (từ cha) để hiện làm gợi ý khi nút chưa ghi đè
  const keThua = cha ? nhanHieuLuc(cm, cha.khoaNut) : {};
  const tenDv = (id?: string) => nhan.donViKienThuc.find((d) => d.id === id)?.ten;
  const tenMd = (id?: string) => nhan.mucDoNhanThuc.find((d) => d.id === id)?.ten;
  const dvHieuLuc = nut.donViKienThucId ?? keThua.donViKienThucId;
  const la = nut.loai === 'tieu-chi' || nut.loai === 'tieu-chi-muc' || nut.loai === 'diem-tru';

  const suaMuc = (i: number, td: Partial<NonNullable<NutRubric['muc']>[number]>) =>
    sua({ muc: (nut.muc ?? []).map((m, j) => (j === i ? { ...m, ...td } : m)) });

  /**
   * Ô nhập nội dung: nhập được công thức toán (nút fx, dán từ Word) và kéo giãn chiều cao ở góc dưới phải.
   * Văn bản thường giữ nguyên là chuỗi thường; có công thức thì lưu HTML (hiển thị qua NoiDungOEditor).
   */
  const oNoiDung = (giaTri: string, doi: (v: string) => void, goiY?: string) =>
    chiDoc ? (
      <div className="trinh-soan-rubric__o-nhap trinh-soan-rubric__o-nhap--chi-doc">
        <NoiDungOEditor html={giaTri || '—'} />
      </div>
    ) : (
      <div className="trinh-soan-rubric__o-nhap">
        <OEditor gon value={giaTri} onChange={doi} placeholder={goiY} />
      </div>
    );

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Mô tả tiêu chí (bắt buộc, tối đa 1.000 ký tự) — bấm fx để chèn công thức, kéo góc dưới phải để mở rộng ô
        </Typography.Text>
        {oNoiDung(nut.moTa, (v) => sua({ moTa: v }), 'Mô tả tiêu chí…')}
        <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-sub)' }}>{chuThuan(nut.moTa).length} / 1000</div>
      </div>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Đáp án mẫu / hướng dẫn chấm (tùy chọn — hiện cho giám khảo khi mở rộng)
        </Typography.Text>
        {oNoiDung(
          nut.dapAnMau ?? '',
          (v) => sua({ dapAnMau: chuThuan(v).trim() || v.includes('<') ? v : undefined }),
          'VD: x/12 − x/15 = 1/2 ⇒ x = 30. Chấp nhận cách diễn đạt tương đương.',
        )}
      </div>

      <div className="trinh-soan-rubric__luoi">
        {(nut.loai === 'tieu-chi' || nut.loai === 'diem-tru') && (
          <>
            <div>
              <label>{nut.loai === 'diem-tru' ? 'Mức trừ tối đa' : 'Điểm tối đa'}</label>
              <InputNumber
                min={0}
                step={nut.buocDiem ?? 0.25}
                disabled={chiDoc}
                style={{ width: '100%' }}
                value={nut.diemToiDa}
                onChange={(v) => sua({ diemToiDa: v ?? 0 })}
              />
            </div>
            <div>
              <label>Bước điểm</label>
              <Select
                disabled={chiDoc}
                style={{ width: '100%' }}
                value={nut.buocDiem ?? 0.25}
                onChange={(v) => sua({ buocDiem: v })}
                options={buocChoPhep.map((b) => ({ value: b, label: hienDiem(b) }))}
              />
            </div>
          </>
        )}
        {nut.loai === 'tieu-chi' && cha?.loai === 'phuong-an' && (
          <div style={{ alignSelf: 'end' }}>
            <Checkbox disabled={chiDoc} checked={!!nut.laNhanhMo} onChange={(e) => onDoi(datNhanhMo(cay, nut.khoaNut, e.target.checked))}>
              Nhánh "Cách khác" (giám khảo bắt buộc ghi chú, bài vào danh sách TTCM xem lại)
            </Checkbox>
          </div>
        )}
        {la && nut.loai !== 'diem-tru' && (
          <>
            <div className="trinh-soan-rubric__o-rong">
              <label>Đơn vị kiến thức</label>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                disabled={chiDoc}
                style={{ width: '100%' }}
                value={nut.donViKienThucId}
                placeholder={keThua.donViKienThucId ? `Kế thừa: ${tenDv(keThua.donViKienThucId) ?? '—'}` : 'Chọn đơn vị kiến thức'}
                onChange={(v) => sua({ donViKienThucId: v, yeuCauCanDatId: undefined })}
                options={nhan.donViKienThuc.map((d) => ({ value: d.id, label: `${d.ten} · ${d.chuDe}` }))}
              />
            </div>
            <div>
              <label>Yêu cầu cần đạt</label>
              <Select
                allowClear
                disabled={chiDoc || !dvHieuLuc}
                style={{ width: '100%' }}
                value={nut.yeuCauCanDatId}
                placeholder={dvHieuLuc ? 'Chọn yêu cầu cần đạt' : 'Chọn đơn vị kiến thức trước'}
                onChange={(v) => sua({ yeuCauCanDatId: v })}
                options={nhan.yeuCauCanDat.filter((y) => y.donViId === dvHieuLuc).map((y) => ({ value: y.id, label: y.ten }))}
              />
            </div>
            <div>
              <label>Mức độ nhận thức</label>
              <Select
                allowClear
                disabled={chiDoc}
                style={{ width: '100%' }}
                value={nut.mucDoNhanThuc}
                placeholder={keThua.mucDoNhanThuc ? `Kế thừa: ${tenMd(keThua.mucDoNhanThuc)}` : 'Chọn mức độ'}
                onChange={(v) => sua({ mucDoNhanThuc: v })}
                options={nhan.mucDoNhanThuc.map((m) => ({ value: m.id, label: m.ten }))}
              />
            </div>
          </>
        )}
        {!la && (
          <>
            <div className="trinh-soan-rubric__o-rong">
              <label>
                Đơn vị kiến thức{' '}
                <Tooltip title="Nhãn mặc định cho các tiêu chí bên trong — tiêu chí con chưa chọn đơn vị kiến thức sẽ kế thừa nhãn này">
                  <QuestionCircleOutlined style={{ color: 'var(--text-sub)', cursor: 'help' }} />
                </Tooltip>
              </label>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                disabled={chiDoc}
                style={{ width: '100%' }}
                value={nut.donViKienThucId}
                placeholder={keThua.donViKienThucId ? `Kế thừa: ${tenDv(keThua.donViKienThucId) ?? '—'}` : 'Chọn đơn vị kiến thức'}
                onChange={(v) => sua({ donViKienThucId: v })}
                options={nhan.donViKienThuc.map((d) => ({ value: d.id, label: `${d.ten} · ${d.chuDe}` }))}
              />
            </div>
            <div>
              <label>Mức độ nhận thức</label>
              <Select
                allowClear
                disabled={chiDoc}
                style={{ width: '100%' }}
                value={nut.mucDoNhanThuc}
                placeholder={keThua.mucDoNhanThuc ? `Kế thừa: ${tenMd(keThua.mucDoNhanThuc)}` : 'Chọn mức độ'}
                onChange={(v) => sua({ mucDoNhanThuc: v })}
                options={nhan.mucDoNhanThuc.map((m) => ({ value: m.id, label: m.ten }))}
              />
            </div>
          </>
        )}
      </div>

      {nut.loai === 'tieu-chi-muc' && (
        <div>
          <Typography.Text strong>Các mức (cần mức 0 điểm; điểm các mức khác nhau; mỗi mức có mô tả)</Typography.Text>
          {(nut.muc ?? []).map((m, i) => (
            <div key={m.khoaMuc} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 96px 32px', gap: 8, marginTop: 6, alignItems: 'start' }}>
              <Input disabled={chiDoc} value={m.nhan} placeholder="Tên mức" onChange={(e) => suaMuc(i, { nhan: e.target.value })} />
              {oNoiDung(m.moTa, (v) => suaMuc(i, { moTa: v }), 'Mô tả mức')}
              <InputNumber disabled={chiDoc} min={0} step={0.25} value={m.diem} onChange={(v) => suaMuc(i, { diem: v ?? 0 })} suffix="đ" />
              <Button
                type="text"
                danger
                disabled={chiDoc || (nut.muc ?? []).length <= 2}
                icon={<DeleteOutlined />}
                aria-label="Xóa mức"
                onClick={() => sua({ muc: (nut.muc ?? []).filter((_, j) => j !== i) })}
              />
            </div>
          ))}
          {!chiDoc && (
            <Button
              style={{ marginTop: 8 }}
              size="small"
              icon={<PlusOutlined />}
              onClick={() => sua({ muc: [...(nut.muc ?? []), { khoaMuc: taoKhoa(), nhan: '', moTa: '', diem: 0 }] })}
            >
              Thêm mức
            </Button>
          )}
        </div>
      )}

      {nut.loai === 'phuong-an' && (
        <Alert
          type="info"
          showIcon
          title="Các nhánh phải có cùng điểm tối đa"
          description={conCua(cm, nut.khoaNut)
            .map((c, i) => `${c.laNhanhMo ? 'Cách khác' : `Cách ${i + 1}`}: ${hienDiem(tinhDiemToiDa(cm, c.khoaNut))}`)
            .join(' · ') || 'Chưa có nhánh — thêm ít nhất 2 nhánh (Nhóm hoặc Tiêu chí).'}
        />
      )}
      {nut.loai === 'nhom' && (
        <Typography.Text type="secondary">
          Điểm tối đa của nhóm tự tính = tổng các tiêu chí con (không tính Điểm trừ):{' '}
          <b>{hienDiem(tinhDiemToiDa(cm, nut.khoaNut))}</b>
          {conCua(cm, nut.khoaNut).some((c) => c.loai === 'diem-tru') &&
            ` · trừ tối đa ${hienDiem(conCua(cm, nut.khoaNut).filter((c) => c.loai === 'diem-tru').reduce((s, c) => s + sangNguyen(c.diemToiDa ?? 0), 0) / 100)}`}
        </Typography.Text>
      )}
    </Space>
  );
}
