import { describe, expect, it } from 'vitest';
import { readChartTheme } from './chart-theme';

describe('readChartTheme', () => {
  it('maps semantic CSS variables into the chart contract', () => {
    const values = new Map([
      ['--ui-surface', 'surface'],
      ['--ui-text', 'text'],
      ['--ui-text-muted', 'muted'],
      ['--ui-border', 'border'],
      ['--ui-success', 'success'],
      ['--ui-danger', 'danger'],
      ...[1, 2, 3, 4, 5, 6].map((index) => [`--ui-chart-${index}`, `chart-${index}`] as const),
    ]);

    const theme = readChartTheme({ getPropertyValue: (token) => ` ${values.get(token) ?? ''} ` });
    expect(theme.colors).toEqual([
      'chart-1',
      'chart-2',
      'chart-3',
      'chart-4',
      'chart-5',
      'chart-6',
    ]);
    expect(theme).toMatchObject({
      surface: 'surface',
      text: 'text',
      muted: 'muted',
      border: 'border',
      success: 'success',
      danger: 'danger',
    });
  });
});
