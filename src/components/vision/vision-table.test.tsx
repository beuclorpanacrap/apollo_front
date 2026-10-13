import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { VisionTable } from './vision-table';

// The first render in a run loads React Native cold, which can exceed Jest's 5 s default.
jest.setTimeout(30_000);

describe('VisionTable', () => {
  it('shows each eye with its sphere, cylinder, axis and add', async () => {
    await render(
      <VisionTable
        rx={{
          rightEye: { sphere: -2.5, cylinder: -0.75, axis: 180, add: 1.5 },
          leftEye: { sphere: 0, add: 1.5 },
        }}
      />,
    );

    expect(screen.getByText('Right eye')).toBeTruthy();
    expect(screen.getByText('OD')).toBeTruthy();
    expect(screen.getByText('-2.50')).toBeTruthy();
    expect(screen.getByText('-0.75')).toBeTruthy();
    expect(screen.getByText('180°')).toBeTruthy();
    // Both eyes share the same add; the left sphere is plano.
    expect(screen.getAllByText('+1.50')).toHaveLength(2);
    expect(screen.getByText('Plano')).toBeTruthy();
  });

  it('says so when an eye has no correction instead of showing a row of dashes', async () => {
    await render(<VisionTable rx={{ rightEye: { sphere: -1 }, leftEye: {} }} />);
    expect(screen.getByText('No correction')).toBeTruthy();
  });

  it('shows a dash for a cylinder and axis the eye does not have', async () => {
    await render(<VisionTable rx={{ rightEye: { sphere: -1 }, leftEye: { sphere: -1.25 } }} />);
    // cylinder, axis and add are all missing for both eyes
    expect(screen.getAllByText('—')).toHaveLength(6);
  });
});
