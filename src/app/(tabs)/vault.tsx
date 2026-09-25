import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { EntryCard } from '@/components/vault/entry-card';
import { BrandColors, Colors, Fonts, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import type { VaultDisplayEntry } from '@/utils/vault-display';

const theme = Colors.light;

type TabKey = 'prescriptions' | 'labs' | 'conditions';

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'prescriptions', label: 'Prescriptions', icon: 'medical' },
  { key: 'labs', label: 'Test Results', icon: 'flask' },
  { key: 'conditions', label: 'Conditions', icon: 'clipboard' },
];

type RxFilter = 'ALL' | 'ACTIVE' | 'FULFILLED';
const RX_FILTERS: RxFilter[] = ['ALL', 'ACTIVE', 'FULFILLED'];
type ConditionFilter = 'ALL' | 'ACTIVE' | 'RESOLVED';
const CONDITION_FILTERS: ConditionFilter[] = ['ALL', 'ACTIVE', 'RESOLVED'];
type OrderOption = 'newest' | 'oldest' | 'nameAsc' | 'nameDesc';
const ORDER_OPTIONS: { key: OrderOption; label: string }[] = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'nameAsc', label: 'Name A–Z' },
  { key: 'nameDesc', label: 'Name Z–A' },
];

function orderEntries(entries: VaultDisplayEntry[], order: OrderOption): VaultDisplayEntry[] {
  return [...entries].sort((a, b) => {
    if (order === 'nameAsc') return a.title.localeCompare(b.title);
    if (order === 'nameDesc') return b.title.localeCompare(a.title);
    if (!a.sortKey) return b.sortKey ? 1 : 0;
    if (!b.sortKey) return -1;
    if (order === 'oldest') return a.sortKey.localeCompare(b.sortKey);
    return b.sortKey.localeCompare(a.sortKey);
  });
}

const CONDITION_GROUPS: { type: string; label: string; color: string; pillBg: string; pillText: string }[] = [
  { type: 'CHRONIC_CONDITION', label: 'Chronic conditions', color: BrandColors.plum, pillBg: theme.pillPlumBg, pillText: theme.pillPlumText },
  { type: 'ALLERGY', label: 'Allergies', color: BrandColors.coral, pillBg: theme.pillCoralBg, pillText: theme.pillCoralText },
  { type: 'LIFESTYLE', label: 'Lifestyle', color: BrandColors.honey, pillBg: theme.pillHoneyBg, pillText: theme.pillHoneyText },
];
const GROUP_PREVIEW_LIMIT = 5;
// Chronic conditions / Allergies / Lifestyle each paginate independently at
// this size. Change this one value to adjust all three at once.
const CONDITIONS_PAGE_SIZE = 4;

