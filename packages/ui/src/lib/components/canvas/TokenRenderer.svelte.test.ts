import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import type { TokenAST, Annotation } from '@flows/shared';
import TokenRenderer from './TokenRenderer.svelte';

// Two sections, the first with two lines, exercising sections/lines/tokens.
const AST: TokenAST = {
  totalTokens: 4,
  sections: [
    {
      id: 's_001',
      type: 'Verse',
      lines: [
        [
          { id: 't_001', text: 'Hello' },
          { id: 't_002', text: 'world' },
        ],
        [{ id: 't_003', text: 'again' }],
      ],
    },
    {
      id: 's_002',
      type: 'Chorus',
      lines: [[{ id: 't_004', text: 'Sing' }]],
    },
  ],
};

const ANNOTATIONS: Annotation[] = [
  { tokenId: 't_001', layerId: 'meaning', label: 'theme', detail: 'Opening greeting.' },
  { tokenId: 't_002', layerId: 'chords', label: 'Am', detail: 'A minor chord.' },
  { tokenId: 't_002', layerId: 'vocal', label: 'belt', detail: 'Belted note.' },
  { tokenId: 't_004', layerId: 'production', label: 'reverb', detail: 'Heavy reverb.' },
];

function tokenSpan(id: string): HTMLElement {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) throw new Error(`token ${id} not found`);
  return el as HTMLElement;
}

// The line element that wraps a token; its `line-highlighted` class is the
// observable side-effect of the hover handler firing for an annotated token.
function lineOf(id: string): HTMLElement {
  const line = tokenSpan(id).closest('.canvas-line');
  if (!line) throw new Error(`line for token ${id} not found`);
  return line as HTMLElement;
}

describe('TokenRenderer', () => {
  it('renders every section type and token text', () => {
    render(TokenRenderer, { props: { tokenAst: AST, annotations: [], activeLayers: [] } });

    expect(screen.getByText('[ Verse ]')).toBeInTheDocument();
    expect(screen.getByText('[ Chorus ]')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
    expect(screen.getByText('again')).toBeInTheDocument();
    expect(screen.getByText('Sing')).toBeInTheDocument();
  });

  it('shows badges only for active non-meaning layers', () => {
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: ['chords'] },
    });

    // chords badge for t_002 is visible
    expect(screen.getByText('Am')).toBeInTheDocument();
    // vocal/production are not active -> not rendered
    expect(screen.queryByText('belt')).not.toBeInTheDocument();
    expect(screen.queryByText('B')).not.toBeInTheDocument(); // abbreviated vocal
    expect(screen.queryByText('reverb')).not.toBeInTheDocument();
  });

  it('abbreviates the vocal layer label to its first uppercase letter', () => {
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: ['vocal'] },
    });

    // 'belt' becomes 'B'
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('belt')).not.toBeInTheDocument();
  });

  it('marks the annotated token with the annotated class', () => {
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: ['chords'] },
    });

    expect(tokenSpan('t_002').className).toContain('annotated');
    // t_003 has no annotations -> not annotated
    expect(tokenSpan('t_003').className).not.toContain('annotated');
  });

  it('does not render any badge when no layers are active', () => {
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: [] },
    });

    expect(screen.queryByText('Am')).not.toBeInTheDocument();
    expect(screen.queryByText('reverb')).not.toBeInTheDocument();
    expect(tokenSpan('t_002').className).not.toContain('annotated');
  });

  it('reacts to hovering an annotated token by highlighting its line', async () => {
    // With meaning active, hovering an annotated token fires the hover handler,
    // whose observable effect is highlighting the token's line.
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: ['meaning'] },
    });

    const line = lineOf('t_001');
    expect(line.className).not.toContain('line-highlighted');

    await fireEvent.mouseEnter(tokenSpan('t_001'));

    expect(line.className).toContain('line-highlighted');
  });

  it('exposes annotated tokens as named native controls', async () => {
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: ['meaning'] },
    });

    const annotatedToken = screen.getByRole('button', {
      name: 'Hello. theme: Opening greeting.',
    });
    expect(annotatedToken).toBe(tokenSpan('t_001'));
    expect(tokenSpan('t_003').tagName).toBe('SPAN');

    await fireEvent.focus(annotatedToken);
    expect(lineOf('t_001').className).toContain('line-highlighted');
  });

  it('does not react when hovering a token with no active annotations', async () => {
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: ['meaning'] },
    });

    // t_003 has no annotations at all -> the hover handler dispatches nothing
    // and leaves its line un-highlighted.
    await fireEvent.mouseEnter(tokenSpan('t_003'));

    expect(lineOf('t_003').className).not.toContain('line-highlighted');
  });

  it('clears the line highlight on mouseleave', async () => {
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: ['meaning'] },
    });

    const line = lineOf('t_001');
    await fireEvent.mouseEnter(tokenSpan('t_001'));
    expect(line.className).toContain('line-highlighted');

    // mouseleave dispatches a null tokenhover and resets the highlight.
    await fireEvent.mouseLeave(tokenSpan('t_001'));

    expect(line.className).not.toContain('line-highlighted');
  });

  it('applies the meaning underline class to a line that has an active meaning annotation', async () => {
    render(TokenRenderer, {
      props: { tokenAst: AST, annotations: ANNOTATIONS, activeLayers: ['meaning'] },
    });

    // t_001 has a meaning annotation; its line should mark tokens has-meaning
    expect(tokenSpan('t_001').className).toContain('has-meaning');
    // t_004 is on a different line/section with no meaning annotation
    expect(tokenSpan('t_004').className).not.toContain('has-meaning');
  });

  it('renders an empty container for an AST with no sections', () => {
    render(TokenRenderer, {
      props: { tokenAst: { sections: [], totalTokens: 0 }, annotations: [], activeLayers: [] },
    });

    const renderer = document.querySelector('.canvas-renderer');
    expect(renderer).not.toBeNull();
    expect(renderer?.querySelectorAll('.canvas-section')).toHaveLength(0);
  });
});
