import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PaginationProps = {
  /** Current page, 1-indexed. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

/**
 * Compact "‹ 1 2 3 ›" page switcher. Renders nothing when everything fits
 * on a single page, so call sites don't need to guard on pageCount > 1
 * themselves. Stateless/controlled — each caller owns its own `page`
 * state, which is what keeps multiple lists on a screen paginating
 * independently of one another.
 */
export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  const theme = useTheme();

  if (pageCount <= 1) return null;

  const canGoPrev = page > 1;
  const canGoNext = page < pageCount;

  return (
    <View style={styles.row} accessibilityRole="tablist">
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
});
