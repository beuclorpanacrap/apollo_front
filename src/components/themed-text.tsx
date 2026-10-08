import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'brand';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'brand' && styles.brand,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans.medium,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Fonts.sans.medium,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
    fontFamily: Fonts.sans.medium,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: '#327A4C',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
  // Reserved for the app name and the person's name — the only two spots
  // that should carry the Poppins display treatment.
  brand: {
    fontFamily: Fonts.display,
    fontWeight: '800',
  },
});
