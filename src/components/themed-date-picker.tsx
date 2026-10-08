import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTheme, Colors, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const YEARS_PER_PAGE = 12;

type ThemedDatePickerProps = {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
};

type DayCell = { date: Date; inMonth: boolean };
type PickerMode = 'years' | 'months' | 'days';

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];

  // Leading days from the previous month, so the grid always starts on Sunday
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  // Days in the current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Trailing days so the final week is complete
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  return cells;
}

// Aligns a year to the start of its YEARS_PER_PAGE page, anchored at `min`.
function alignYearPage(year: number, min: number): number {
  const offset = (year - min) % YEARS_PER_PAGE;
  const normalizedOffset = offset < 0 ? offset + YEARS_PER_PAGE : offset;
  return year - normalizedOffset;
}

/**
 * A calendar date picker styled with the app's own theme tokens, used in place
 * of the OS-native picker so it looks consistent across iOS, Android, and web.
 * Selection is a strict drill-down: Year, then Month, then Day. There's no way
 * to jump ahead — each step only unlocks after the previous one is picked.
 */
export function ThemedDatePicker({
  visible,
  value,
  onClose,
  onChange,
  maximumDate,
  minimumDate,
}: ThemedDatePickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const currentYear = new Date().getFullYear();
  const maxYear = maximumDate ? maximumDate.getFullYear() : currentYear;
  const minYear = minimumDate ? minimumDate.getFullYear() : maxYear - 99;

  const [mode, setMode] = useState<PickerMode>('years');
  const [cursor, setCursor] = useState(() => {
    const base = value ?? new Date(2000, 0, 1);
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [yearsAnchor, setYearsAnchor] = useState(() => alignYearPage(cursor.year, minYear));

  // Reset the whole flow every time the picker opens.
  useEffect(() => {
    if (visible) {
      const base = value ?? new Date(2000, 0, 1);
      const baseYear = base.getFullYear();
      setCursor({ year: baseYear, month: base.getMonth() });
      setYearsAnchor(alignYearPage(baseYear, minYear));
      setMode(value ? 'days' : 'years');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const today = startOfDay(new Date());
  const selected = value ? startOfDay(value) : null;

  const isDisabled = (date: Date) => {
    if (maximumDate && date > startOfDay(maximumDate)) return true;
    if (minimumDate && date < startOfDay(minimumDate)) return true;
    return false;
  };

  const isMonthDisabled = (year: number, month: number) => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    if (maximumDate && first > startOfDay(maximumDate)) return true;
    if (minimumDate && last < startOfDay(minimumDate)) return true;
    return false;
  };

  const selectYear = (year: number) => {
    setCursor((c) => ({ ...c, year }));
    setMode('months');
  };

  const selectMonth = (month: number) => {
    setCursor((c) => ({ ...c, month }));
    setMode('days');
  };

  const goToPrevYearPage = () => setYearsAnchor((a) => Math.max(minYear, a - YEARS_PER_PAGE));
  const goToNextYearPage = () => setYearsAnchor((a) => a + YEARS_PER_PAGE);
  const canGoPrevYearPage = yearsAnchor > minYear;
  const canGoNextYearPage = yearsAnchor + YEARS_PER_PAGE <= maxYear;
  const yearCells = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearsAnchor + i);

  const goToPrevMonth = () =>
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  const goToNextMonth = () =>
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Empty onPress stops the tap from bubbling up and closing the modal */}
        <Pressable style={styles.card} onPress={() => {}}>
          {mode === 'years' && (
            <>
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={goToPrevYearPage}
                  hitSlop={8}
                  disabled={!canGoPrevYearPage}
                  style={[styles.navButton, !canGoPrevYearPage && styles.navButtonDisabled]}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.tintStrong} />
                </TouchableOpacity>
                <Text style={styles.headerLabel}>
                  {yearsAnchor} – {Math.min(yearsAnchor + YEARS_PER_PAGE - 1, maxYear)}
                </Text>
                <TouchableOpacity
                  onPress={goToNextYearPage}
                  hitSlop={8}
                  disabled={!canGoNextYearPage}
                  style={[styles.navButton, !canGoNextYearPage && styles.navButtonDisabled]}
                >
                  <Ionicons name="chevron-forward" size={20} color={theme.tintStrong} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionGrid}>
                {yearCells.map((year) => {
                  const outOfRange = year > maxYear || year < minYear;
                  const isSelected = year === cursor.year;
                  const isThisYear = year === currentYear;

                  return (
                    <TouchableOpacity
                      key={year}
                      style={[styles.optionCell, isSelected && styles.cellSelected]}
                      disabled={outOfRange}
                      onPress={() => selectYear(year)}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          outOfRange && styles.cellTextDisabled,
                          isThisYear && !isSelected && styles.cellTextToday,
                          isSelected && styles.cellTextSelected,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {mode === 'months' && (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setMode('years')} hitSlop={8} style={styles.navButton}>
                  <Ionicons name="chevron-back" size={20} color={theme.tintStrong} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('years')} hitSlop={8} style={styles.headerLabelButton}>
                  <Text style={styles.headerLabel}>{cursor.year}</Text>
                </TouchableOpacity>
                <View style={styles.navButtonSpacer} />
              </View>

              <View style={styles.optionGrid}>
                {MONTH_LABELS.map((label, month) => {
                  const disabled = isMonthDisabled(cursor.year, month);
                  const isSelected = month === cursor.month;
                  const isThisMonth = month === new Date().getMonth() && cursor.year === currentYear;

                  return (
                    <TouchableOpacity
                      key={month}
                      style={[styles.optionCell, isSelected && styles.cellSelected]}
                      disabled={disabled}
                      onPress={() => selectMonth(month)}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          disabled && styles.cellTextDisabled,
                          isThisMonth && !isSelected && styles.cellTextToday,
                          isSelected && styles.cellTextSelected,
                        ]}
                      >
                        {label.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {mode === 'days' && (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={goToPrevMonth} hitSlop={8} style={styles.navButton}>
                  <Ionicons name="chevron-back" size={20} color={theme.tintStrong} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('months')} hitSlop={8} style={styles.headerLabelButton}>
                  <Text style={styles.headerLabel}>
                    {MONTH_LABELS[cursor.month]} {cursor.year}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goToNextMonth} hitSlop={8} style={styles.navButton}>
                  <Ionicons name="chevron-forward" size={20} color={theme.tintStrong} />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAY_LABELS.map((label, i) => (
                  <Text key={i} style={styles.weekdayLabel}>{label}</Text>
                ))}
              </View>

              <View style={styles.grid}>
                {grid.map(({ date, inMonth }, i) => {
                  const disabled = isDisabled(date);
                  const isSelected = !!selected && date.getTime() === selected.getTime();
                  const isToday = date.getTime() === today.getTime();

                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.cell, isSelected && styles.cellSelected]}
                      disabled={disabled || !inMonth}
                      onPress={() => {
                        onChange(date);
                        onClose();
                      }}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          !inMonth && styles.cellTextMuted,
                          disabled && styles.cellTextDisabled,
                          isToday && !isSelected && styles.cellTextToday,
                          isSelected && styles.cellTextSelected,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL_SIZE = 40;

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.pillGreenBg,
  },
  navButtonSpacer: {
    width: 32,
    height: 32,
  },
  navButtonDisabled: {
    opacity: 0.35,
  },
  headerLabelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  headerLabel: {
    fontSize: 15,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.text,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Fonts.sans.semiBold,
    color: theme.textTertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
    marginBottom: 2,
  },
  optionCell: {
    width: '31%',
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 10,
  },
  cellSelected: {
    backgroundColor: theme.tintStrong,
  },
  cellText: {
    fontSize: 14,
    fontFamily: Fonts.sans.regular,
    color: theme.text,
  },
  cellTextMuted: {
    color: theme.textTertiary,
    opacity: 0.4,
  },
  cellTextDisabled: {
    color: theme.textTertiary,
    opacity: 0.3,
  },
  cellTextToday: {
    color: theme.tintStrong,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
  },
  cellTextSelected: {
    color: theme.onTint,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.textSecondary,
  },
});