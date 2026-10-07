/**
 * MODAL GIẢ LẬP XUẤT — trộn dữ liệu minh họa vào tệp Word mẫu để người quản lý thấy trước tệp Word và bản PDF
 * sẽ xuất ra. Trái: dữ liệu minh họa sửa được (trường nội tuyến + tùy chọn kèm đáp án / mã đề / tổng điểm);
 * phải: tab Bản Word (.docx) | Bản PDF. Đề minh họa sinh theo đúng cấu hình phần/loại câu/số câu/điểm của mẫu.
 * Không gọi máy chủ, không ghi dữ liệu; tệp tải về đặt tên "gia-lap-…".
 */
import { FilePdfOutlined, FileWordOutlined, PrinterOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Collapse, Input, InputNumber, Modal, Spin, Switch, Tabs } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrinhXemTaiLieu } from '../trinh-xem-tai-lieu';
import { taiTep, tenTepXuat } from '../xuat-tep/coBan';
import { dungHtmlPdf, inHtmlPdf } from './banPdf';
import { TUY_CHON_GIA_LAP_MAC_DINH, giaTriGiaLapMacDinh, taoDuLieuTronGiaLap, type CauHinhGiaLap, type TuyChonGiaLap } from './giaLap';
import { taoMauWordGoiY } from './mauGoiY';
import { tronMauWord } from './tronMauWord';
import { DANH_MUC_TRUONG_TRON, NHOM_TRUONG_TRON } from './truongTron';

export interface ModalGiaLapXuatProps {
  mo: boolean;
  onDong: () => void;
  /** Tệp Word mẫu; null → dùng mẫu gợi ý của hệ thống */
  tepMau: Blob | null;
  tenTepMau?: string;
  cauHinh: CauHinhGiaLap;
}

interface KetQuaDung {
  word: Blob;
  pdf: string;
  soCau: number;
}

const NHAN_GIA_LAP = 'BẢN GIẢ LẬP — dữ liệu minh họa, không phải đề thật';

