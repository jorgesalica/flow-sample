export const AppTheme = {
  GALAXY: 'galaxy',
  FIRE: 'fire',
  ORGANIC: 'organic',
} as const;

export type AppTheme = (typeof AppTheme)[keyof typeof AppTheme];

export const THEME_STORAGE_KEY = 'flow-sample:theme';
export const THEME_CHANGE_EVENT = 'flow-sample:theme-change';

export const themeOptions = [
  { value: AppTheme.GALAXY, label: 'Galaxy', color: '#22d3ee' },
  { value: AppTheme.FIRE, label: 'Fire', color: '#fb7185' },
  { value: AppTheme.ORGANIC, label: 'Organic', color: '#a3e635' },
] as const;

export function isAppTheme(value: string | null): value is AppTheme {
  return Object.values(AppTheme).some((theme) => theme === value);
}

export function readStoredTheme(storage: Pick<Storage, 'getItem'>): AppTheme {
  const storedTheme = storage.getItem(THEME_STORAGE_KEY);
  return isAppTheme(storedTheme) ? storedTheme : AppTheme.GALAXY;
}

export function applyTheme(target: HTMLElement, theme: AppTheme): void {
  target.dataset.theme = theme;
}
