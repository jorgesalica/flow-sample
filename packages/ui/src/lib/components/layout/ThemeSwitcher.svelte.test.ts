import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTheme, THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from '@lib/theme';
import ThemeSwitcher from './ThemeSwitcher.svelte';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.dataset.theme = AppTheme.GALAXY;
});

describe('ThemeSwitcher', () => {
  it('exposes all themes as a single-choice accessible control', () => {
    render(ThemeSwitcher);
    expect(screen.getByRole('group', { name: 'Color theme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Galaxy theme' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Fire theme' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Organic theme' })).toBeInTheDocument();
  });

  it('applies and persists the selected theme', async () => {
    render(ThemeSwitcher);
    await fireEvent.click(screen.getByRole('button', { name: 'Fire theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', AppTheme.FIRE);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(AppTheme.FIRE);
    expect(screen.getByRole('button', { name: 'Fire theme' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('restores a supported persisted theme on mount', () => {
    const themeChangeListener = vi.fn();
    window.addEventListener(THEME_CHANGE_EVENT, themeChangeListener, { once: true });
    window.localStorage.setItem(THEME_STORAGE_KEY, AppTheme.ORGANIC);
    render(ThemeSwitcher);
    expect(document.documentElement).toHaveAttribute('data-theme', AppTheme.ORGANIC);
    expect(themeChangeListener).toHaveBeenCalledOnce();
  });
});
