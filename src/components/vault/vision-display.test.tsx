import { describe, expect, it } from '@jest/globals';

import type { VisionPrescriptionResponse } from '@/api/vision.types';
import { BrandColors, Colors } from '@/constants/theme';
import {
  accentForKind,
  iconForKind,
  pillColorsForKind,
  visionToDisplayEntry,
} from '@/utils/vault-display';
import { formatEyeCorrection, isVisionExpired, summarizeVision } from '@/utils/vision';

describe('Vision Display & Vault Mapping', () => {
  const sampleRx: VisionPrescriptionResponse = {
    id: 'rx-vision-123',
    patientId: 'patient-456',
    doctorId: 'doctor-789',
    doctorName: 'Dr. Gregory House',
    issuedAt: '2026-10-10T12:00:00Z',
    expiresAt: '2028-10-10T12:00:00Z',
    pupillaryDistanceMm: 63,
    notes: 'Wear for reading and screen work.',
    rightEye: { sphere: -2.5, cylinder: -0.75, axis: 180, add: 1.5 },
    leftEye: { sphere: -1.75, add: 1.5 },
  };

  it('formats eye correction strings properly', () => {
    expect(formatEyeCorrection({ sphere: -2.5, cylinder: -0.75, axis: 180 })).toBe('-2.50 / -0.75 × 180°');
    expect(formatEyeCorrection({ sphere: 0 })).toBe('Plano');
    expect(formatEyeCorrection({ sphere: 1.25 })).toBe('+1.25');
    expect(formatEyeCorrection({})).toBe('');
  });

  it('summarizes prescription with OD, OS and shared Add', () => {
    const summary = summarizeVision(sampleRx);
    expect(summary).toBe('OD -2.50 / -0.75 × 180° · OS -1.75 · Add +1.50');
  });

  it('handles distinct Adds per eye in summary', () => {
    const rxDistinctAdd: VisionPrescriptionResponse = {
      rightEye: { sphere: 1.0, add: 1.5 },
      leftEye: { sphere: 1.0, add: 2.0 },
    };
    expect(summarizeVision(rxDistinctAdd)).toBe('OD +1.00 · OS +1.00 · Add OD +1.50, OS +2.00');
  });

  it('maps VisionPrescriptionResponse to VaultDisplayEntry correctly', () => {
    const entry = visionToDisplayEntry(sampleRx);
    expect(entry.id).toBe('rx-vision-123');
    expect(entry.kind).toBe('VISION');
    expect(entry.title).toBe('Glasses prescription');
    expect(entry.subtitle).toContain('OD -2.50 / -0.75 × 180°');
    expect(entry.subtitle).toContain('Dr. Gregory House');
    expect(entry.source).toBe('DOCTOR_VERIFIED');
    expect(entry.isEditable).toBe(false);
    expect(entry.isLocal).toBe(false);
    expect(entry.visionExpired).toBe(false);
    expect(entry.viewHref).toEqual({
      pathname: '/vault/view-vision-prescription',
      params: { id: 'rx-vision-123' },
    });
  });

  it('detects expired vision prescriptions correctly', () => {
    const expiredRx: VisionPrescriptionResponse = {
      ...sampleRx,
      expiresAt: '2020-01-01T00:00:00Z',
    };
    const entry = visionToDisplayEntry(expiredRx);
    expect(entry.visionExpired).toBe(true);
  });

  it('provides matching theme accent and icon for VISION kind', () => {
    expect(accentForKind('VISION', Colors.light)).toBe(BrandColors.iris);
    expect(iconForKind('VISION')).toBe('eye');
    const pillColors = pillColorsForKind('VISION', Colors.light);
    expect(pillColors.bg).toBe(Colors.light.pillIrisBg);
    expect(pillColors.fg).toBe(Colors.light.pillIrisText);
  });

  it('evaluates isVisionExpired relative to current time', () => {
    const fixedNow = new Date('2026-10-13T12:00:00Z');
    expect(isVisionExpired({ expiresAt: '2026-10-12T00:00:00Z' }, fixedNow)).toBe(true);
    expect(isVisionExpired({ expiresAt: '2026-10-14T00:00:00Z' }, fixedNow)).toBe(false);
    expect(isVisionExpired({}, fixedNow)).toBe(false);
  });
});
