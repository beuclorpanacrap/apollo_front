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

type ThemedDatePickerProps = {
  visible: boolean;
  value: Date | null;
  onClose: () => void;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
};

type DayCell = { date: Date; inMonth: boolean };

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

/**
 * A calendar date picker styled with the app's own theme tokens, used in place
 * of the OS-native picker so it looks consistent across iOS, Android, and web.
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
  const [cursor, setCursor] = useState(() => {
    const base = value ?? new Date(2000, 0, 1);
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  // Jump back to the selected (or default) month every time the picker opens.
  useEffect(() => {
    if (visible) {
      const base = value ?? new Date(2000, 0, 1);
      setCursor({ year: base.getFullYear(), month: base.getMonth() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const today = startOfDay(new Date());
  const selected = value ? startOfDay(value) : null;

  const goToPrevMonth = () =>
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  const goToNextMonth = () =>
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));

  const isDisabled = (date: Date) => {
    if (maximumDate && date > startOfDay(maximumDate)) return true;
    if (minimumDate && date < startOfDay(minimumDate)) return true;
    return false;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Empty onPress stops the tap from bubbling up and closing the modal */}
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={goToPrevMonth} hitSlop={8} style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color={theme.tintStrong} />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>
              {MONTH_LABELS[cursor.month]} {cursor.year}
            </Text>
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
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL_SIZE / 2,
    marginBottom: 2,
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