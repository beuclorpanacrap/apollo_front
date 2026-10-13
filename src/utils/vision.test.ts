import { describe, expect, it } from '@jest/globals';

import {
  buildVisionRequest,
  emptyVisionValues,
  formatEyeCorrection,
  formatPower,
  formatSphere,
  isVisionExpired,
  summarizeVision,
  validateVisionForm,
  type VisionFormValues,
} from './vision';

const form = (values: VisionFormValues): VisionFormValues => ({ ...emptyVisionValues(), ...values });

describe('formatting', () => {
  it('always writes the sign and two decimals', () => {
    expect(formatPower(0.5)).toBe('+0.50');
    expect(formatPower(-2.25)).toBe('-2.25');
    expect(formatPower(0)).toBe('0.00');
    expect(formatPower(undefined)).toBe('—');
  });

  it('calls a zero sphere plano', () => {
    expect(formatSphere(0)).toBe('Plano');
    expect(formatSphere(-1)).toBe('-1.00');
  });

  it('writes an eye the way optical prescriptions read', () => {
    expect(formatEyeCorrection({ sphere: -2.5, cylinder: -0.75, axis: 180 })).toBe('-2.50 / -0.75 × 180°');
    expect(formatEyeCorrection({ sphere: 0.25 })).toBe('+0.25');
    expect(formatEyeCorrection({ sphere: 0, cylinder: -1, axis: 90 })).toBe('Plano / -1.00 × 90°');
    expect(formatEyeCorrection({})).toBe('');
  });

  it('summarises both eyes and a shared add on one line', () => {
    expect(
      summarizeVision({
        rightEye: { sphere: -2.5, cylinder: -0.75, axis: 180, add: 1.5 },
        leftEye: { sphere: -1.75, add: 1.5 },
      }),
    ).toBe('OD -2.50 / -0.75 × 180° · OS -1.75 · Add +1.50');
  });

  it('names each eye when the adds differ, and skips an eye with no correction', () => {
    expect(summarizeVision({ rightEye: { sphere: 1, add: 1.5 }, leftEye: { sphere: 1, add: 1.75 } })).toBe(
      'OD +1.00 · OS +1.00 · Add OD +1.50, OS +1.75',
    );
    expect(summarizeVision({ rightEye: { sphere: -1 }, leftEye: {} })).toBe('OD -1.00');
  });
});

describe('validateVisionForm', () => {
  it('needs at least one eye', () => {
    expect(validateVisionForm(emptyVisionValues()).rightSphere).toMatch(/at least one eye/);
  });

  it('accepts a plain single-vision prescription, including a leading + and comma decimals', () => {
    expect(validateVisionForm(form({ rightSphere: '+0,50', leftSphere: '-2.5' }))).toEqual({});
  });

  it('accepts one eye only', () => {
    expect(validateVisionForm(form({ leftSphere: '-1.00' }))).toEqual({});
  });

  it('asks for the sphere when only other values are given (0 means plano)', () => {
    expect(validateVisionForm(form({ rightCylinder: '-1', rightAxis: '90' })).rightSphere).toMatch(/0 for plano/);
    expect(validateVisionForm(form({ rightSphere: '0', rightCylinder: '-1', rightAxis: '90' }))).toEqual({});
  });

  it('rejects values that are not on a quarter-diopter step', () => {
    expect(validateVisionForm(form({ rightSphere: '-2.3' })).rightSphere).toMatch(/0\.25/);
    expect(validateVisionForm(form({ rightSphere: '-2.25' }))).toEqual({});
  });

  it('rejects implausible and non-numeric values', () => {
    expect(validateVisionForm(form({ rightSphere: '-25' })).rightSphere).toMatch(/between/);
    expect(validateVisionForm(form({ rightSphere: 'minus two' })).rightSphere).toMatch(/number/);
    expect(validateVisionForm(form({ rightSphere: '-1', rightAdd: '0' })).rightAdd).toMatch(/between/);
  });

  it('ties the axis to the cylinder', () => {
    expect(validateVisionForm(form({ rightSphere: '-1', rightCylinder: '-0.75' })).rightAxis).toMatch(/axis/);
    expect(validateVisionForm(form({ rightSphere: '-1', rightAxis: '90' })).rightAxis).toMatch(/only applies/);
    expect(validateVisionForm(form({ rightSphere: '-1', rightCylinder: '-0.75', rightAxis: '181' })).rightAxis).toMatch(/0 to 180/);
    expect(validateVisionForm(form({ rightSphere: '-1', rightCylinder: '-0.75', rightAxis: '12.5' })).rightAxis).toMatch(/0 to 180/);
    expect(validateVisionForm(form({ rightSphere: '-1', rightCylinder: '-0.75', rightAxis: '180' }))).toEqual({});
  });

  it('checks the pupillary distance when given, and leaves it optional', () => {
    expect(validateVisionForm(form({ rightSphere: '-1', pd: '63' }))).toEqual({});
    expect(validateVisionForm(form({ rightSphere: '-1', pd: '6' })).pd).toMatch(/between/);
    expect(validateVisionForm(form({ rightSphere: '-1', pd: 'wide' })).pd).toMatch(/millimetres/);
  });
});

describe('buildVisionRequest', () => {
  it('builds numbers from what was typed and leaves unset values out', () => {
    const body = buildVisionRequest(
      'patient-1',
      form({
        rightSphere: '-2,5',
        rightCylinder: '-0.75',
        rightAxis: '180',
        leftSphere: '+0.25',
        pd: '63',
        notes: '  Reading glasses too  ',
      }),
    );
    expect(body).toEqual({
      patientId: 'patient-1',
      rightEye: { sphere: -2.5, cylinder: -0.75, axis: 180 },
      leftEye: { sphere: 0.25 },
      pupillaryDistanceMm: 63,
      notes: 'Reading glasses too',
    });
  });

  it('drops a zero cylinder together with its axis, and keeps plano as 0', () => {
    const body = buildVisionRequest('p', form({ rightSphere: '0', rightCylinder: '0', rightAxis: '90' }));
    expect(body.rightEye).toEqual({ sphere: 0 });
  });

  it('keeps an expiry valid through the end of that local day', () => {
    const body = buildVisionRequest('p', form({ rightSphere: '-1', expiresAt: '2027-10-13' }));
    const expires = new Date(body.expiresAt!);
    expect(expires.getFullYear()).toBe(2027);
    expect(expires.getMonth()).toBe(9);
    expect(expires.getDate()).toBe(13);
    expect(expires.getHours()).toBe(23);
  });

  it('carries the encounter when there is one', () => {
    expect(buildVisionRequest('p', form({ rightSphere: '-1' }), { encounterId: 'enc-1' }).encounterId).toBe('enc-1');
  });
});

describe('isVisionExpired', () => {
  const now = new Date(2026, 9, 13, 12, 0, 0);

  it('is expired only when an expiry exists and has passed', () => {
    expect(isVisionExpired({ expiresAt: new Date(2026, 9, 12).toISOString() }, now)).toBe(true);
    expect(isVisionExpired({ expiresAt: new Date(2027, 9, 12).toISOString() }, now)).toBe(false);
    expect(isVisionExpired({}, now)).toBe(false);
  });
});
