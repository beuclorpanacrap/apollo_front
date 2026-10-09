import { useMemo } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PolicyContent } from '@/content/legal';
import { AppTheme, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PolicyModalProps = {
  content: PolicyContent | null;
  onClose: () => void;
};

/**
 * The Privacy / Terms modal, extracted from `settings.tsx` with zero visual or behavioral change
 * (same markup, same styles, same values). The clinician portal renders the same `PolicyContent`
 * through its own `Dialog` — see `components/portal/policy-dialog.tsx`.
 */
export function PolicyModal({ content, onClose }: PolicyModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={!!content} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.policyDialogCard}>
          <View style={styles.policyHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.policyTitle}>{content?.title}</Text>
              <Text style={styles.policySubtitle}>{content?.subtitle}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.policyCloseBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.policyScroll} showsVerticalScrollIndicator={false}>
            {content?.updated ? <Text style={[styles.policySubtitle, { marginBottom: 12 }]}>{content.updated}</Text> : null}
            {content?.sections.map((sec, idx) => (
              <View key={idx} style={styles.policySection}>
                <Text style={styles.policySectionHeading}>{sec.heading}</Text>
                <Text style={styles.policySectionBody}>{sec.body}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.policyDoneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.policyDoneBtnText}>Understood</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Values below are copied 1:1 from settings.tsx (including the overlay tint) so Settings looks identical.
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(30, 40, 30, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    policyDialogCard: {
      width: '100%',
      maxWidth: 500,
      maxHeight: '80%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.backgroundElement,
      padding: 22,
      ...Platform.select({
        web: {
          boxShadow: '0 4px 16px rgba(50, 122, 76, 0.16)',
        },
        default: {
          shadowColor: theme.tintStrong,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 16,
          elevation: 6,
        },
      }),
    },
    policyHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 14,
      marginBottom: 14,
    },
    policyTitle: {
      fontSize: 18,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.text,
    },
    policySubtitle: {
      fontSize: 12,
      fontFamily: Fonts.sans.regular,
      color: theme.textSecondary,
      marginTop: 2,
    },
    policyCloseBtn: {
      padding: 4,
      marginLeft: 8,
    },
    policyScroll: {
      marginBottom: 16,
    },
    policySection: {
      marginBottom: 14,
    },
    policySectionHeading: {
      fontSize: 14,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    policySectionBody: {
      fontSize: 13,
      fontFamily: Fonts.sans.regular,
      color: theme.textSecondary,
      lineHeight: 19,
    },
    policyDoneBtn: {
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      backgroundColor: theme.tintStrong,
    },
    policyDoneBtnText: {
      fontSize: 14,
      fontFamily: Fonts.sans.bold,
      fontWeight: '700',
      color: theme.onTint,
    },
  });
