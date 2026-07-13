export interface ChartTheme {
  colors: string[];
  surface: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  danger: string;
}

function readColor(styles: Pick<CSSStyleDeclaration, 'getPropertyValue'>, token: string): string {
  return styles.getPropertyValue(token).trim();
}

export function readChartTheme(styles: Pick<CSSStyleDeclaration, 'getPropertyValue'>): ChartTheme {
  return {
    colors: [1, 2, 3, 4, 5, 6].map((index) => readColor(styles, `--ui-chart-${index}`)),
    surface: readColor(styles, '--ui-surface'),
    text: readColor(styles, '--ui-text'),
    muted: readColor(styles, '--ui-text-muted'),
    border: readColor(styles, '--ui-border'),
    success: readColor(styles, '--ui-success'),
    danger: readColor(styles, '--ui-danger'),
  };
}
