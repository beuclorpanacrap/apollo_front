import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { TrendSeries } from '../../utils/lab-trends';
import { TrendCard } from './trend-card';

jest.setTimeout(30_000);

const series: TrendSeries = {
  key: 'hemoglobin',
  label: 'Hemoglobin',
  unit: 'g/L',
  range: { min: 120, max: 155 },
  points: [
    { date: '2026-01-10', value: 138, flag: 'normal', sourceId: 'a' },
    { date: '2026-02-10', value: 125, flag: 'normal', sourceId: 'b' },
    { date: '2026-03-10', value: 112, flag: 'low', sourceId: 'c' },
  ],
};

describe('TrendCard', () => {
  it('shows the title, the change since the previous result and the latest value', async () => {
    await render(<TrendCard series={series} />);
    expect(screen.getByText('Hemoglobin')).toBeTruthy();
    expect(screen.getByText('3 results')).toBeTruthy();
    expect(screen.getByText(/↓ 13 g\/L since the previous result/)).toBeTruthy();
    expect(screen.getByText('Shaded area is the reference range')).toBeTruthy();
  });

  it('describes the graph for screen readers', async () => {
    await render(<TrendCard series={series} />);
    expect(screen.getByLabelText(/Hemoglobin: 3 results from .* latest 112 g\/L/)).toBeTruthy();
  });

  it('draws once measured and lets you pick an earlier point', async () => {
    await render(<TrendCard series={series} />);
    const chart = screen.getByRole('image');
    await fireEvent(chart, 'layout', { nativeEvent: { layout: { width: 320, height: 170 } } });
    expect(screen.getByText(/Low/)).toBeTruthy(); // latest point is out of range

    await fireEvent.press(chart, { nativeEvent: { locationX: 44 } });
    expect(screen.queryByText(/Low/)).toBeNull();
  });
});
