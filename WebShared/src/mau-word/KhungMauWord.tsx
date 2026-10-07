/**
 * KHUNG TỆP WORD MẪU của mẫu đề (cột phải màn Tạo/Sửa mẫu đề — docs/ui/2 mục 5a):
 * chọn tệp .docx/.dotx → xem ngay bên dưới (trình xem tài liệu dùng chung) + kiểm tra trường trộn có trong tệp;
 * mẫu gợi ý của hệ thống; hướng dẫn soạn + bảng trường trộn (sao chép 1 chạm); nút Giả lập xuất Word/PDF.
 * Không tự lưu tệp — nơi dùng nhận tệp qua `onDoiTep` và gắn vào mẫu khi lưu.
 */
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExperimentOutlined,
  FileWordOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Collapse, ConfigProvider, Empty, Space, Table, Tag, Tooltip, Typography, Upload } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { TrinhXemTaiLieu } from '../trinh-xem-tai-lieu';
import { taiTep } from '../xuat-tep/coBan';
import type { CauHinhGiaLap } from './giaLap';
import { TEN_TEP_MAU_GOI_Y, taoMauWordGoiY } from './mauGoiY';
import ModalGiaLapXuat from './ModalGiaLapXuat';
import { phanTichMauWord, type KetQuaPhanTichMau } from './tronMauWord';
import { DANH_MUC_TRUONG_TRON, MA_TRUONG_BAT_BUOC, NHAN_KIEU_TRUONG, cuPhapTruong, type TruongTron } from './truongTron';
import './mau-word.scss';

export interface KhungMauWordProps {
  /** Tên tệp đang gắn với mẫu (có thể chỉ có tên — mẫu cũ chưa tải được nội dung) */
  tenTep?: string;
  /** Nội dung tệp đã chọn trong phiên */
  tep: Blob | null;
  /** Chọn tệp mới (File) hoặc gỡ tệp (null) */
  onDoiTep: (tep: File | null) => void;
  /** Kết quả kiểm tra trường trộn của tệp đang chọn (null khi chưa có tệp) — để nơi dùng chặn lưu khi thiếu trường bắt buộc */
  onPhanTich?: (kq: KetQuaPhanTichMau | null) => void;
  /** Cấu hình mẫu đề đang khai báo — sinh đề giả lập */
  cauHinhGiaLap: CauHinhGiaLap;
  chiXem?: boolean;
  gioiHanMb?: number;
  /** Nhãn đối tượng: "mẫu đề kiểm tra" / "mẫu đề thi" */
  tenDoiTuong?: string;
  chieuCaoKhungXem?: number;
}

