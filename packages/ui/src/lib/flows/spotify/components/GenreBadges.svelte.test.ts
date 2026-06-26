import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import GenreBadges from './GenreBadges.svelte';

describe('GenreBadges', () => {
  it('renders each genre up to the default maxDisplay of 2', () => {
    render(GenreBadges, { props: { genres: ['rock', 'pop'] } });

    expect(screen.getByText('rock')).toBeInTheDocument();
    expect(screen.getByText('pop')).toBeInTheDocument();
  });

  it('truncates to maxDisplay and hides the overflow', () => {
    render(GenreBadges, { props: { genres: ['rock', 'pop', 'jazz', 'metal'] } });

    expect(screen.getByText('rock')).toBeInTheDocument();
    expect(screen.getByText('pop')).toBeInTheDocument();
    // Negative space: beyond maxDisplay=2 nothing is rendered.
    expect(screen.queryByText('jazz')).not.toBeInTheDocument();
    expect(screen.queryByText('metal')).not.toBeInTheDocument();
  });

  it('honours a custom maxDisplay', () => {
    render(GenreBadges, { props: { genres: ['rock', 'pop', 'jazz'], maxDisplay: 3 } });

    expect(screen.getByText('rock')).toBeInTheDocument();
    expect(screen.getByText('pop')).toBeInTheDocument();
    expect(screen.getByText('jazz')).toBeInTheDocument();
  });

  it('renders nothing when the genres list is empty', () => {
    const { container } = render(GenreBadges, { props: { genres: [] } });
    // The whole wrapper is guarded by {#if genres.length > 0}.
    expect(container.querySelector('div')).toBeNull();
  });
});
