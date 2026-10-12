import { useEffect, useRef, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Fonts, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { webProps } from '@/utils/web-props';
import { pressState, useInteractive } from './interactive';

export type TabPillItem = {
  key: string;
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Optional count shown after the label (not announced twice: it is folded into the accessible name). */
  count?: number;
};

type TabPillsProps = {
  tabs: readonly TabPillItem[];
  value: string;
  onChange: (key: string) => void;
  accessibilityLabel: string;
  /** Prefix for the element ids that link each tab to its panel (`${idPrefix}-tab-${key}` / `-panel-`). */
  idPrefix: string;
  /** 44px targets and `textMuted` labels. */
  portal?: boolean;
};

/** Ids to spread onto the matching panel: `<View {...tabPanelProps('vault', key)} />`. */
export function tabPanelProps(idPrefix: string, key: string) {
  return webProps({ role: 'tabpanel', id: `${idPrefix}-panel-${key}`, 'aria-labelledby': `${idPrefix}-tab-${key}` });
}

/**
 * The pill tab strip used by the patient vault, shared. Visual match: 14px radius, `surfaceMuted`
 * idle, `tintStrong` active. Adds what the original lacks: tablist/tab semantics, roving tabindex,
 * Arrow/Home/End keys and horizontal scrolling that keeps the active tab in view.
 */
export function TabPills({ tabs, value, onChange, accessibilityLabel, idPrefix, portal }: TabPillsProps) {
  const theme = useTheme();
  const fx = useInteractive();
  const nodes = useRef<Record<string, unknown>>({});

  // Keep the active tab visible when the strip scrolls (narrow screens).
  useEffect(() => {
    const node = nodes.current[value] as { scrollIntoView?: (options?: ScrollIntoViewOptions) => void } | undefined;
    node?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: fx.reduced ? 'auto' : 'smooth' });
    // `fx.reduced` is deliberately not a dependency: only a change of tab should scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const move = (event: { key: string; preventDefault: () => void }) => {
    const index = tabs.findIndex((tab) => tab.key === value);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    onChange(tabs[next].key);
    // Move DOM focus with the selection (automatic activation pattern).
    requestAnimationFrame(() => {
      const node = nodes.current[tabs[next].key] as { focus?: () => void } | undefined;
      node?.focus?.();
    });
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      style={styles.scroll}
      {...webProps({ 'data-tabstrip': '' })}
    >
      <View role="tablist" aria-label={accessibilityLabel} style={styles.list} {...webProps({ onKeyDown: move })}>
        {tabs.map((tab) => {
          const active = tab.key === value;
          const name = tab.count != null ? `${tab.label}, ${tab.count}` : tab.label;
          const fg = active ? theme.onTint : portal ? theme.textMuted : theme.textSecondary;
          return (
            <Pressable
              key={tab.key}
              ref={(node) => {
                nodes.current[tab.key] = node;
              }}
              role="tab"
              id={`${idPrefix}-tab-${tab.key}`}
              aria-selected={active}
              aria-controls={active ? `${idPrefix}-panel-${tab.key}` : undefined}
              accessibilityLabel={name}
              onPress={() => onChange(tab.key)}
              {...webProps({ tabIndex: active ? 0 : -1 })}
              style={(state) => {
                const s = pressState(state);
                return [
                  styles.pill,
                  portal ? styles.pillPortal : null,
                  {
                    backgroundColor: active ? theme.tintStrong : s.hovered ? theme.pillGreenBg : theme.surfaceMuted,
                  },
                  fx.ring(theme, s),
                  fx.transition,
                ];
              }}
            >
              {tab.icon ? <Ionicons name={tab.icon} size={15} color={fg} /> : null}
              <Text style={[styles.label, { color: fg }]}>{tab.label}</Text>
              {tab.count != null ? (
                <View
                  style={[
                    styles.count,
                    { backgroundColor: active ? theme.heroChipBg : theme.backgroundElement },
                  ]}
                >
                  <Text style={[styles.countLabel, { color: active ? theme.heroChipText : theme.textMuted }]}>
                    {tab.count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  strip: { flexGrow: 1 },
  list: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
  },
  pillPortal: { minHeight: 44, paddingHorizontal: 16, borderRadius: Radii.md + 2 },
  label: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  count: { minWidth: 22, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countLabel: { fontSize: 12, lineHeight: 16, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
});
