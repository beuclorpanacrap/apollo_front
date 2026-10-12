import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { distribute, fewestColumns, Masonry } from './LabUI';

// The first render in a run loads React Native cold, which can exceed Jest's 5 s default.
jest.setTimeout(30_000);

describe('distribute', () => {
  it('puts everything in one column when there is only one', () => {
    expect(distribute([1, 2, 3], 1)).toEqual([[0, 1, 2]]);
  });

  it('fills the columns left to right, then the shortest one', () => {
    // a b c | d goes under a (shortest), e under b ...
    expect(distribute([1, 1, 1, 1, 1], 3)).toEqual([[0, 3], [1, 4], [2]]);
  });

  it('balances by height, not by count', () => {
    // One tall card on its own, the short ones stack up beside it.
    expect(distribute([6, 1, 1, 1, 1], 2)).toEqual([[0], [1, 2, 3, 4]]);
  });

  it('keeps reading order inside each column', () => {
    for (const column of distribute([3, 1, 2, 2, 1, 3, 1], 3)) {
      expect(column).toEqual([...column].sort((a, b) => a - b));
    }
  });

  it('copes with fewer items than columns', () => {
    expect(distribute([1], 3)).toEqual([[0], [], []]);
  });
});

describe('fewestColumns', () => {
  it('stacks short cards under each other instead of giving each its own tall column', () => {
    // One tall card and two short ones: three columns would leave two mostly empty.
    expect(fewestColumns([300, 100, 100], 3, 16)).toEqual([[0], [1, 2]]);
  });

  it('tucks the last short cards under the first short ones', () => {
    // Date, comment, red cells, white cells, platelets, sedimentation: the tall panels set
    // the height, and everything short stacks in the first column.
    expect(fewestColumns([170, 200, 990, 1300, 640, 170], 5, 16)).toEqual([[0, 1, 4, 5], [2], [3]]);
  });

  it('keeps every column when they are all needed', () => {
    expect(fewestColumns([100, 100, 100], 3, 16)).toEqual([[0], [1], [2]]);
  });

  it('collapses to one column when everything is tiny next to the first card', () => {
    expect(fewestColumns([500, 10, 10, 10], 4, 16)).toEqual([[0], [1, 2, 3]]);
  });
});