function ConditionGroupSection({
  group,
  entries,
  paginated = false,
}: {
  group: { type: string; label: string; color: string; pillBg: string; pillText: string };
  entries: VaultDisplayEntry[];
  /** Chronic conditions / Allergies / Lifestyle pass true. The catch-all
   *  "Other" bucket omits this and keeps its original preview + search
   *  behavior untouched. */
  paginated?: boolean;
}) {
  const router = useRouter();
  // Own page state per rendered section — since each group renders its own
  // instance of this component, Chronic conditions/Allergies/Lifestyle each
  // get an independent page number for free, with no shared/global state.
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(entries.length / CONDITIONS_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = paginated
    ? entries.slice((currentPage - 1) * CONDITIONS_PAGE_SIZE, currentPage * CONDITIONS_PAGE_SIZE)
    : entries.slice(0, GROUP_PREVIEW_LIMIT);

  return (
    <View style={styles.groupSection}>
      <View style={styles.groupHeader}>
        <View style={styles.groupHeaderLeft}>
          <View style={[styles.groupDot, { backgroundColor: group.color }]} />
          <Text style={styles.groupTitle}>{group.label}</Text>
        </View>
        <View style={[styles.groupCountPill, { backgroundColor: group.pillBg }]}>
          <Text style={[styles.groupCountText, { color: group.pillText }]}>{entries.length}</Text>
        </View>
      </View>

      {visible.length === 0 ? (
        <Text style={styles.groupEmptyText}>Nothing logged yet.</Text>
      ) : (
        <View style={styles.list}>
          {visible.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </View>
      )}

      {paginated ? (
        <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
      ) : entries.length > GROUP_PREVIEW_LIMIT ? (
        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={() => router.push({ pathname: '/vault/condition-search', params: { type: group.type } })}
          activeOpacity={0.7}
        >
          <Text style={[styles.seeAllText, { color: group.color }]}>
            See all {entries.length} — search for more
          </Text>
          <Ionicons name="search" size={13} color={group.color} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function VaultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { isLoading, isRefreshing, error, refresh, prescriptionEntries, labResultEntries, conditionEntries } =
    useVault();

  const [activeTab, setActiveTab] = useState<TabKey>('prescriptions');
  const [rxFilter, setRxFilter] = useState<RxFilter>('ALL');
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState<OrderOption>('newest');
  const [showOrderOptions, setShowOrderOptions] = useState(false);

  const visibleConditionEntries = useMemo(
    () => conditionEntries.filter((entry) => conditionFilter === 'ALL' || entry.conditionStatus === conditionFilter),
    [conditionEntries, conditionFilter]
  );

  const categoryEntries = useMemo(() => {
    if (activeTab === 'prescriptions') {
      const matching = prescriptionEntries.filter(
        (entry) => rxFilter === 'ALL' || entry.prescriptionStatus === rxFilter
      );
      return orderEntries(matching, orderBy);
    }
    return orderEntries(activeTab === 'labs' ? labResultEntries : visibleConditionEntries, orderBy);
  }, [activeTab, prescriptionEntries, labResultEntries, visibleConditionEntries, rxFilter, orderBy]);
  const searchResults = useMemo(() => {
    const queryTokens = searchQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (queryTokens.length === 0) return [];
    return categoryEntries.filter((entry) => {
      const kindLabel =
        entry.kind === 'LAB_RESULT'
          ? 'lab test result'
          : entry.kind === 'PRESCRIPTION'
            ? 'prescription medication'
            : 'health condition';
      const searchable = [
        entry.title,
        entry.subtitle,
        entry.dateLabel,
        kindLabel,
        entry.conditionType,
        entry.conditionStatus,
        entry.prescriptionStatus,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase();
      return queryTokens.every((token) => searchable.includes(token));
    });
  }, [categoryEntries, searchQuery]);

  // Lets Home's "jump to prescriptions" shortcut land on a specific tab in
  // one tap instead of landing on Vault and requiring a second tap.
  useEffect(() => {
    if (params.tab === 'prescriptions' || params.tab === 'labs' || params.tab === 'conditions') {
      setActiveTab(params.tab);
      setSearchQuery('');
    }
  }, [params.tab]);

  const conditionsByGroup = useMemo(() => {
    const map = new Map<string, VaultDisplayEntry[]>();
    for (const group of CONDITION_GROUPS) map.set(group.type, []);
    const other: VaultDisplayEntry[] = [];
    for (const entry of orderEntries(visibleConditionEntries, orderBy)) {
      const t = entry.conditionType ?? '';
      if (map.has(t)) {
        map.get(t)!.push(entry);
      } else {
        other.push(entry);
      }
    }
    return { map, other };
  }, [visibleConditionEntries, orderBy]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} />}
        stickyHeaderIndices={[1]}
      >
        <View style={styles.header}>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Health Vault</Text>
            <Text style={styles.headerSubtitle}>Every prescription, result, and condition, all in one place.</Text>
          </View>
        </View>

        <View style={styles.tabStrip}>
          <View style={styles.tabStripRow}>
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => {
                    setActiveTab(tab.key);
                    setSearchQuery('');
                  }}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                  activeOpacity={0.8}
                >
                  <Ionicons name={tab.icon} size={15} color={active ? theme.onTint : theme.textSecondary} />
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.searchControlsRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${activeTab === 'labs' ? 'test results' : activeTab}`}
              placeholderTextColor={theme.textTertiary}
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel={`Search ${TABS.find((tab) => tab.key === activeTab)?.label ?? 'vault'}`}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={10} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
              </Pressable>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.orderButton}
            onPress={() => setShowOrderOptions((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`Order by ${ORDER_OPTIONS.find((option) => option.key === orderBy)?.label}`}
          >
            <Ionicons name="swap-vertical" size={17} color={theme.tintStrong} />
            <View>
              <Text style={styles.orderButtonLabel}>Order by</Text>
              <Text style={styles.orderButtonValue}>{ORDER_OPTIONS.find((option) => option.key === orderBy)?.label}</Text>
            </View>
          </TouchableOpacity>
        </View>
        {showOrderOptions ? (
          <View style={styles.orderMenu}>
            {ORDER_OPTIONS.map((option) => {
              const selected = orderBy === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => {
                    setOrderBy(option.key);
                    setShowOrderOptions(false);
                  }}
                  style={[styles.orderOption, selected && styles.orderOptionSelected]}
                >
                  <Text style={[styles.orderOptionText, selected && styles.orderOptionTextSelected]}>{option.label}</Text>
                  {selected ? <Ionicons name="checkmark" size={15} color={theme.tintStrong} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={theme.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={theme.tintStrong} style={{ marginTop: 40 }} />
        ) : searchQuery.trim() ? (
          <>
            <Text style={styles.searchResultsTitle}>
              {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} in {TABS.find((tab) => tab.key === activeTab)?.label}
            </Text>
            {searchResults.length === 0 ? (
              <EmptyState
                icon="search"
                title="No matching records"
                description="Try another word in this section."
              />
            ) : (
              <View style={styles.list}>
                {searchResults.map((entry) => (
                  <EntryCard key={`${entry.kind}-${entry.id}`} entry={entry} />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {activeTab === 'prescriptions' && (
              <>
                <View style={styles.prescriptionControlsRow}>
                  <View style={styles.filterRow}>
                    {RX_FILTERS.map((f) => {
                      const active = rxFilter === f;
                      return (
                        <TouchableOpacity
                          key={f}
                          onPress={() => setRxFilter(f)}
                          style={[styles.filterPill, active && styles.filterPillActive]}
                        >
                          <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                            {f.charAt(0) + f.slice(1).toLowerCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={styles.prescriptionAddButtonRow}>
                    <Button label="Add prescription" icon="add" size="compact" onPress={() => router.push('/vault/add-prescription')} />
                  </View>
                </View>
                {categoryEntries.length === 0 ? (
                  <EmptyState
                    icon="medical"
                    title="No prescriptions here"
                    description="Medications your doctor prescribes, or that you add yourself, will show up here."
                  />
                ) : (
                  <View style={styles.list}>
                    {categoryEntries.map((entry) => (
                      <EntryCard key={entry.id} entry={entry} />
                    ))}
                  </View>
                )}
              </>
            )}

            {activeTab === 'labs' && (
              <>
                <View style={[styles.addButtonRow, styles.labAddButtonRow]}>
                  <Button label="Add test result" icon="add" size="compact" onPress={() => router.push('/vault/add-lab-result')} />
                </View>
                {categoryEntries.length === 0 ? (
                  <EmptyState
                    icon="flask"
                    title="No test results yet"
                    description="Lab results from your doctor, or ones you add yourself, will show up here."
                  />
                ) : (
                  <View style={styles.list}>
                    {categoryEntries.map((entry) => (
                      <EntryCard key={entry.id} entry={entry} />
                    ))}
                  </View>
                )}
              </>
            )}

            {activeTab === 'conditions' && (
              <>
                <View style={styles.conditionControlsRow}>
                  <View style={styles.conditionFilterSection}>
                    <View style={styles.conditionFilterRow}>
                      {CONDITION_FILTERS.map((filter) => {
                        const active = conditionFilter === filter;
                        return (
                          <TouchableOpacity
                            key={filter}
                            onPress={() => setConditionFilter(filter)}
                            style={[styles.filterPill, styles.conditionFilterPill, active && styles.filterPillActive]}
                          >
                            <Text style={[styles.filterLabel, styles.conditionFilterText, active && styles.filterLabelActive]}>
                              {filter.charAt(0) + filter.slice(1).toLowerCase()}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View style={styles.conditionAddButtonWrap}>
                    <Button
                      label="Add condition"
                      icon="add"
                      size="compact"
                      onPress={() => router.push('/vault/add-condition')}
                      fullWidth
                    />
                  </View>
                </View>
                {CONDITION_GROUPS.map((group) => (
                  <ConditionGroupSection
                    key={group.type}
                    group={group}
                    entries={conditionsByGroup.map.get(group.type) ?? []}
                    paginated
                  />
                ))}
                {conditionsByGroup.other.length > 0 ? (
                  <ConditionGroupSection
                    group={{
                      type: 'OTHER',
                      label: 'Other',
                      color: BrandColors.clay,
                      pillBg: theme.pillClayBg,
                      pillText: theme.pillClayText,
                    }}
                    entries={conditionsByGroup.other}
                  />
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14, marginHorizontal: -20 },
  // Green card treatment reused from Home's greeting card 
  headerCard: {
    backgroundColor: theme.tintStrong,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitle: { fontSize: 24, fontFamily: Fonts.display, fontWeight: '800', color: '#FFFDF7' },
  headerSubtitle: { fontSize: 13, fontFamily: Fonts.sans.regular, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  // Stays pinned while the large title card scrolls away to free screen space.
  tabStrip: {
    flexGrow: 0,
    marginHorizontal: -20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: theme.background,
    zIndex: 1,
  },
  tabStripRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: theme.surfaceMuted,
  },
  tabPillActive: { backgroundColor: theme.tintStrong },
  tabLabel: { fontSize: 13, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.textSecondary },
  tabLabelActive: { color: theme.onTint },
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 40, maxWidth: 600, alignSelf: 'center', width: '100%' },
  searchControlsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: Spacing.four },
  searchBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: theme.backgroundElement,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 13, fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.text },
  searchResultsTitle: { fontSize: 14, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.textSecondary, marginBottom: Spacing.two },
  orderButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.backgroundElement,
  },
  orderButtonLabel: { fontSize: 10, fontFamily: Fonts.sans.medium, color: theme.textTertiary },
  orderButtonValue: { fontSize: 11, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.tintStrong },
  orderMenu: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: -8, marginBottom: Spacing.four },
  orderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.surfaceMuted,
  },
  orderOptionSelected: { backgroundColor: theme.pillGreenBg },
  orderOptionText: { fontSize: 11, fontFamily: Fonts.sans.medium, color: theme.textSecondary },
  orderOptionTextSelected: { fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.tintStrong },
  list: { gap: Spacing.two },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: Fonts.sans.medium, color: theme.danger },
  addButtonRow: { marginBottom: Spacing.three, alignItems: 'flex-end' },
  labAddButtonRow: { alignItems: 'center' },
  prescriptionControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.three,
  },
  prescriptionAddButtonRow: { alignItems: 'flex-end' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionControlsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.three,
  },
  conditionFilterSection: { flexShrink: 1, minWidth: 0 },
  conditionFilterRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 4 },
  conditionFilterPill: { paddingHorizontal: 6 },
  conditionFilterText: { fontSize: 11 },
  conditionAddButtonWrap: { minWidth: 156 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.surfaceMuted },
  filterPillActive: { backgroundColor: theme.pillGreenBg },
  filterLabel: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.textSecondary },
  filterLabelActive: { color: theme.pillGreenText },
  groupSection: { marginBottom: Spacing.five },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupTitle: { fontSize: 15, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  groupCountPill: { minWidth: 24, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  groupCountText: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  groupEmptyText: { fontSize: 13, fontFamily: Fonts.sans.regular, color: theme.textTertiary, paddingVertical: 8 },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two, paddingVertical: 4 },
  seeAllText: { fontSize: 13, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
});
