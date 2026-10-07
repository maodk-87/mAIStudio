/**
 * Modal nhập công thức toán trực quan bằng MathLive (trải nghiệm kiểu
 * Wiris MathType / Equation Editor của Word — không cần biết LaTeX):
 * gõ trực tiếp, bàn phím toán học ảo, đồng thời xem/sửa được mã LaTeX.
 * MathLive được nạp lười (dynamic import) — chỉ tải khi mở modal lần đầu.
 */
import { InfoCircleOutlined } from '@ant-design/icons';
import { Input, Modal, Spin } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { MathfieldElement } from 'mathlive';

interface ModalCongThucProps {
  open: boolean;
  /** LaTeX ban đầu (rỗng = chèn mới) */
  latexBanDau: string;
  dangSua: boolean;
  onHuy: () => void;
  onXong: (latex: string) => void;
}

/** Nạp MathLive một lần cho cả app + cấu hình đường dẫn font đã copy vào public/ */
let napMathLive: Promise<typeof import('mathlive')> | undefined;
const layMathLive = () => {
  if (!napMathLive) {
    napMathLive = import('mathlive').then((ml) => {
      ml.MathfieldElement.fontsDirectory = '/mathlive-fonts';
      ml.MathfieldElement.soundsDirectory = null;
      return ml;
    });
  }
  return napMathLive;
};

export default function ModalCongThuc({
  open,
  latexBanDau,
  dangSua,
  onHuy,
  onXong,
}: ModalCongThucProps) {
  const khungRef = useRef<HTMLDivElement>(null);
  const mfRef = useRef<MathfieldElement | null>(null);
  const [latex, setLatex] = useState('');
  const [dangNap, setDangNap] = useState(false);

  useEffect(() => {
    if (open) {
      setLatex(latexBanDau);
      setDangNap(true);
    }
  }, [open, latexBanDau]);

  /**
   * Dựng math-field SAU khi modal mở xong (afterOpenChange) — nội dung modal
   * (destroyOnHidden) chỉ mount sau 1 frame animation của antd, nếu dựng trong
   * useEffect thì khungRef còn null và ô nhập trực quan sẽ trống.
   */
  const dungMathField = () => {
    layMathLive().then((ml) => {
      const khung = khungRef.current;
      if (!khung || !khung.isConnected) return;
      const mf = new ml.MathfieldElement();
      mf.value = latexBanDau;
      mf.style.width = '100%';
      mf.style.fontSize = '24px';
      mf.addEventListener('input', () => setLatex(mf.getValue('latex')));
      khung.replaceChildren(mf);
      mfRef.current = mf;
      setDangNap(false);
      setTimeout(() => mf.focus(), 50);
    });
  };

  const suaLatexTay = (giaTri: string) => {
    setLatex(giaTri);
    if (mfRef.current && mfRef.current.getValue('latex') !== giaTri) {
      mfRef.current.setValue(giaTri, { silenceNotifications: true });
    }
  };

  return (
    <Modal
      title={dangSua ? 'Sửa công thức toán học' : 'Chèn công thức toán học'}
      open={open}
      onCancel={onHuy}
      onOk={() => onXong(latex.trim())}
      afterOpenChange={(daMo) => {
        if (daMo) dungMathField();
        else mfRef.current = null;
      }}
      okText={dangSua ? 'Cập nhật' : 'Chèn công thức'}
      cancelText="Hủy"
      okButtonProps={{ disabled: !latex.trim() }}
      width="min(1280px, 94vw)"
      destroyOnHidden
    >
      <p className="editor-soan-thao__ghi-chu">
        <InfoCircleOutlined /> Gõ công thức trực tiếp như trong Word (VD gõ <code>x^2</code>,{' '}
        <code>1/2</code>, <code>sqrt</code>…); bấm biểu tượng bàn phím trong ô để mở bàn phím toán
        học ảo với đầy đủ mẫu phân số, căn, tích phân…
      </p>
      <Spin spinning={dangNap} description="Đang tải bộ soạn công thức…">
        <div ref={khungRef} className="editor-soan-thao__khung-mathlive" />
      </Spin>
      <div className="editor-soan-thao__latex">
        <span className="editor-soan-thao__latex-nhan">Mã LaTeX (dành cho người quen dùng):</span>
        <Input.TextArea
          rows={4}
          value={latex}
          onChange={(e) => suaLatexTay(e.target.value)}
          placeholder="VD: \frac{x^2-1}{x+1}"
        />
      </div>
    </Modal>
  );
}
