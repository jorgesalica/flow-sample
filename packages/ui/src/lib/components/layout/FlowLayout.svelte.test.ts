import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import FlowLayout from './FlowLayout.svelte';

// A minimal snippet to feed FlowLayout's `children` prop. The layout renders it
// via {@render children()}, so we just need observable marker content.
const childContent = createRawSnippet(() => ({
  render: () => `<p data-testid="child">Inner page content</p>`,
}));

describe('FlowLayout', () => {
  it('renders the navbar chrome around the page', () => {
    render(FlowLayout, { props: { children: childContent } });

    // Navbar's brand wordmark proves the layout mounts the navbar.
    expect(screen.getByText('Cosmic Flow')).toBeInTheDocument();
  });

  it('renders the provided children snippet', () => {
    render(FlowLayout, { props: { children: childContent } });

    const child = screen.getByTestId('child');
    expect(child).toBeInTheDocument();
    expect(child).toHaveTextContent('Inner page content');
  });
});
