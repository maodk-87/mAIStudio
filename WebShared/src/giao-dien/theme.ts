import type { ThemeConfig } from 'antd';
import { bangMau as m } from './thuongHieu';

const fontFamily = `Tahoma, 'Segoe UI', Arial, sans-serif`;

/** Chiều cao ô nhập = chiều cao nút → hàng lọc/form thẳng hàng */
const caoDieuKhien = 40;

/**
 * Theme antd KHẢO THÍ SỐ — dùng chung mọi web (docs/ui/0-design-system.md mục B).
 * Chữ chính 15px, chữ nhỏ nhất 14px; modal 3 phần header/body/footer tách bằng đường kẻ;
 * nút có khoảng đệm rộng để chữ không sát viền.
 */
export const themeKhaoThiSo: ThemeConfig = {
  token: {
    colorPrimary: m.primary,
    colorLink: m.primary,
    colorLinkHover: m.primaryHover,
    colorError: m.do,
    colorSuccess: m.success,
    colorWarning: m.warning,
    colorInfo: m.info,
    colorText: m.chu,
    colorTextSecondary: m.chuPhu,
    colorTextHeading: m.chu,
    colorBorder: m.vienDam,
    colorBorderSecondary: m.vien,
    colorSplit: m.vien,
    colorBgLayout: m.nenTrang,
    colorTextDisabled: m.voHieu,
    colorBgContainerDisabled: m.nenVoHieu,
    fontFamily,
    fontSize: 15,
    fontSizeSM: 14,
    fontSizeLG: 16,
    fontSizeHeading1: 28,
    fontSizeHeading2: 24,
    fontSizeHeading3: 21,
    fontSizeHeading4: 18,
    fontSizeHeading5: 16,
    borderRadius: 6,
    borderRadiusLG: 10,
    borderRadiusSM: 4,
    controlHeight: caoDieuKhien,
    controlHeightSM: 32,
    controlHeightLG: 46,
    boxShadow: '0 12px 32px rgba(11, 63, 115, 0.16), 0 2px 6px rgba(11, 63, 115, 0.08)',
    boxShadowSecondary: '0 8px 24px rgba(11, 63, 115, 0.14), 0 2px 4px rgba(11, 63, 115, 0.06)',
  },
  components: {
    Button: {
      fontWeight: 500,
      paddingInline: 18,
      paddingInlineLG: 24,
      paddingInlineSM: 12,
      contentFontSize: 15,
      contentFontSizeLG: 16,
      contentFontSizeSM: 14,
      onlyIconSize: 18,
      onlyIconSizeLG: 20,
      onlyIconSizeSM: 16,
      iconGap: 8,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
      defaultBorderColor: m.vienDam,
      defaultColor: m.chu,
    },
    Input: { paddingInline: 12 },
    InputNumber: { paddingInline: 12 },
    Select: { optionFontSize: 15, optionHeight: 38 },
    Table: {
      headerBg: '#edf3f9',
      headerColor: m.chu,
      headerSplitColor: m.vien,
      borderColor: m.vien,
      rowHoverBg: '#f5f9fd',
      rowSelectedBg: m.primaryLight,
      rowSelectedHoverBg: '#dde9f6',
      cellFontSize: 15,
      cellPaddingBlock: 12,
      cellPaddingInline: 14,
      cellPaddingBlockSM: 8,
      cellPaddingInlineSM: 10,
      footerBg: m.nenHeaderBox,
    },
    Menu: {
      itemHeight: 44,
      iconSize: 18,
      collapsedIconSize: 18,
      iconMarginInlineEnd: 12,
      itemColor: m.chu,
      itemHoverColor: m.primaryDark,
      itemHoverBg: '#f0f5fb',
      itemSelectedColor: m.primaryDark,
      itemSelectedBg: m.primaryLight,
      itemActiveBg: '#e2edf8',
      subMenuItemSelectedColor: m.primaryDark,
      groupTitleColor: m.chuPhu,
      groupTitleFontSize: 14,
      itemBorderRadius: 6,
      itemMarginInline: 8,
    },
    Tabs: {
      titleFontSize: 15,
      titleFontSizeLG: 16,
      titleFontSizeSM: 14,
      itemColor: m.chuPhu,
      itemHoverColor: m.primary,
      itemSelectedColor: m.primaryDark,
      inkBarColor: m.primary,
      horizontalItemPadding: '12px 4px',
      cardBg: m.nenHeaderBox,
    },
    Breadcrumb: {
      fontSize: 14,
      iconFontSize: 15,
      itemColor: m.chuPhu,
      linkColor: m.chuPhu,
      linkHoverColor: m.primary,
      lastItemColor: m.chu,
      separatorColor: m.voHieu,
      separatorMargin: 8,
    },
    Modal: {
      // Khoảng đệm/đường kẻ 3 phần header · body · footer đặt ở giao-dien.scss (token padding không công khai)
      headerBg: m.nenHeaderBox,
      footerBg: m.nenHeaderBox,
      titleFontSize: 18,
      titleLineHeight: 1.45,
      titleColor: m.chu,
    },
    Drawer: {
      footerPaddingBlock: 12,
      footerPaddingInline: 24,
    },
    Card: {
      headerBg: m.nenHeaderBox,
      headerFontSize: 17,
      headerFontSizeSM: 15,
    },
    Tag: {
      defaultBg: '#f3f5f8',
      defaultColor: '#3b4a5c',
    },
    Form: {
      labelFontSize: 15,
      labelColor: m.chu,
      labelRequiredMarkColor: m.do,
      verticalLabelPadding: '0 0 6px',
    },
    Layout: {
      bodyBg: m.nenTrang,
      siderBg: m.nenBox,
      lightSiderBg: m.nenBox,
    },
    Steps: { titleLineHeight: 26 },
    Tooltip: { maxWidth: 360 },
    Alert: { withDescriptionPadding: '14px 18px' },
  },
};

/** Ghép theme gốc với phần ghi đè (token + components gộp theo từng khóa, không thay cả khối) */
export function moRongTheme(ghiDe: ThemeConfig): ThemeConfig {
  const components = { ...themeKhaoThiSo.components } as Record<string, object>;
  for (const [ten, giaTri] of Object.entries(ghiDe.components ?? {})) {
    components[ten] = { ...(components[ten] ?? {}), ...giaTri };
  }
  return {
    ...themeKhaoThiSo,
    ...ghiDe,
    token: { ...themeKhaoThiSo.token, ...ghiDe.token },
    components: components as ThemeConfig['components'],
  };
}
