import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppTheme, Colors, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: '1',
    question: 'How does Apollo protect my health data?',
    answer:
      'All records are linked to your encrypted vault profile. Doctors cannot access your data unless you explicitly generate a temporary 6-digit PIN in person or during a telemedicine session.',
  },
  {
    id: '2',
    question: 'What happens when a doctor unlocks my vault?',
    answer:
      'The single-use PIN is consumed immediately and opens a strictly scoped 24-hour consultation session. Once the 24 hours lapse, all access automatically revokes.',
  },
  {
    id: '3',
    question: 'Can doctors delete or alter past notes?',
    answer:
      'No. In Apollo, clinical encounters are append-only and cryptographically immutable. Neither patients nor doctors can modify past consultations once saved.',
  },
  {
    id: '4',
    question: 'Who can view my laboratory test results?',
    answer:
      'Only you and authorized clinicians (GPs, Specialists, and certified Lab Technicians) with an active consultation session.',
  },
];

export default function DocumentationScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<string | null>('1');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleSupportSubmit = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      return;
    }
    // Simulated ticket submission for MVP demo
    setSubmitted(true);
    setTimeout(() => {
      setTicketSubject('');
      setTicketMessage('');
      setSubmitted(false);
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Documentation & guide</Text>
          <Text style={styles.subtitle}>Learn about Apollo vault architecture, data privacy, and support.</Text>
        </View>

        {/* Medical Baseline Quick Action Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="clipboard-outline" size={20} color={theme.tintStrong} />
            <Text style={styles.cardTitle}>Medical profile & baseline</Text>
          </View>
          <Text style={styles.supportDesc}>
            Review or update your biometrics, diagnosed chronic conditions, known allergies, and lifestyle factors
            whenever needed.
          </Text>
          <TouchableOpacity style={styles.baselineActionBtn} onPress={() => router.push('/onboarding')} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={18} color={theme.onTint} />
            <Text style={styles.baselineActionBtnText}>Update clinical baseline</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.onTint} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* Onboarding Guide: How Apollo Works */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="compass" size={20} color={theme.tintStrong} />
            <Text style={styles.cardTitle}>How Apollo works</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Your vault, your data</Text>
              <Text style={styles.stepDesc}>
                You retain complete sovereign ownership over your diagnoses, allergies, and lab results.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Secure PIN handshake</Text>
              <Text style={styles.stepDesc}>
                Generate a 15-minute PIN from the Consultation tab to authorize your doctor at check-in.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Immutable encounter logging</Text>
              <Text style={styles.stepDesc}>
                Doctors log consultation notes and prescribe medications during the scoped 24h window.
              </Text>
            </View>
          </View>
          {/* TODO: Flesh out UI - Add interactive onboarding carousel or video walkthrough */}
        </View>

        {/* FAQ Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="help-circle" size={20} color={theme.tintStrong} />
            <Text style={styles.cardTitle}>Frequently asked questions</Text>
          </View>

          <View style={styles.faqList}>
            {FAQS.map((faq) => {
              const isOpen = expandedFaq === faq.id;
              return (
                <View key={faq.id} style={styles.faqItem}>
                  <TouchableOpacity style={styles.faqQuestionRow} onPress={() => toggleFaq(faq.id)}>
                    <Text style={styles.faqQuestion}>{faq.question}</Text>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                  {isOpen && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
                </View>
              );
            })}
          </View>
          {/* TODO: Flesh out UI - Add search input for documentation articles */}
        </View>

        {/* Contact Support Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="chatbox-ellipses" size={20} color={theme.tintStrong} />
            <Text style={styles.cardTitle}>Contact support & feedback</Text>
          </View>
          <Text style={styles.supportDesc}>
            Need assistance or discovered an issue? Submit a ticket directly to the Apollo platform team.
          </Text>

          {submitted ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color={theme.tintStrong} />
              <Text style={styles.successText}>Ticket submitted successfully (Demo Mode)!</Text>
            </View>
          ) : (
            <View style={styles.supportForm}>
              <Text style={styles.formLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Vault Sync Question"
                placeholderTextColor={theme.textTertiary}
                value={ticketSubject}
                onChangeText={setTicketSubject}
              />

              <Text style={styles.formLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your question or feedback..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={3}
                value={ticketMessage}
                onChangeText={setTicketMessage}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSupportSubmit}>
                <Ionicons name="paper-plane" size={16} color={theme.onTint} />
                <Text style={styles.submitBtnText}>Submit Ticket</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* TODO: Flesh out UI - Connect to real Zendesk/Hubspot or backend support webhook */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, maxWidth: 640, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  subtitle: { fontSize: 13, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.text },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.pillGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontFamily: Fonts.sans.bold, fontWeight: '700', color: theme.pillGreenText },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text },
  stepDesc: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginTop: 2, lineHeight: 16 },
  faqList: { gap: 8 },
  faqItem: { borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 8 },
  faqQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 13, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text, flex: 1, paddingRight: 8 },
  faqAnswer: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginTop: 6, lineHeight: 17 },
  supportDesc: { fontSize: 12, fontFamily: Fonts.sans.regular, color: theme.textSecondary, marginBottom: 14, lineHeight: 17 },
  supportForm: { gap: 10 },
  formLabel: { fontSize: 12, fontFamily: Fonts.sans.semiBold, fontWeight: '600', color: theme.text },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Fonts.sans.regular,
    color: theme.text,
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.tint,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  submitBtnText: { color: theme.onTint, fontSize: 13, fontFamily: Fonts.sans.semiBold, fontWeight: '600' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.pillGreenBg,
    padding: 12,
    borderRadius: 8,
  },
  successText: { fontSize: 13, fontFamily: Fonts.sans.semiBold, color: theme.pillGreenText, fontWeight: '600' },
  baselineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.tint,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  baselineActionBtnText: {
    color: theme.onTint,
    fontSize: 14,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
  },
});
