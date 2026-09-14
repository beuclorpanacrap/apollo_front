import React, { useState } from 'react';
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
          <Text style={styles.title}>Documentation & Guide</Text>
          <Text style={styles.subtitle}>Learn about Apollo vault architecture, data privacy, and support.</Text>
        </View>

        {/* Onboarding Guide: How Apollo Works */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="compass-outline" size={20} color="#4CAF7D" />
            <Text style={styles.cardTitle}>How Apollo Works</Text>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Patient-Owned Vault</Text>
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
              <Text style={styles.stepTitle}>Secure PIN Handshake</Text>
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
              <Text style={styles.stepTitle}>Immutable Encounter Logging</Text>
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
            <Ionicons name="help-circle-outline" size={20} color="#4CAF7D" />
            <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
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
                      color="#666"
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
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#4CAF7D" />
            <Text style={styles.cardTitle}>Contact Support & Feedback</Text>
          </View>
          <Text style={styles.supportDesc}>
            Need assistance or discovered an issue? Submit a ticket directly to the Apollo platform team.
          </Text>

          {submitted ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#2E7D51" />
              <Text style={styles.successText}>Ticket submitted successfully (Demo Mode)!</Text>
            </View>
          ) : (
            <View style={styles.supportForm}>
              <Text style={styles.formLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Vault Sync Question"
                value={ticketSubject}
                onChangeText={setTicketSubject}
              />

              <Text style={styles.formLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your question or feedback..."
                multiline
                numberOfLines={3}
                value={ticketMessage}
                onChangeText={setTicketMessage}
              />

              <TouchableOpacity style={styles.submitBtn} onPress={handleSupportSubmit}>
                <Ionicons name="paper-plane-outline" size={16} color="#fff" />
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, maxWidth: 640, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { fontSize: 12, fontWeight: '700', color: '#2E7D51' },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#222' },
  stepDesc: { fontSize: 12, color: '#666', marginTop: 2, lineHeight: 16 },
  faqList: { gap: 8 },
  faqItem: { borderBottomWidth: 1, borderBottomColor: '#F4F4F4', paddingVertical: 8 },
  faqQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1, paddingRight: 8 },
  faqAnswer: { fontSize: 12, color: '#666', marginTop: 6, lineHeight: 17 },
  supportDesc: { fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 17 },
  supportForm: { gap: 10 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  textArea: { height: 70, textAlignVertical: 'top' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4CAF7D',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF7EF',
    padding: 12,
    borderRadius: 8,
  },
  successText: { fontSize: 13, color: '#2E7D51', fontWeight: '600' },
});
