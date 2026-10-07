import { Select, type SelectProps } from 'antd';
import { khopTimKiem } from './timKiem';

/** Một lựa chọn của FormSelect (trùng cấu trúc `LuaChon` trong types/common của các web) */
export interface LuaChon {
  value: string;
  label: string;
  /** Dòng diễn giải (option 2 dòng — DS-C6), các thông tin phân tách bằng ' · ' */
  moTa?: string;
  disabled?: boolean;
}

export interface FormSelectProps extends Omit<SelectProps, 'options' | 'filterOption'> {
  luaChon: LuaChon[];
}

/**
 * Select chuẩn DS-C6: LUÔN có tìm kiếm (lọc không dấu), option 2 dòng khi có mô tả,
 * dropdown tự mở rộng theo nội dung (max 560px), không cắt chữ.
 */
export default function FormSelect({ luaChon, ...props }: FormSelectProps) {
  return (
    <Select
      showSearch
      popupMatchSelectWidth={false}
      style={{ width: '100%', ...props.style }}
      styles={{ popup: { root: { maxWidth: 560 } } }}
      maxTagCount={3}
      filterOption={(input, option) => {
        const lc = luaChon.find((l) => l.value === option?.value);
        return khopTimKiem(input, `${lc?.label ?? ''} ${lc?.moTa ?? ''}`);
      }}
      options={luaChon.map((lc) => ({
        value: lc.value,
        label: lc.label,
        disabled: lc.disabled,
      }))}
      optionRender={(option) => {
        const lc = luaChon.find((l) => l.value === option.value);
        if (!lc?.moTa) return option.label;
        return (
          <div className="option-2-dong">
            <div className="dong-ten">{lc.label}</div>
            <div className="dong-mo-ta" style={{ whiteSpace: 'normal' }}>
              {lc.moTa}
            </div>
          </div>
        );
      }}
      {...props}
    />
  );
}
