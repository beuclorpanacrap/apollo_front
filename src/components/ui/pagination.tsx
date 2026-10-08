import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { webProps } from '@/utils/web-props';
import { pressState, useInteractive } from './interactive';

type PaginationProps = {
  /** Current page, 1-indexed. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** `compact` is the patient app's 26px control; `portal` has ≥ 36px targets, windowing and visible focus. */
  variant?: 'compact' | 'portal';
  /** Portal only: a visible range such as "Showing 7–12 of 23". */
  summary?: string;
};

/** 1 … 4 5 6 … 12 — keeps the control a fixed width however many pages there are. */
function pageWindow(page: number, pageCount: number): (number | 'gap-start' | 'gap-end')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages: (number | 'gap-start' | 'gap-end')[] = [1];
  const start = Math.max(2, Math.min(page - 1, pageCount - 4));
  const end = Math.min(pageCount - 1, Math.max(page + 1, 5));
  if (start > 2) pages.push('gap-start');
  for (let n = start; n <= end; n += 1) pages.push(n);
  if (end < pageCount - 1) pages.push('gap-end');
  pages.push(pageCount);
  return pages;
}

/**
 * Compact "‹ 1 2 3 ›" page switcher. Renders nothing when everything fits
 * on a single page, so call sites don't need to guard on pageCount > 1
 * themselves. Stateless/controlled — each caller owns its own `page`
 * state, which is what keeps multiple lists on a screen paginating
 * independently of one another.
 */
export function Pagination({ page, pageCount, onPageChange, variant = 'compact', summary }: PaginationProps) {
  const theme = useTheme();
  const fx = useInteractive();

  if (pageCount <= 1) return null;

  const canGoPrev = page > 1;
  const canGoNext = page < pageCount;

  if (variant === 'portal') {
    const pageButton = (n: number) => {
      const active = n === page;
      return (
        <Pressable
          key={n}
          onPress={() => onPageChange(n)}
          accessibilityRole="button"
          accessibilityLabel={`Page ${n}`}
          accessibilityState={{ selected: active }}
          {...webProps({ 'aria-current': active ? 'page' : undefined })}
          style={(state) => {
            const s = pressState(state);
            return [
              styles.portalButton,
              { backgroundColor: active ? theme.tintStrong : s.hovered ? theme.pillGreenBg : theme.surfaceMuted },
              fx.ring(theme, s),
              fx.transition,
            ];
          }}
        >
          <Text style={[styles.portalLabel, { color: active ? theme.onTint : theme.textMuted }]}>{n}</Text>
        </Pressable>
      );
    };

    const arrow = (dir: 'prev' | 'next') => {
      const enabled = dir === 'prev' ? canGoPrev : canGoNext;
      return (
        <Pressable
          onPress={() => enabled && onPageChange(dir === 'prev' ? page - 1 : page + 1)}
          disabled={!enabled}
          accessibilityRole="button"
          accessibilityLabel={dir === 'prev' ? 'Previous page' : 'Next page'}
          accessibilityState={{ disabled: !enabled }}
          style={(state) => {
            const s = pressState(state);
            return [
              styles.portalButton,
              { backgroundColor: s.hovered && enabled ? theme.pillGreenBg : theme.surfaceMuted },
              !enabled && styles.disabled,
              fx.ring(theme, s),
              fx.transition,
            ];
          }}
        >
          <Ionicons name={dir === 'prev' ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.textMuted} />
        </Pressable>
      );
    };

    return (
      <View style={styles.portalWrap}>
        {summary ? <Text style={[styles.summary, { color: theme.textMuted }]}>{summary}</Text> : null}
        <View role="navigation" aria-label="Pagination" style={styles.portalRow}>
          {arrow('prev')}
          {pageWindow(page, pageCount).map((entry) =>
            typeof entry === 'number' ? (
              pageButton(entry)
            ) : (
              <Text key={entry} style={[styles.gap, { color: theme.textMuted }]} aria-hidden>
                …
              </Text>
            ),
          )}
          {arrow('next')}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row} role="navigation" aria-label="Pagination">
      <TouchableOpacity
        onPress={() => canGoPrev && onPageChange(page - 1)}
        disabled={!canGoPrev}
        style={[styles.arrowButton, { backgroundColor: theme.surfaceMuted }, !canGoPrev && styles.disabled]}
        accessibilityLabel="Previous page"
      >
        <Ionicons name="chevron-back" size={14} color={theme.textSecondary} />
      </TouchableOpacity>

      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => {
        const active = n === page;
        return (
          <TouchableOpacity
            key={n}
            onPress={() => onPageChange(n)}
            style={[styles.pageButton, { backgroundColor: active ? theme.tintStrong : theme.surfaceMuted }]}
            accessibilityLabel={`Page ${n}`}
            accessibilityState={{ selected: active }}
            {...webProps({ 'aria-current': active ? 'page' : undefined })}
          >
            <Text style={[styles.pageLabel, { color: active ? theme.onTint : theme.textSecondary }]}>{n}</Text>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={() => canGoNext && onPageChange(page + 1)}
        disabled={!canGoNext}
        style={[styles.arrowButton, { backgroundColor: theme.surfaceMuted }, !canGoNext && styles.disabled]}
        accessibilityLabel="Next page"
      >
        <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.two },
  arrowButton: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pageButton: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageLabel: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  disabled: { opacity: 0.4 },

  portalWrap: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three },
  portalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  portalButton: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalLabel: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  gap: { minWidth: 20, textAlign: 'center', fontSize: 14, fontFamily: Fonts.sans.semiBold },
  summary: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans.medium, fontWeight: '500' },
});