describe('Masonry', () => {
  const items = ['A', 'B', 'C', 'D', 'E'].map((name) => ({
    key: name,
    node: <Text>{name}</Text>,
  }));
  const resize = (width: number) =>
    fireEvent(screen.getByTestId('m'), 'layout', { nativeEvent: { layout: { width, height: 400 } } });

  it('is a single column until it knows how wide it is', async () => {
    await render(<Masonry items={items} testID="m" />);
    expect(screen.getByTestId('m-column-0')).toBeTruthy();
    expect(screen.queryByTestId('m-column-1')).toBeNull();
  });

  it('adds columns as the space grows, up to maxColumns', async () => {
    await render(<Masonry items={items} testID="m" minColumnWidth={300} gap={16} maxColumns={3} />);

    await resize(500); // fits one 300px column
    expect(screen.queryByTestId('m-column-1')).toBeNull();

    await resize(700); // fits two
    expect(screen.getByTestId('m-column-1')).toBeTruthy();
    expect(screen.queryByTestId('m-column-2')).toBeNull();

    await resize(1500); // would fit four; capped at three
    expect(screen.getByTestId('m-column-2')).toBeTruthy();
    expect(screen.queryByTestId('m-column-3')).toBeNull();
  });

  it('deals the cards across the columns in reading order', async () => {
    await render(<Masonry items={items} testID="m" minColumnWidth={300} gap={16} />);
    await resize(1100);

    const column = (n: number) => within(screen.getByTestId(`m-column-${n}`));
    expect(column(0).getByText('A')).toBeTruthy();
    expect(column(0).getByText('D')).toBeTruthy();
    expect(column(1).getByText('B')).toBeTruthy();
    expect(column(1).getByText('E')).toBeTruthy();
    expect(column(2).getByText('C')).toBeTruthy();
  });

  describe('placing by measured height', () => {
    const measure = (key: string, height: number) =>
      fireEvent(screen.getByTestId(`m-item-${key}`), 'layout', { nativeEvent: { layout: { width: 300, height } } });
    const keysIn = (column: number) =>
      ['A', 'B', 'C', 'D'].filter((key) => within(screen.getByTestId(`m-column-${column}`)).queryByText(key));

    const setup = async () => {
      await render(<Masonry items={items.slice(0, 4)} testID="m" minColumnWidth={300} gap={16} />);
      await resize(700); // two columns
    };

    it('starts from the weights, then re-deals once every card has reported a height', async () => {
      await setup();
      expect([keysIn(0), keysIn(1)]).toEqual([['A', 'C'], ['B', 'D']]); // equal weights

      await measure('A', 300);
      await measure('B', 100);
      await measure('C', 100);
      expect([keysIn(0), keysIn(1)]).toEqual([['A', 'C'], ['B', 'D']]); // still waiting for D

      await measure('D', 100);
      // A is tall, so B, C and D stack up beside it.
      expect([keysIn(0), keysIn(1)]).toEqual([['A'], ['B', 'C', 'D']]);
    });

    it('does not move a card when its height changes afterwards (typing)', async () => {
      await setup();
      for (const [key, height] of [['A', 300], ['B', 100], ['C', 100], ['D', 100]] as const) await measure(key, height);
      expect([keysIn(0), keysIn(1)]).toEqual([['A'], ['B', 'C', 'D']]);

      await measure('A', 20); // an error message disappears, say
      await measure('D', 900);
      expect([keysIn(0), keysIn(1)]).toEqual([['A'], ['B', 'C', 'D']]);
    });

    it('re-deals when the set of cards changes', async () => {
      await setup();
      for (const [key, height] of [['A', 300], ['B', 100], ['C', 100], ['D', 100]] as const) await measure(key, height);
      expect([keysIn(0), keysIn(1)]).toEqual([['A'], ['B', 'C', 'D']]);

      await screen.rerender(<Masonry items={items.slice(0, 3)} testID="m" minColumnWidth={300} gap={16} />);
      // Back to weights until the new set reports in: A | B, then C under A.
      expect([keysIn(0), keysIn(1)]).toEqual([['A', 'C'], ['B']]);
    });
  });

  it('stacks short cards instead of stretching them to the height of the tall one', async () => {
    await render(<Masonry items={items.slice(0, 3)} testID="m" minColumnWidth={300} gap={16} />);
    await resize(1000); // three columns
    for (const [key, height] of [['A', 300], ['B', 60], ['C', 60]] as const) {
      await fireEvent(screen.getByTestId(`m-item-${key}`), 'layout', { nativeEvent: { layout: { width: 300, height } } });
    }

    const column = (n: number) => within(screen.getByTestId(`m-column-${n}`));
    expect(column(0).getByText('A')).toBeTruthy();
    expect(column(1).getByText('B')).toBeTruthy();
    expect(column(1).getByText('C')).toBeTruthy();
    expect(screen.queryByTestId('m-column-2')).toBeNull();
    // Natural height: nothing is told to grow.
    expect(screen.getByTestId('m-item-B').props.style).toBeUndefined();
  });

  it('uses the whole width by default: as many columns as fit, up to six', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ key: String(i), node: <Text>{`card ${i}`}</Text> }));
    await render(<Masonry items={many} testID="m" minColumnWidth={300} gap={16} />);
    await resize(2500); // would fit seven
    expect(screen.getByTestId('m-column-5')).toBeTruthy();
    expect(screen.queryByTestId('m-column-6')).toBeNull();
  });

  it('never makes more columns than there are cards', async () => {
    await render(<Masonry items={items.slice(0, 2)} testID="m" minColumnWidth={300} gap={16} />);
    await resize(1500);
    expect(screen.getByTestId('m-column-1')).toBeTruthy();
    expect(screen.queryByTestId('m-column-2')).toBeNull();
  });
});
