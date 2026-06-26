import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import type { Annotation, AnnotationLayer } from '@flows/shared';
import TokenTooltip from './TokenTooltip.svelte';

const LAYERS: AnnotationLayer[] = [
  { id: 'meaning', name: 'Meaning', icon: '💡', color: '#22d3ee' },
  { id: 'chords', name: 'Chords', icon: '🎸', color: '#4ade80' },
];

const ANNOTATIONS: Annotation[] = [
  { tokenId: 't_001', layerId: 'meaning', label: 'metaphor', detail: 'A figurative comparison.' },
  { tokenId: 't_001', layerId: 'chords', label: 'Am', detail: 'A minor chord here.' },
];

describe('TokenTooltip', () => {
  it('renders nothing when not visible', () => {
    render(TokenTooltip, {
      props: { annotations: ANNOTATIONS, layers: LAYERS, x: 10, y: 20, visible: false },
    });
    expect(screen.queryByText('metaphor')).not.toBeInTheDocument();
    expect(screen.queryByText('A figurative comparison.')).not.toBeInTheDocument();
  });

  it('renders nothing when visible but there are no annotations', () => {
    render(TokenTooltip, {
      props: { annotations: [], layers: LAYERS, x: 10, y: 20, visible: true },
    });
    expect(screen.queryByText('A figurative comparison.')).not.toBeInTheDocument();
  });

  it('renders every annotation label and detail when visible', () => {
    render(TokenTooltip, {
      props: { annotations: ANNOTATIONS, layers: LAYERS, x: 10, y: 20, visible: true },
    });

    expect(screen.getByText('metaphor')).toBeInTheDocument();
    expect(screen.getByText('A figurative comparison.')).toBeInTheDocument();
    expect(screen.getByText('Am')).toBeInTheDocument();
    expect(screen.getByText('A minor chord here.')).toBeInTheDocument();
  });

  it('shows the layer name and icon when the layer is known', () => {
    render(TokenTooltip, {
      props: { annotations: ANNOTATIONS, layers: LAYERS, x: 10, y: 20, visible: true },
    });

    expect(screen.getByText('Meaning')).toBeInTheDocument();
    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(screen.getByText('Chords')).toBeInTheDocument();
  });

  it('omits layer name/icon when the layer is unknown but still shows label and detail', () => {
    const orphan: Annotation[] = [
      { tokenId: 't_x', layerId: 'unknown-layer', label: 'mystery', detail: 'No layer info.' },
    ];
    render(TokenTooltip, {
      props: { annotations: orphan, layers: LAYERS, x: 0, y: 0, visible: true },
    });

    expect(screen.getByText('mystery')).toBeInTheDocument();
    expect(screen.getByText('No layer info.')).toBeInTheDocument();
    // No layer name should be rendered for the missing layer.
    expect(screen.queryByText('Meaning')).not.toBeInTheDocument();
  });

  it('positions the tooltip using the x/y props', () => {
    render(TokenTooltip, {
      props: { annotations: ANNOTATIONS, layers: LAYERS, x: 123, y: 456, visible: true },
    });

    const tooltip = document.querySelector('.tooltip-container') as HTMLElement;
    expect(tooltip).not.toBeNull();
    expect(tooltip.style.left).toBe('123px');
    expect(tooltip.style.top).toBe('456px');
  });
});