export default function ModalGiaLapXuat({ mo, onDong, tepMau, tenTepMau, cauHinh }: ModalGiaLapXuatProps) {
  const [giaTri, setGiaTri] = useState<Record<string, string>>({});
  const [tuyChon, setTuyChon] = useState<TuyChonGiaLap>(TUY_CHON_GIA_LAP_MAC_DINH);
  const [ketQua, setKetQua] = useState<KetQuaDung | null>(null);
  const [dangDung, setDangDung] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [tab, setTab] = useState<'word' | 'pdf'>('word');
  const [urlWord, setUrlWord] = useState<string | null>(null);

  const dung = useCallback(
    async (gt: Record<string, string>, tc: TuyChonGiaLap) => {
      setDangDung(true);
      setLoi(null);
      try {
        const mau = tepMau ?? (await taoMauWordGoiY());
        const { duLieu, de } = taoDuLieuTronGiaLap(cauHinh, gt, tc);
        const { tep } = await tronMauWord(mau, duLieu);
        const pdf = await dungHtmlPdf(tep, { tieuDe: `Giả lập — ${gt.TEN_MAU_DE || 'mẫu đề'}`, nhanGiaLap: NHAN_GIA_LAP });
        setKetQua({ word: tep, pdf, soCau: de.phan.reduce((t, p) => t + p.cau.length, 0) });
      } catch {
        setLoi('Không dựng được bản giả lập — tệp Word mẫu có thể bị hỏng hoặc chứa cấu trúc chưa hỗ trợ.');
        setKetQua(null);
      } finally {
        setDangDung(false);
      }
    },
    [tepMau, cauHinh],
  );

  // Mở modal: nạp dữ liệu minh họa theo cấu hình hiện tại rồi dựng ngay
  useEffect(() => {
    if (!mo) return;
    const gt = giaTriGiaLapMacDinh(cauHinh);
    setGiaTri(gt);
    setTuyChon(TUY_CHON_GIA_LAP_MAC_DINH);
    setTab('word');
    void dung(gt, TUY_CHON_GIA_LAP_MAC_DINH);
    // chỉ chạy khi mở modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mo]);

  useEffect(() => {
    if (!ketQua) {
      setUrlWord(null);
      return;
    }
    const u = URL.createObjectURL(ketQua.word);
    setUrlWord(u);
    return () => URL.revokeObjectURL(u);
  }, [ketQua]);

  const nguonWord = useMemo(() => (urlWord ? { src: urlWord, ten: 'gia-lap-xuat-de.docx' } : null), [urlWord]);

  const doiTuyChon = (tc: Partial<TuyChonGiaLap>) => {
    const moi = { ...tuyChon, ...tc };
    setTuyChon(moi);
    void dung(giaTri, moi);
  };

  const truongTheoNhom = NHOM_TRUONG_TRON.map((nhom) => ({
    nhom,
    ds: DANH_MUC_TRUONG_TRON.filter((t) => t.nhom === nhom && t.kieu === 'noi-tuyen'),
  })).filter((n) => n.ds.length);

  return (
    <Modal
      open={mo}
      onCancel={onDong}
      width={1360}
      style={{ top: 24 }}
      title="Giả lập xuất đề theo tệp Word mẫu"
      destroyOnHidden
      footer={
        <>
          <Button onClick={onDong}>Đóng</Button>
          <Button icon={<FileWordOutlined />} disabled={!ketQua} onClick={() => ketQua && taiTep(ketQua.word, tenTepXuat('gia-lap-xuat-de', 'docx'))}>
            Tải Word giả lập
          </Button>
          <Button type="primary" icon={<PrinterOutlined />} disabled={!ketQua} onClick={() => ketQua && inHtmlPdf(ketQua.pdf)}>
            In / Lưu PDF
          </Button>
        </>
      }
    >
      <div className="gia-lap-xuat">
        <div className="gia-lap-xuat__trai">
          <Alert
            type="info"
            showIcon
            title={
              tepMau
                ? `Đang trộn vào tệp "${tenTepMau ?? 'mẫu Word'}".`
                : 'Chưa có tệp Word mẫu — đang giả lập bằng mẫu gợi ý của hệ thống.'
            }
            description="Câu hỏi là nội dung minh họa, sinh theo đúng các phần, loại câu, số câu, điểm đang khai báo (chưa lưu cũng được)."
          />
          <div className="gia-lap-xuat__tuy-chon">
            <label>
              <Switch size="small" checked={tuyChon.kemDapAn} onChange={(v) => doiTuyChon({ kemDapAn: v })} /> Kèm đáp án
            </label>
            <label>
              <Switch size="small" checked={tuyChon.coMaDe} onChange={(v) => doiTuyChon({ coMaDe: v })} /> Đề hoán vị (có mã đề)
            </label>
            <label>
              Tổng điểm{' '}
              <InputNumber
                size="small"
                min={1}
                max={100}
                value={tuyChon.tongDiem}
                onChange={(v) => v && setTuyChon((t) => ({ ...t, tongDiem: Number(v) }))}
                style={{ width: 72 }}
              />
            </label>
          </div>
          <Collapse
            size="small"
            className="gia-lap-xuat__truong"
            defaultActiveKey={['Đơn vị & kỳ kiểm tra', 'Môn học & đề']}
            items={truongTheoNhom.map((n) => ({
              key: n.nhom,
              label: n.nhom,
              children: (
                <div className="gia-lap-xuat__luoi">
                  {n.ds.map((t) => (
                    <div key={t.ma}>
                      <label title={t.moTa}>
                        {t.nhan} <span className="gia-lap-xuat__ma">{`{{${t.ma}}}`}</span>
                      </label>
                      <Input
                        size="small"
                        value={giaTri[t.ma] ?? ''}
                        placeholder={t.ma === 'SO_CAU' || t.ma === 'TONG_DIEM' ? 'Để trống = tự tính theo đề' : t.viDu}
                        onChange={(e) => setGiaTri((g) => ({ ...g, [t.ma]: e.target.value }))}
                        onPressEnter={() => void dung(giaTri, tuyChon)}
                      />
                    </div>
                  ))}
                </div>
              ),
            }))}
          />
          <div className="gia-lap-xuat__nut">
            <Button icon={<ReloadOutlined />} onClick={() => void dung(giaTri, tuyChon)} loading={dangDung}>
              Cập nhật xem trước
            </Button>
            <Button
              type="link"
              onClick={() => {
                const gt = giaTriGiaLapMacDinh(cauHinh);
                setGiaTri(gt);
                void dung(gt, tuyChon);
              }}
            >
              Khôi phục dữ liệu minh họa
            </Button>
          </div>
        </div>
        <div className="gia-lap-xuat__phai">
          {loi && <Alert type="error" showIcon title={loi} style={{ marginBottom: 8 }} />}
          <Tabs
            activeKey={tab}
            onChange={(k) => setTab(k as 'word' | 'pdf')}
            tabBarExtraContent={ketQua ? <span className="khung-mau-word__phu">{ketQua.soCau} câu minh họa</span> : null}
            items={[
              { key: 'word', label: <span><FileWordOutlined /> Bản Word (.docx)</span> },
              { key: 'pdf', label: <span><FilePdfOutlined /> Bản PDF</span> },
            ]}
          />
          <Spin spinning={dangDung} description="Đang trộn dữ liệu vào mẫu…">
            <div className="gia-lap-xuat__xem">
              {tab === 'word' && nguonWord && <TrinhXemTaiLieu nguon={nguonWord} />}
              {tab === 'pdf' && ketQua && <iframe title="Bản PDF giả lập" className="gia-lap-xuat__pdf" srcDoc={ketQua.pdf} />}
            </div>
          </Spin>
          {tab === 'pdf' && (
            <div className="khung-mau-word__phu" style={{ marginTop: 6 }}>
              Bản PDF dựng từ chính tệp Word đã trộn (khổ giấy, lề, đầu/chân trang theo mẫu). Khi xuất đề thật, máy chủ chuyển Word → PDF nên vị trí ngắt
              trang tự động có thể lệch vài dòng. "In / Lưu PDF" mở hộp in → chọn "Lưu dưới dạng PDF".
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
