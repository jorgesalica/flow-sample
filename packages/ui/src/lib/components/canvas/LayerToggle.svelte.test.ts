import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { AnnotationLayer } from '@flows/shared';
import LayerToggle from './LayerToggle.svelte';

const LAYERS: AnnotationLayer[] = [
  { id: 'meaning', name: 'Meaning', icon: '💡', color: '#22d3ee' },
  { id: 'chords', name: 'Chords', icon: '🎸', color: '#4ade80' },
  { id: 'vocal', name: 'Vocal', icon: '🎤', color: '#f59e0b' },
];

describe('LayerToggle', () => {
  it('renders a button per layer with its name and icon', () => {
    render(LayerToggle, { props: { layers: LAYERS, activeLayers: [] } });

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(screen.getByText('Meaning')).toBeInTheDocument();
    expect(screen.getByText('Chords')).toBeInTheDocument();
    expect(screen.getByText('Vocal')).toBeInTheDocument();
    expect(screen.getByText('🎸')).toBeInTheDocument();
  });

  it('marks active layers with the active class and leaves others inactive', () => {
    render(LayerToggle, { props: { layers: LAYERS, activeLayers: ['meaning'] } });

    const meaningBtn = screen.getByTitle('Toggle Meaning');
    const chordsBtn = screen.getByTitle('Toggle Chords');
    expect(meaningBtn.className).toContain('active');
    expect(chordsBtn.className).not.toContain('active');
  });

  it('activates an inactive layer when clicked (toggle -> active:true)', async () => {
    render(LayerToggle, { props: { layers: LAYERS, activeLayers: [] } });

    const chordsBtn = screen.getByTitle('Toggle Chords');
    expect(chordsBtn.className).not.toContain('active');

    await fireEvent.click(chordsBtn);

    // toggleLayer dispatched toggle({ layerId: 'chords', active: true }) and
    // flipped the layer on, which is reflected by the active class.
    expect(chordsBtn.className).toContain('active');
  });

  it('deactivates an active layer when clicked (toggle -> active:false)', async () => {
    render(LayerToggle, { props: { layers: LAYERS, activeLayers: ['meaning'] } });

    const meaningBtn = screen.getByTitle('Toggle Meaning');
    expect(meaningBtn.className).toContain('active');

    await fireEvent.click(meaningBtn);

    // toggleLayer dispatched toggle({ layerId: 'meaning', active: false }) and
    // flipped the layer off, which is reflected by losing the active class.
    expect(meaningBtn.className).not.toContain('active');
  });

  it('reflects the toggle in the active class after clicking', async () => {
    render(LayerToggle, { props: { layers: LAYERS, activeLayers: [] } });
    const chordsBtn = screen.getByTitle('Toggle Chords');
    expect(chordsBtn.className).not.toContain('active');

    await fireEvent.click(chordsBtn);

    expect(chordsBtn.className).toContain('active');
  });

  it('does nothing when disabled', async () => {
    render(LayerToggle, { props: { layers: LAYERS, activeLayers: [], disabled: true } });

    const chordsBtn = screen.getByTitle('Toggle Chords') as HTMLButtonElement;
    expect(chordsBtn).toBeDisabled();
    expect(chordsBtn.className).not.toContain('active');

    await fireEvent.click(chordsBtn);

    // toggleLayer early-returns while disabled: no toggle, no state change.
    expect(chordsBtn.className).not.toContain('active');
  });

  it('renders no buttons for an empty layer list', () => {
    render(LayerToggle, { props: { layers: [], activeLayers: [] } });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
