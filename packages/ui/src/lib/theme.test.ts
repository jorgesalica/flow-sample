import { describe, expect, it, vi } from 'vitest';
import { AppTheme, applyTheme, isAppTheme, readStoredTheme, THEME_STORAGE_KEY } from './theme';

describe('theme contract', () => {
  it('recognizes only supported themes', () => {
    expect(isAppTheme(AppTheme.GALAXY)).toBe(true);
    expect(isAppTheme(AppTheme.FIRE)).toBe(true);
    expect(isAppTheme(AppTheme.ORGANIC)).toBe(true);
    expect(isAppTheme('cosmic')).toBe(false);
    expect(isAppTheme(null)).toBe(false);
  });

  it('falls back to galaxy when persisted data is missing or invalid', () => {
    const getItem = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce('legacy');
    expect(readStoredTheme({ getItem })).toBe(AppTheme.GALAXY);
    expect(readStoredTheme({ getItem })).toBe(AppTheme.GALAXY);
    expect(getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY);
  });

  it('reads and applies a supported persisted theme', () => {
    const target = document.createElement('div');
    const theme = readStoredTheme({ getItem: () => AppTheme.ORGANIC });
    applyTheme(target, theme);
    expect(target).toHaveAttribute('data-theme', AppTheme.ORGANIC);
  });
});
