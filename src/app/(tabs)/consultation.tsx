import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { vaultApi, AccessGrantResponse } from '@/api/vault.api';
import { useAuth } from '@/context/auth-context';

export default function ConsultationScreen() {
  const { user } = useAuth();
  const [grant, setGrant] = useState<AccessGrantResponse | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  const formatPin = (code?: string) => {
    if (!code) return '';
    if (code.length === 6) {
      return `${code.slice(0, 3)} ${code.slice(3)}`;
    }
    return code;
  };

  const calculateRemainingSeconds = (expiresAtStr: string): number => {
    const expiresAt = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diff = Math.floor((expiresAt - now) / 1000);
    return Math.max(0, diff);
  };

  const startTimer = (expiresAtStr: string) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const initial = calculateRemainingSeconds(expiresAtStr);
    setRemainingSeconds(initial);

    timerRef.current = setInterval(() => {
      const remaining = calculateRemainingSeconds(expiresAtStr);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleGeneratePin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setCopied(false);
      const res = await vaultApi.generateAccessGrant();
      setGrant(res);
      if (res.expiresAt) {
        startTimer(res.expiresAt);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPin = async () => {
    if (!grant?.accessCode) return;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(grant.accessCode);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = 15 * 60; // 15 minutes
  const progressRatio = Math.max(0, Math.min(1, remainingSeconds / totalDuration));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Doctor Consultation</Text>
          <Text style={styles.headerSubtitle}>
            Generate a single-use authorization PIN to grant your attending doctor 24-hour consultation access.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#D32F2F" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* 2FA/OTP Authenticator Card */}
        <View style={styles.card}>
          <View style={styles.cardBadgeRow}>
            <View style={styles.liveIndicator}>
              <View style={[styles.dot, grant && remainingSeconds > 0 ? styles.dotActive : styles.dotInactive]} />
              <Text style={styles.liveText}>
                {grant && remainingSeconds > 0 ? 'ACTIVE GRANT' : 'NO ACTIVE SESSION'}
              </Text>
            </View>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF7D" />
          </View>

          {grant && remainingSeconds > 0 ? (
            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>ONE-TIME CONSULTATION PIN</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={handleCopyPin} style={styles.pinWrapper}>
                <Text style={styles.pinDigits}>{formatPin(grant.accessCode)}</Text>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={20}
                  color={copied ? '#4CAF7D' : '#888'}
                  style={styles.copyIcon}
                />
              </TouchableOpacity>
              {copied && <Text style={styles.copiedHint}>Copied to clipboard!</Text>}

              {/* Progress Bar & Countdown Clock */}
              <View style={styles.timerContainer}>
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressRatio * 100}%` },
                      progressRatio < 0.2 ? { backgroundColor: '#E53935' } : undefined,
                    ]}
                  />
                </View>
                <View style={styles.timerRow}>
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={progressRatio < 0.2 ? '#E53935' : '#555'}
                  />
                  <Text
                    style={[
                      styles.timerText,
                      progressRatio < 0.2 ? { color: '#E53935', fontWeight: '700' } : undefined,
                    ]}
                  >
                    Expires in {timeFormatted}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={handleGeneratePin}
                disabled={isLoading}
              >
                <Ionicons name="refresh-outline" size={18} color="#4CAF7D" />
                <Text style={styles.refreshText}>Generate New PIN</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.shieldIconWrapper}>
                <Ionicons name="key-outline" size={42} color="#4CAF7D" />
              </View>
              <Text style={styles.emptyTitle}>Ready for Doctor Check-in</Text>
              <Text style={styles.emptyDescription}>
                Present this single-use code to your clinician or lab technician at the clinic to unlock your medical vault.
              </Text>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGeneratePin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="lock-open-outline" size={18} color="#fff" />
                    <Text style={styles.generateButtonText}>Generate Access PIN</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Security & Vault Handshake Explainer */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How this consultation code works</Text>
          <View style={styles.infoRow}>
            <Ionicons name="lock-closed-outline" size={18} color="#4CAF7D" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>15-Minute Expiration:</Text> The PIN must be entered by your doctor within 15 minutes.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={18} color="#4CAF7D" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>24-Hour Scoped Session:</Text> Once verified, the doctor receives temporary 24-hour append access to write clinical notes and test results.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="finger-print-outline" size={18} color="#4CAF7D" />
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Single-Use & Immutable:</Text> PINs are consumed immediately upon verification and cannot be reused.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxWidth: 540,
    alignSelf: 'center',
    width: '100%',
  },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 6, lineHeight: 18 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: { color: '#D32F2F', fontSize: 13, flex: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 20,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: '#4CAF7D' },
  dotInactive: { backgroundColor: '#9E9E9E' },
  liveText: { fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 0.5 },
  pinSection: { alignItems: 'center', marginVertical: 12 },
  pinLabel: { fontSize: 11, fontWeight: '600', color: '#888', letterSpacing: 1, marginBottom: 8 },
  pinWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3FBF6',
    borderWidth: 2,
    borderColor: '#4CAF7D',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 16,
    gap: 12,
  },
  pinDigits: {
    fontSize: 38,
    fontWeight: '800',
    color: '#1B5E20',
    letterSpacing: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyIcon: { marginLeft: 4 },
  copiedHint: { fontSize: 12, color: '#4CAF7D', marginTop: 6, fontWeight: '500' },
  timerContainer: { width: '100%', marginTop: 24, alignItems: 'center' },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#EAEAEA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF7D',
    borderRadius: 3,
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  timerText: { fontSize: 14, color: '#444', fontWeight: '600' },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF7D',
  },
  refreshText: { color: '#4CAF7D', fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 16 },
  shieldIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EAF7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  emptyDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF7D',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  generateButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#222', marginBottom: 14 },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  infoText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 18 },
  infoBold: { fontWeight: '700', color: '#222' },
});
