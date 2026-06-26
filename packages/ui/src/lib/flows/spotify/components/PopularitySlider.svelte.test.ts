import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import PopularitySlider from './PopularitySlider.svelte';

describe('PopularitySlider', () => {
  it('renders a labelled range input with the current value in the label', () => {
    render(PopularitySlider, {
      props: { id: 'pop', label: 'Popularity', value: 40 },
    });

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('id', 'pop');
    expect(slider).toHaveAttribute('type', 'range');
    expect(screen.getByText('Popularity: 40')).toBeInTheDocument();
  });

  it('applies default min/max/step when not provided', () => {
    render(PopularitySlider, {
      props: { id: 'pop', label: 'Popularity', value: 0 },
    });

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '10');
  });

  it('honours custom min/max/step bounds', () => {
    render(PopularitySlider, {
      props: { id: 'pop', label: 'Popularity', value: 5, min: 1, max: 10, step: 1 },
    });

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '10');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('5');
  });
});
