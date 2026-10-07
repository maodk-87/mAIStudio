/** So sánh 2 phiên bản nội dung cạnh nhau — highlight từ khác biệt */
import './so-sanh-phien-ban.scss';

interface SoSanhPhienBanProps {
  tieuDeCu?: string;
  tieuDeMoi?: string;
  noiDungCu: string;
  noiDungMoi: string;
}

function boThe(html: string): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Đánh dấu các từ không xuất hiện ở bản kia */
function danhDauKhacBiet(noiDung: string, banKia: string, loai: 'cu' | 'moi') {
  const tapKia = new Set(boThe(banKia).toLowerCase().split(' '));
  return boThe(noiDung)
    .split(' ')
    .map((tu, i) =>
      tapKia.has(tu.toLowerCase()) ? (
        <span key={i}>{tu} </span>
      ) : (
        <mark key={i} className={`ssv__mark ssv__mark--${loai}`}>
          {tu}{' '}
        </mark>
      ),
    );
}

export default function SoSanhPhienBan({
  tieuDeCu = 'Bản cũ',
  tieuDeMoi = 'Bản mới',
  noiDungCu,
  noiDungMoi,
}: SoSanhPhienBanProps) {
  return (
    <div className="ssv">
      <div className="ssv__cot ssv__cot--cu">
        <div className="ssv__tieu-de">{tieuDeCu}</div>
        <div className="ssv__noi-dung">
          {danhDauKhacBiet(noiDungCu, noiDungMoi, 'cu')}
        </div>
      </div>
      <div className="ssv__cot ssv__cot--moi">
        <div className="ssv__tieu-de">{tieuDeMoi}</div>
        <div className="ssv__noi-dung">
          {danhDauKhacBiet(noiDungMoi, noiDungCu, 'moi')}
        </div>
      </div>
    </div>
  );
}
