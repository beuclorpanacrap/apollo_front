import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { EmptyState } from '@/components/ui/empty-state';
import { EntryCard } from '@/components/vault/entry-card';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useVault } from '@/context/vault-context';
import { conditionToDisplayEntry, formatConditionType, sortByDateDesc } from '@/utils/vault-display';

const theme = Colors.light;

export default function ConditionSearchScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const { conditions } = useVault();
  const [query, setQuery] = useState('');

  const allOfType = useMemo(
    () => sortByDateDesc(conditions.filter((c) => c.type === type).map(conditionToDisplayEntry)),
    [conditions, type]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allOfType;
    return allOfType.filter((entry) => entry.title.toLowerCase().includes(q));
  }, [allOfType, query]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>All {formatConditionType(type).toLowerCase()}s</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={theme.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search…"
          placeholderTextColor={theme.textTertiary}
          style={styles.searchInput}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.length === 0 ? (
          <EmptyState icon="search" title="No matches" description="Try a different search term." />
        ) : (
          <View style={styles.list}>
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.backgroundElement,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: Fonts.sans.regular, color: theme.text },
  content: { padding: 20, paddingBottom: 40, maxWidth: 600, alignSelf: 'center', width: '100%' },
  list: { gap: Spacing.two },
});
