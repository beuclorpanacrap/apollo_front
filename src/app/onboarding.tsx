import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { vaultApi, BaselineConditionItem } from '@/api/vault.api';
import { Colors, Fonts, AppTheme } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type GenderOption = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

const GENDER_OPTIONS: { label: string; value: GenderOption }[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
  { label: 'Prefer not to say', value: 'PREFER_NOT_TO_SAY' },
];

const DEFAULT_ALLERGIES = ['Penicillin', 'Latex', 'Peanuts', 'Sulfa Drugs', 'No Known Allergies'];
const DEFAULT_CONDITIONS = ['Asthma', 'Hypertension', 'Type 2 Diabetes', 'None'];
const TOBACCO_OPTIONS = ['Non-Smoker', 'Smoker'];
const ALCOHOL_OPTIONS = ['Non-Drinker', 'Occasional / Social'];
const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasExistingBaseline = !!user?.gender;

  // Biometrics State
  const [selectedGender, setSelectedGender] = useState<GenderOption | null>(null);
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [bloodType, setBloodType] = useState<string>(user?.bloodType || '');

  // Allergies State
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergyInput, setCustomAllergyInput] = useState<string>('');

  // Chronic Conditions State
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [customConditionInput, setCustomConditionInput] = useState<string>('');

  // Lifestyle State
  const [selectedTobacco, setSelectedTobacco] = useState<string | null>(null);
  const [selectedAlcohol, setSelectedAlcohol] = useState<string | null>(null);

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill existing data if returning to update baseline
  useEffect(() => {
    if (user?.gender) {
      setSelectedGender(user.gender as GenderOption);
    }
    if (user?.heightCm) {
      setHeightCm(String(user.heightCm));
    }
    if (user?.weightKg) {
      setWeightKg(String(user.weightKg));
    }
    if (user?.bloodType) {
      setBloodType(user.bloodType);
    }

    const loadExistingConditions = async () => {
      try {
        const existing = await vaultApi.getConditions();
        const allergies: string[] = [];
        const conditions: string[] = [];
        for (const item of existing) {
          if (item.sourceType === 'PATIENT_DECLARED') {
            if (item.type === 'ALLERGY' && item.title) {
              allergies.push(item.title);
            } else if (item.type === 'CHRONIC_CONDITION' && item.title) {
              conditions.push(item.title);
            } else if (item.type === 'LIFESTYLE' && item.title) {
              if (item.title.startsWith('Tobacco: ')) {
                setSelectedTobacco(item.title.replace('Tobacco: ', ''));
              } else if (item.title.startsWith('Alcohol: ')) {
                setSelectedAlcohol(item.title.replace('Alcohol: ', ''));
              }
            }
          }
        }
        if (allergies.length > 0) setSelectedAllergies(allergies);
        if (conditions.length > 0) setSelectedConditions(conditions);
      } catch (e) {
        console.warn('[Onboarding] Could not pre-fetch existing conditions:', e);
      }
    };

    loadExistingConditions();
  }, [user]);

  // Allergies Handlers
  const handleToggleAllergy = (allergy: string) => {
    if (allergy === 'No Known Allergies') {
      if (selectedAllergies.includes('No Known Allergies')) {
        setSelectedAllergies([]);
      } else {
        setSelectedAllergies(['No Known Allergies']);
      }
      return;
    }

    let updated = selectedAllergies.filter((a) => a !== 'No Known Allergies');
    if (updated.includes(allergy)) {
      updated = updated.filter((a) => a !== allergy);
    } else {
      updated.push(allergy);
    }
    setSelectedAllergies(updated);
  };

  const handleAddCustomAllergy = () => {
    const trimmed = customAllergyInput.trim();
    if (!trimmed) return;
    if (!selectedAllergies.includes(trimmed)) {
      const updated = selectedAllergies.filter((a) => a !== 'No Known Allergies');
      updated.push(trimmed);
      setSelectedAllergies(updated);
    }
    setCustomAllergyInput('');
  };

  // Conditions Handlers
  const handleToggleCondition = (cond: string) => {
    if (cond === 'None') {
      if (selectedConditions.includes('None')) {
        setSelectedConditions([]);
      } else {
        setSelectedConditions(['None']);
      }
      return;
    }

    let updated = selectedConditions.filter((c) => c !== 'None');
    if (updated.includes(cond)) {
      updated = updated.filter((c) => c !== cond);
    } else {
      updated.push(cond);
    }
    setSelectedConditions(updated);
  };

  const handleAddCustomCondition = () => {
    const trimmed = customConditionInput.trim();
    if (!trimmed) return;
    if (!selectedConditions.includes(trimmed)) {
      const updated = selectedConditions.filter((c) => c !== 'None');
      updated.push(trimmed);
      setSelectedConditions(updated);
    }
    setCustomConditionInput('');
  };

  // Skip handler
  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  // Complete Setup Submit Handler
  const handleCompleteSetup = async () => {
    setErrorMessage(null);

    if (!selectedGender) {
      setErrorMessage('Please select your gender identity to establish your clinical baseline.');
      return;
    }

    const heightNum = heightCm.trim() ? parseFloat(heightCm.trim()) : undefined;
    const weightNum = weightKg.trim() ? parseFloat(weightKg.trim()) : undefined;

    if (heightNum !== undefined && (isNaN(heightNum) || heightNum <= 0 || heightNum > 300)) {
      setErrorMessage('Please enter a valid height in cm (e.g. 175).');
      return;
    }

    if (weightNum !== undefined && (isNaN(weightNum) || weightNum <= 0 || weightNum > 500)) {
      setErrorMessage('Please enter a valid weight in kg (e.g. 70).');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Consolidate Baseline Conditions (Allergies, Chronic Conditions, Lifestyle)
      const conditionItems: BaselineConditionItem[] = [];

      // Allergies
      for (const allergy of selectedAllergies) {
        if (allergy !== 'No Known Allergies' && allergy.trim()) {
          conditionItems.push({
            title: allergy.trim(),
            type: 'ALLERGY',
          });
        }
      }

      // Chronic Conditions
      for (const cond of selectedConditions) {
        if (cond !== 'None' && cond.trim()) {
          conditionItems.push({
            title: cond.trim(),
            type: 'CHRONIC_CONDITION',
          });
        }
      }

      // Lifestyle Habits
      if (selectedTobacco) {
        conditionItems.push({
          title: `Tobacco: ${selectedTobacco}`,
          type: 'LIFESTYLE',
        });
      }
      if (selectedAlcohol) {
        conditionItems.push({
          title: `Alcohol: ${selectedAlcohol}`,
          type: 'LIFESTYLE',
        });
      }

      // 2. Atomically Sync Baseline Conditions & Update Biometrics in parallel
      await Promise.all([
        vaultApi.updateProfile({
          gender: selectedGender,
          heightCm: heightNum,
          weightKg: weightNum,
          bloodType: bloodType.trim() ? bloodType.trim().toUpperCase() : undefined,
        }),
        vaultApi.syncBaselineConditions(conditionItems),
      ]);

      // 3. Refresh Auth Session User Cache
      await refreshUser();

      // 4. Navigate to Main Tabs
      router.replace('/(tabs)');
    } catch (err: any) {
      console.warn('[Onboarding] Error submitting baseline survey:', err);
      setErrorMessage(err.message || 'Failed to save baseline details. You can skip and complete later in your vault.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Row */}
        <View style={styles.topHeader}>
          <View style={styles.titleWrapper}>
            <Text style={styles.mainTitle}>
              {hasExistingBaseline ? 'Update your clinical baseline' : 'Set up your clinical baseline'}
            </Text>
            <Text style={styles.subtitle}>
              {hasExistingBaseline
                ? 'Refine your physiological markers, allergies, and lifestyle factors'
                : 'Essential health markers to give your care team accurate clinical context'}
            </Text>
          </View>
          {hasExistingBaseline ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back-outline" size={20} color={theme.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip for now</Text>
              <Ionicons name="arrow-forward" size={15} color={theme.tintStrong} />
            </TouchableOpacity>
          )}
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Section 1: Biometrics Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrapper}>
              <Ionicons name="body-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Biometrics</Text>
              <Text style={styles.cardSubtitle}>Core physiological markers for diagnostic context</Text>
            </View>
          </View>

          {/* Gender Selector (Mandatory) */}
          <Text style={styles.fieldLabel}>
            Gender <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.pillGrid}>
            {GENDER_OPTIONS.map((opt) => {
              const isSelected = selectedGender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => setSelectedGender(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Height & Weight Inputs */}
          <View style={styles.measurementsRow}>
            <View style={styles.measureCol}>
              <Text style={styles.fieldLabel}>Height (cm)</Text>
              <View style={styles.inputWithBadge}>
                <TextInput
                  style={styles.numericInput}
                  placeholder="e.g. 175"
                  placeholderTextColor={theme.textTertiary}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="decimal-pad"
                  editable={!isSubmitting}
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitText}>cm</Text>
                </View>
              </View>
            </View>

            <View style={styles.measureCol}>
              <Text style={styles.fieldLabel}>Weight (kg)</Text>
              <View style={styles.inputWithBadge}>
                <TextInput
                  style={styles.numericInput}
                  placeholder="e.g. 70"
                  placeholderTextColor={theme.textTertiary}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                  editable={!isSubmitting}
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitText}>kg</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Blood Type Selector */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Blood Type</Text>
          <View style={styles.bloodTypeGrid}>
            {BLOOD_TYPE_OPTIONS.map((type) => {
              const isSelected = bloodType.trim().toUpperCase() === type.trim().toUpperCase();
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.bloodTypePill, isSelected && styles.bloodTypePillSelected]}
                  onPress={() => setBloodType(isSelected ? '' : type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.bloodTypePillText,
                      isSelected && styles.bloodTypePillTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Clinical Baseline Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrapper}>
              <Ionicons name="medkit-outline" size={20} color={theme.tintStrong} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Clinical Baseline</Text>
              <Text style={styles.cardSubtitle}>Foundational allergies and past health history</Text>
            </View>
          </View>

          {/* Sub-item: Allergies */}
          <Text style={styles.fieldLabel}>Allergies</Text>
          <View style={styles.chipRow}>
            {DEFAULT_ALLERGIES.map((allergy) => {
              const isSelected = selectedAllergies.includes(allergy);
              return (
                <TouchableOpacity
                  key={allergy}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => handleToggleAllergy(allergy)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={16}
                    color={isSelected ? theme.onTint : theme.textSecondary}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {allergy}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {selectedAllergies
              .filter((a) => !DEFAULT_ALLERGIES.includes(a))
              .map((custom) => (
                <TouchableOpacity
                  key={custom}
                  style={[styles.chip, styles.chipSelected]}
                  onPress={() => handleToggleAllergy(custom)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={16} color={theme.onTint} />
                  <Text style={[styles.chipText, styles.chipTextSelected]}>{custom}</Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Custom Allergy Input */}
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customTextInput}
              placeholder="Add other allergy (e.g. Shellfish)..."
              placeholderTextColor={theme.textTertiary}
              value={customAllergyInput}
              onChangeText={setCustomAllergyInput}
              onSubmitEditing={handleAddCustomAllergy}
              returnKeyType="done"
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.addCustomBtn}
              onPress={handleAddCustomAllergy}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={theme.tintStrong} />
            </TouchableOpacity>
          </View>

          {/* Sub-item: Chronic Conditions */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Chronic Conditions</Text>
          <View style={styles.chipRow}>
            {DEFAULT_CONDITIONS.map((cond) => {
              const isSelected = selectedConditions.includes(cond);
              return (
                <TouchableOpacity
                  key={cond}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => handleToggleCondition(cond)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={16}
                    color={isSelected ? theme.onTint : theme.textSecondary}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {cond}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {selectedConditions
              .filter((c) => !DEFAULT_CONDITIONS.includes(c))
              .map((custom) => (
                <TouchableOpacity
                  key={custom}
                  style={[styles.chip, styles.chipSelected]}
                  onPress={() => handleToggleCondition(custom)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={16} color={theme.onTint} />
                  <Text style={[styles.chipText, styles.chipTextSelected]}>{custom}</Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Custom Condition Input */}
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customTextInput}
              placeholder="Add other condition (e.g. Migraine)..."
              placeholderTextColor={theme.textTertiary}
              value={customConditionInput}
              onChangeText={setCustomConditionInput}
              onSubmitEditing={handleAddCustomCondition}
              returnKeyType="done"
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.addCustomBtn}
              onPress={handleAddCustomCondition}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={theme.tintStrong} />
            </TouchableOpacity>
          </View>

          {/* Sub-item: Lifestyle Habits */}
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Lifestyle Habits</Text>

          <Text style={styles.subFieldLabel}>Tobacco Use</Text>
          <View style={styles.chipRow}>
            {TOBACCO_OPTIONS.map((opt) => {
              const isSelected = selectedTobacco === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setSelectedTobacco(isSelected ? null : opt)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'radio-button-off-outline'}
                    size={16}
                    color={isSelected ? theme.onTint : theme.textSecondary}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subFieldLabel, { marginTop: 10 }]}>Alcohol Consumption</Text>
          <View style={styles.chipRow}>
            {ALCOHOL_OPTIONS.map((opt) => {
              const isSelected = selectedAlcohol === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setSelectedAlcohol(isSelected ? null : opt)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'radio-button-off-outline'}
                    size={16}
                    color={isSelected ? theme.onTint : theme.textSecondary}
                  />
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Footer Complete Setup CTA */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleCompleteSetup}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.onTint} />
          ) : (
            <View style={styles.submitRow}>
              <Text style={styles.submitText}>Complete Setup</Text>
              <Ionicons name="checkmark-circle-outline" size={20} color={theme.onTint} />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
      maxWidth: 540,
      alignSelf: 'center',
      width: '100%',
    },
    topHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    titleWrapper: {
      flex: 1,
      paddingRight: 12,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: theme.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
  mainTitle: {
    fontSize: 24,
    fontFamily: Fonts.sans.extraBold,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.sans.medium,
    fontWeight: '500',
    color: theme.textSecondary,
    marginTop: 3,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme.pillGreenBg,
  },
  skipText: {
    fontSize: 13,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.pillGreenText,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.dangerBg,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: theme.danger,
    fontSize: 13,
    fontFamily: Fonts.sans.regular,
    flex: 1,
    lineHeight: 18,
  },
  card: {
    backgroundColor: theme.backgroundElement,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(50, 122, 76, 0.08)',
      },
      default: {
        shadowColor: theme.tintStrong,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 12,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.pillGreenBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
    color: theme.text,
  },
  cardSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sans.regular,
    color: theme.textSecondary,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  subFieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6,
  },
  requiredStar: {
    color: theme.danger,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillSelected: {
    backgroundColor: theme.tint,
    borderColor: theme.tint,
  },
  pillText: {
    fontSize: 13,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  pillTextSelected: {
    color: theme.onTint,
  },
  measurementsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  measureCol: {
    flex: 1,
  },
  inputWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    backgroundColor: theme.surfaceMuted,
    overflow: 'hidden',
  },
  numericInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.sans.regular,
    color: theme.text,
  },
  unitBadge: {
    backgroundColor: theme.border,
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  unitText: {
    fontSize: 12,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
    color: theme.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chipSelected: {
    backgroundColor: theme.tint,
    borderColor: theme.tint,
  },
  chipText: {
    fontSize: 13,
    fontFamily: Fonts.sans.medium,
    fontWeight: '500',
    color: theme.text,
  },
  chipTextSelected: {
    color: theme.onTint,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  customTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: Fonts.sans.regular,
    color: theme.text,
    backgroundColor: theme.surfaceMuted,
  },
  addCustomBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.pillGreenBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: theme.tint,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(50, 122, 76, 0.25)',
      },
      default: {
        shadowColor: theme.tintStrong,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    color: theme.onTint,
    fontSize: 16,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
  },
  bloodTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: theme.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.border,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodTypePillSelected: {
    backgroundColor: theme.tint,
    borderColor: theme.tint,
  },
  bloodTypePillText: {
    fontSize: 13,
    fontFamily: Fonts.sans.semiBold,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  bloodTypePillTextSelected: {
    color: theme.onTint,
    fontFamily: Fonts.sans.bold,
    fontWeight: '700',
  },
});
