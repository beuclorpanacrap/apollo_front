import React, { useState, useEffect } from 'react';
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
        {/* Top Header Row with Skip */}
        <View style={styles.topHeader}>
          <View style={styles.titleWrapper}>
            <Text style={styles.mainTitle}>Welcome to Apollo</Text>
            <Text style={styles.subtitle}>Set up your clinical baseline</Text>
          </View>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip for now</Text>
            <Ionicons name="arrow-forward" size={15} color="#4CAF7D" />
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#D32F2F" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Section 1: Biometrics Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardIconWrapper}>
              <Ionicons name="body-outline" size={20} color="#4CAF7D" />
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
              <Text style={styles.fieldLabel}>Height</Text>
              <View style={styles.inputWithBadge}>
                <TextInput
                  style={styles.numericInput}
                  placeholder="e.g. 175"
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
              <Text style={styles.fieldLabel}>Weight</Text>
              <View style={styles.inputWithBadge}>
                <TextInput
                  style={styles.numericInput}
                  placeholder="e.g. 70"
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
              <Ionicons name="medkit-outline" size={20} color="#4CAF7D" />
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
                    color={isSelected ? '#FFFFFF' : '#4B5563'}
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
                  <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                  <Text style={[styles.chipText, styles.chipTextSelected]}>{custom}</Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Custom Allergy Input */}
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customTextInput}
              placeholder="Add other allergy (e.g. Shellfish)..."
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
              <Ionicons name="add" size={20} color="#4CAF7D" />
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
                    color={isSelected ? '#FFFFFF' : '#4B5563'}
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
                  <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                  <Text style={[styles.chipText, styles.chipTextSelected]}>{custom}</Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Custom Condition Input */}
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customTextInput}
              placeholder="Add other condition (e.g. Migraine)..."
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
              <Ionicons name="add" size={20} color="#4CAF7D" />
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
                    color={isSelected ? '#FFFFFF' : '#4B5563'}
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
                    color={isSelected ? '#FFFFFF' : '#4B5563'}
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
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.submitRow}>
              <Text style={styles.submitText}>Complete Setup</Text>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleWrapper: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 3,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EAF7EF',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D51',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
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
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  cardIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF7EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#DC2626',
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pillSelected: {
    backgroundColor: '#4CAF7D',
    borderColor: '#4CAF7D',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  pillTextSelected: {
    color: '#FFFFFF',
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
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
  },
  numericInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  unitBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 11,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#4CAF7D',
    borderColor: '#4CAF7D',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#FFFFFF',
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
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#F9FAFB',
  },
  addCustomBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EAF7EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF7D',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(76, 175, 125, 0.25)',
      },
      default: {
        shadowColor: '#4CAF7D',
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
    color: '#FFFFFF',
    fontSize: 16,
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
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodTypePillSelected: {
    backgroundColor: '#4CAF7D',
    borderColor: '#4CAF7D',
  },
  bloodTypePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  bloodTypePillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
