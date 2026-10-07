import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react-native';

import NewLabResultScreen from './NewLabResultScreen';

// The first render in a run loads React Native cold, which can exceed Jest's 5 s default.
jest.setTimeout(30_000);

const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

describe('NewLabResultScreen', () => {
  // The screen logs the payload where your API call will go.
  const spyOnLog = () => jest.spyOn(console, 'log').mockImplementation(() => {});
  let log: ReturnType<typeof spyOnLog>;
  beforeEach(() => {
    log = spyOnLog();
  });
  afterEach(() => log.mockRestore());

  it('flags a low hemoglobin and shows the reference range for a woman', async () => {
    await render(<NewLabResultScreen />);
    await type('Hemoglobin', '118');

    expect(screen.getByText('↓ Low')).toBeTruthy();
    expect(screen.getByText('Reference: 120–155 g/L')).toBeTruthy();
  });

  it('uses the male range for a male patient', async () => {
    await render(<NewLabResultScreen patient={{ sex: 'male', ageYears: 34 }} />);
    await type('Hemoglobin', '125');
    expect(screen.getByText('↓ Low')).toBeTruthy(); // men: 130–175
    expect(screen.getByText('Reference: 130–175 g/L')).toBeTruthy();
  });

  it('has no sex selector', async () => {
    await render(<NewLabResultScreen />);
    expect(screen.queryByRole('radio', { name: 'Male' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Female' })).toBeNull();
  });

  it('defaults the date taken to today and includes it in the payload', async () => {
    await render(<NewLabResultScreen />);
    await type('Hemoglobin', '138');
    await fireEvent.press(screen.getByText('Save draft'));

    const payload = JSON.parse(String(log.mock.calls[0]?.[0]));
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(payload.takenOn).toBe(today);
  });

  it('has shortcuts for today, yesterday and a week ago', async () => {
    await render(<NewLabResultScreen />);
    await type('Hemoglobin', '138');
    const iso = (daysAgo: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    await fireEvent.press(screen.getByRole('radio', { name: 'Yesterday' }));
    expect(screen.getByRole('radio', { name: 'Yesterday' }).props.accessibilityState?.selected).toBe(true);
    await fireEvent.press(screen.getByText('Save draft'));
    expect(JSON.parse(String(log.mock.calls[0]?.[0])).takenOn).toBe(iso(1));

    await fireEvent.press(screen.getByRole('radio', { name: '1 week ago' }));
    await fireEvent.press(screen.getByText('Save draft'));
    expect(JSON.parse(String(log.mock.calls[1]?.[0])).takenOn).toBe(iso(7));
  });

  it('lets you pick another date with the calendar', async () => {
    await render(<NewLabResultScreen />);
    await type('Hemoglobin', '138');

    await fireEvent.press(screen.getByRole('button', { name: 'Date taken' }));
    await fireEvent.press(screen.getAllByText('1')[0]!); // the 1st of the current month
    await fireEvent.press(screen.getByText('Save draft'));

    const d = new Date();
    const firstOfMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    expect(JSON.parse(String(log.mock.calls[0]?.[0])).takenOn).toBe(firstOfMonth);
  });

  it('shows the critical banner for a critical value', async () => {
    await render(<NewLabResultScreen />);
    expect(screen.queryByText('Critical value: notify the ordering doctor')).toBeNull();

    await type('Hemoglobin', '65');
    expect(screen.getByText('↓↓ Critical low')).toBeTruthy();
    expect(screen.getByText('Critical value: notify the ordering doctor')).toBeTruthy();
  });

  it('accepts a decimal comma and rejects text', async () => {
    await render(<NewLabResultScreen />);

    await type('White blood cells', '6,1');
    expect(screen.getByText('Normal')).toBeTruthy();
    expect(screen.queryByText('Enter a number, e.g. 5.4')).toBeNull();

    await type('White blood cells', 'abc');
    expect(screen.getByText('Enter a number, e.g. 5.4')).toBeTruthy();
  });

  it('asks for required fields only when finalizing', async () => {
    await render(<NewLabResultScreen />);
    await type('Hemoglobin', '138');

    await fireEvent.press(screen.getByText('Save draft'));
    expect(screen.queryAllByText('Required')).toHaveLength(0);

    await fireEvent.press(screen.getByText('Finalize result'));
    expect(screen.getAllByText('Required')).toHaveLength(3); // red cells, white cells, platelets
  });

  it('builds the payload for the backend when finalizing a complete result', async () => {
    await render(<NewLabResultScreen />);
    await type('Hemoglobin', '138');
    await type('Red blood cells', '4,6');
    await type('White blood cells', '6.1');
    await type('Platelets', '250');

    await fireEvent.press(screen.getByText('Finalize result'));

    expect(log).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({ templateCode: 'cbc', templateVersion: 1, status: 'final' });
    expect(payload.entries).toHaveLength(4);
    expect(payload.entries[0]).toEqual({
      key: 'hgb',
      value: 138,
      unit: 'g/L',
      flag: 'normal',
      reference: '120–155',
    });
  });

  it('does not save an incomplete result when finalizing', async () => {
    await render(<NewLabResultScreen />);
    await type('Hemoglobin', '138');
    await fireEvent.press(screen.getByText('Finalize result'));
    expect(log).not.toHaveBeenCalled();
  });

  it('switches template, clears the form, and flags an abnormal choice', async () => {
    await render(<NewLabResultScreen />);
    await type('Hemoglobin', '118');

    await fireEvent.press(screen.getByRole('radio', { name: 'Urinalysis' }));
    expect(screen.getByText('Specimen: Urine (midstream)')).toBeTruthy();
    expect(screen.queryByText('↓ Low')).toBeNull();

    const protein = within(screen.getByLabelText('Protein'));
    await fireEvent.press(protein.getByRole('radio', { name: '++' }));
    expect(screen.getByText('Abnormal')).toBeTruthy();
  });
});