const kichThuoc = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export default function KhungMauWord({
  tenTep,
  tep,
  onDoiTep,
  onPhanTich,
  cauHinhGiaLap,
  chiXem,
  gioiHanMb = 10,
  tenDoiTuong = 'mẫu đề',
  chieuCaoKhungXem = 560,
}: KhungMauWordProps) {
  const [phanTich, setPhanTich] = useState<KetQuaPhanTichMau | null>(null);
  const [loiChon, setLoiChon] = useState<string | null>(null);
  const [moGiaLap, setMoGiaLap] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!tep) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(tep);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [tep]);

  useEffect(() => {
    let daHuy = false;
    if (!tep) {
      setPhanTich(null);
      onPhanTich?.(null);
      return;
    }
    phanTichMauWord(tep)
      .then((kq) => {
        if (daHuy) return;
        setPhanTich(kq);
        onPhanTich?.(kq);
      })
      .catch(() => {
        if (daHuy) return;
        setPhanTich(null);
        onPhanTich?.(null);
        setLoiChon('Không đọc được tệp Word — tệp hỏng hoặc không phải định dạng .docx/.dotx.');
      });
    return () => {
      daHuy = true;
    };
    // onPhanTich là callback của nơi dùng — chỉ phân tích lại khi đổi tệp
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tep]);

  // Trình xem nhận tên .docx (bản .dotx cùng cấu trúc)
  const nguonXem = useMemo(
    () => (url ? { src: url, ten: (tenTep || 'mau-word.docx').replace(/\.dotx$/i, '.docx') } : null),
    [url, tenTep],
  );

  const chonTep = (f: File) => {
    setLoiChon(null);
    if (!/\.(docx|dotx)$/i.test(f.name)) setLoiChon('Chỉ nhận tệp Word .docx / .dotx (không nhận .doc cũ, .docm có macro).');
    else if (f.size > gioiHanMb * 1024 * 1024) setLoiChon(`Tệp Word mẫu tối đa ${gioiHanMb} MB.`);
    else onDoiTep(f);
    return false;
  };

  const dungMauGoiY = async () => {
    const b = await taoMauWordGoiY();
    onDoiTep(new File([b], TEN_TEP_MAU_GOI_Y, { type: b.type }));
  };

  const thieuBatBuoc = phanTich ? MA_TRUONG_BAT_BUOC.filter((m) => !phanTich.truongCo.includes(m)) : [];
  const soTruongHopLe = phanTich ? phanTich.truongCo.filter((m) => !phanTich.truongLa.includes(m)).length : 0;

  return (
    // Form cha có thể đang "disabled" (chế độ chỉ xem) — xem tệp, bảng trường và giả lập vẫn dùng được; nút sửa ẩn theo `chiXem`
    <ConfigProvider componentDisabled={false}>
      <div className="khung-mau-word">
        <div className="khung-mau-word__thanh">
          <div className="khung-mau-word__ten">
            <FileWordOutlined className="khung-mau-word__bt" />
            <div>
              <div className="khung-mau-word__ten-tep">{tenTep || 'Chưa có tệp Word mẫu'}</div>
              <div className="khung-mau-word__phu">
                {tep ? `${kichThuoc(tep.size)} · ` : ''}.docx / .dotx ≤ {gioiHanMb} MB — chữ {'{{MA_TRUONG}}'} trong tệp được thay bằng dữ liệu đề khi xuất
              </div>
            </div>
          </div>
          <Space wrap size={8}>
            {!chiXem && (
              <Upload accept=".docx,.dotx" showUploadList={false} beforeUpload={chonTep}>
                <Button icon={<UploadOutlined />}>{tep || tenTep ? 'Đổi tệp' : 'Chọn tệp Word'}</Button>
              </Upload>
            )}
            {!chiXem && (
              <Tooltip title="Dùng bố cục đề chuẩn có sẵn các trường trộn — có thể tải về chỉnh trong Word rồi tải lên lại">
                <Button onClick={() => void dungMauGoiY()}>Dùng mẫu gợi ý</Button>
              </Tooltip>
            )}
            {tep && (
              <Tooltip title="Tải tệp đang dùng về máy để chỉnh trong Word">
                <Button icon={<DownloadOutlined />} aria-label="Tải tệp về" onClick={() => taiTep(tep, tenTep || 'mau-word.docx')} />
              </Tooltip>
            )}
            {!chiXem && (tep || tenTep) && (
              <Tooltip title="Gỡ tệp Word mẫu — khi xuất đề dùng bố cục chuẩn của hệ thống">
                <Button danger icon={<DeleteOutlined />} aria-label="Gỡ tệp" onClick={() => onDoiTep(null)} />
              </Tooltip>
            )}
            <Button type="primary" ghost icon={<ExperimentOutlined />} onClick={() => setMoGiaLap(true)}>
              Giả lập xuất Word/PDF
            </Button>
          </Space>
        </div>

        {loiChon && <Alert type="error" showIcon closable onClose={() => setLoiChon(null)} title={loiChon} className="khung-mau-word__canh-bao" />}
        {phanTich && (
          <div className="khung-mau-word__kiem-tra">
            {thieuBatBuoc.length > 0 && (
              <Alert
                type="error"
                showIcon
                title={`Tệp chưa có trường ${thieuBatBuoc.map((m) => `{{${m}}}`).join(', ')} — đề xuất ra sẽ không có câu hỏi. Gõ trường này thành một đoạn riêng tại vị trí nội dung đề.`}
              />
            )}
            {phanTich.truongLa.length > 0 && (
              <Alert
                type="warning"
                showIcon
                title={`Trường không có trong danh mục (gõ sai?): ${phanTich.truongLa.map((m) => `{{${m}}}`).join(', ')} — khi xuất sẽ giữ nguyên chữ.`}
              />
            )}
            {phanTich.khoiSaiViTri.length > 0 && (
              <Alert
                type="warning"
                showIcon
                title={`Trường khối phải đứng riêng một đoạn trong thân tài liệu (không lẫn chữ khác, không đặt ở đầu/chân trang): ${phanTich.khoiSaiViTri.map((m) => `{{${m}}}`).join(', ')}`}
              />
            )}
            {phanTich.vungLoi.length > 0 && <Alert type="warning" showIcon title={`Vùng điều kiện chưa đúng: ${phanTich.vungLoi.join('; ')}`} />}
            {thieuBatBuoc.length === 0 && (
              <div className="khung-mau-word__tom-tat">
                <CheckCircleOutlined className="khung-mau-word__ok" /> Tệp dùng {soTruongHopLe} trường:{' '}
                {phanTich.truongCo
                  .filter((m) => !phanTich.truongLa.includes(m))
                  .map((m) => (
                    <Tag key={m} color="blue" variant="outlined">
                      {m}
                    </Tag>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="khung-mau-word__xem" style={{ height: chieuCaoKhungXem }}>
          {nguonXem ? (
            <TrinhXemTaiLieu nguon={nguonXem} />
          ) : (
            <Empty
              className="khung-mau-word__trong"
              description={
                tenTep ? (
                  <>
                    Đã gắn tệp <b>{tenTep}</b> nhưng chưa tải được nội dung để xem (Dịch vụ Tệp chưa mở).
                    <br />
                    Chọn lại tệp để xem trước; "Giả lập xuất" tạm dùng mẫu gợi ý của hệ thống.
                  </>
                ) : (
                  <>
                    Chưa có tệp Word mẫu — khi xuất đề hệ thống dùng bố cục chuẩn.
                    <br />
                    Chọn tệp .docx của đơn vị hoặc bấm "Dùng mẫu gợi ý" để bắt đầu.
                  </>
                )
              }
            />
          )}
        </div>

        <Collapse
          className="khung-mau-word__huong-dan"
          defaultActiveKey={tep || tenTep ? [] : ['hd']}
          items={[
            {
              key: 'hd',
              label: 'Hướng dẫn soạn tệp Word mẫu',
              children: <HuongDanSoan tenDoiTuong={tenDoiTuong} />,
            },
            {
              key: 'truong',
              label: `Bảng trường dữ liệu đưa động vào tệp (${DANH_MUC_TRUONG_TRON.length} trường)`,
              children: <BangTruongTron />,
            },
          ]}
        />

        <ModalGiaLapXuat
          mo={moGiaLap}
          onDong={() => setMoGiaLap(false)}
          tepMau={tep}
          tenTepMau={tep ? tenTep : undefined}
          cauHinh={cauHinhGiaLap}
        />
      </div>
    </ConfigProvider>
  );
}

function HuongDanSoan({ tenDoiTuong }: { tenDoiTuong: string }) {
  return (
    <ol className="khung-mau-word__buoc">
      <li>
        Soạn tệp trong Microsoft Word (hoặc bấm <b>Dùng mẫu gợi ý</b> → tải về chỉnh): khổ giấy, lề, phông chữ, logo, đầu/chân trang của đơn vị — hệ
        thống giữ nguyên mọi định dạng này khi xuất.
      </li>
      <li>
        Gõ <b>trường trộn</b> dạng <Typography.Text code>{'{{MA_TRUONG}}'}</Typography.Text> vào vị trí cần điền (VD{' '}
        <Typography.Text code>{'Môn: {{MON_HOC}} – {{KHOI}}'}</Typography.Text>). Định dạng (đậm, cỡ chữ…) của chữ trường được áp cho giá trị điền vào.
      </li>
      <li>
        Trường <b>khối</b> <Typography.Text code>{'{{NOI_DUNG_DE}}'}</Typography.Text> (bắt buộc) và <Typography.Text code>{'{{DAP_AN}}'}</Typography.Text> phải
        đứng <b>riêng một đoạn</b> (Enter trước và sau) — cả đoạn được thay bằng các phần, câu hỏi, phương án (tự xếp 4/2/1 cột), bảng đáp án.
      </li>
      <li>
        <b>Vùng điều kiện</b>: đặt đoạn <Typography.Text code>{'{{#KEM_DAP_AN}}'}</Typography.Text> trước và <Typography.Text code>{'{{/KEM_DAP_AN}}'}</Typography.Text>{' '}
        sau trang đáp án — vùng này chỉ in khi người xuất chọn "kèm đáp án". Tương tự <Typography.Text code>{'{{#CO_MA_DE}}'}</Typography.Text> cho nội dung chỉ
        có ở đề hoán vị.
      </li>
      <li>
        Gõ liền mạch cả cụm <Typography.Text code>{'{{…}}'}</Typography.Text>, không đổi định dạng giữa chừng; trường gõ sai tên được cảnh báo ngay sau khi chọn
        tệp.
      </li>
      <li>
        Bấm <b>Giả lập xuất Word/PDF</b> để xem tệp xuất ra với dữ liệu minh họa theo đúng các phần, loại câu, số câu, điểm đang khai báo của {tenDoiTuong} này
        — sửa dữ liệu minh họa, bật/tắt kèm đáp án, mã đề để xem mọi trường hợp.
      </li>
    </ol>
  );
}

/** rowSpan ô Nhóm: hàng đầu nhóm = số trường liền nhau cùng nhóm, các hàng sau = 0 */
function soDongGopNhom(i: number): number {
  const ds = DANH_MUC_TRUONG_TRON;
  if (i > 0 && ds[i - 1].nhom === ds[i].nhom) return 0;
  let n = 1;
  while (i + n < ds.length && ds[i + n].nhom === ds[i].nhom) n++;
  return n;
}

export function BangTruongTron() {
  return (
    <Table<TruongTron>
      size="small"
      rowKey="ma"
      pagination={false}
      scroll={{ y: 360 }}
      dataSource={DANH_MUC_TRUONG_TRON}
      columns={[
        {
          title: 'Nhóm',
          dataIndex: 'nhom',
          key: 'nhom',
          width: 110,
          // Gộp ô các trường liền nhau cùng nhóm
          onCell: (_, i = 0) => ({ rowSpan: soDongGopNhom(i) }),
        },
        {
          title: 'Trường (gõ trong Word)',
          key: 'ma',
          width: 215,
          render: (_, t) => (
            <Typography.Text code copyable={{ text: t.kieu === 'dieu-kien' ? `{{#${t.ma}}}` : cuPhapTruong(t.ma), tooltips: ['Sao chép', 'Đã sao chép'] }}>
              {cuPhapTruong(t.ma)}
            </Typography.Text>
          ),
        },
        {
          title: 'Ý nghĩa',
          key: 'y-nghia',
          render: (_, t) => (
            <>
              <b>{t.nhan}</b>
              {MA_TRUONG_BAT_BUOC.includes(t.ma) && (
                <Tag color="red" variant="outlined" className="khung-mau-word__tag-bb">
                  Bắt buộc
                </Tag>
              )}
              {t.kieu !== 'noi-tuyen' && (
                <Tag color="gold" variant="outlined" className="khung-mau-word__tag-bb">
                  {NHAN_KIEU_TRUONG[t.kieu]}
                </Tag>
              )}
              <div className="khung-mau-word__phu">{t.moTa}</div>
            </>
          ),
        },
        { title: 'Ví dụ', dataIndex: 'viDu', key: 'viDu', width: 150 },
      ]}
    />
  );
}
