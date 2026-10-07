/** Icon loa trên đề thi/xem trước — bấm để phát/dừng bản đọc đề bài */
import { PauseCircleOutlined, SoundOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { BanDocDeBai } from './banDoc';
import './ban-doc-de-bai.scss';

export interface NutLoaBanDocProps {
  banDoc: BanDocDeBai;
  size?: 'small' | 'middle' | 'large';
  /** Hiện chữ cạnh icon (VD "Nghe đề") */
  nhan?: string;
}

export default function NutLoaBanDoc({ banDoc, size = 'middle', nhan }: NutLoaBanDocProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [dangPhat, setDangPhat] = useState(false);

  // Đổi câu (bản đọc khác) hoặc rời màn → dừng tiếng đang phát
  useEffect(() => {
    const audio = new Audio(banDoc.duongDan);
    audio.onended = () => setDangPhat(false);
    audio.onpause = () => setDangPhat(false);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audioRef.current = null;
      setDangPhat(false);
    };
  }, [banDoc.duongDan]);

  const bamLoa = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (dangPhat) {
      audio.pause();
      return;
    }
    audio.currentTime = 0;
    audio.play().then(
      () => setDangPhat(true),
      () => setDangPhat(false),
    );
  };

  return (
    <Tooltip title={dangPhat ? 'Dừng đọc' : 'Nghe đọc đề bài'}>
      <Button
        className={`nut-loa-ban-doc${dangPhat ? ' nut-loa-ban-doc--dang-phat' : ''}`}
        shape={nhan ? 'round' : 'circle'}
        size={size}
        icon={dangPhat ? <PauseCircleOutlined /> : <SoundOutlined />}
        aria-label={dangPhat ? 'Dừng đọc đề bài' : 'Nghe đọc đề bài'}
        onClick={bamLoa}
      >
        {nhan}
      </Button>
    </Tooltip>
  );
}
