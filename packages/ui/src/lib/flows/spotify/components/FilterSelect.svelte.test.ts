import { render, screen } from '@testing-library/svelte';
import { fireEvent } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import type { SelectOption } from '@flows/shared';
import FilterSelect from './FilterSelect.svelte';

const OPTIONS: SelectOption[] = [
  { value: 'added_at', label: 'Date Added' },
  { value: 'title', label: 'Title' },
];

describe('FilterSelect', () => {
  it('renders the label wired to the select via id/for', () => {
    render(FilterSelect, {
      props: { id: 'sort', label: 'Sort By', value: 'added_at', options: OPTIONS },
    });

    const select = screen.getByLabelText('Sort By');
    expect(select).toHaveAttribute('id', 'sort');
  });

  it('renders one option per provided option', () => {
    render(FilterSelect, {
      props: { id: 'sort', label: 'Sort By', value: 'added_at', options: OPTIONS },
    });

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Date Added' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Title' })).toBeInTheDocument();
  });

  it('reflects the bound value as the selected option', () => {
    render(FilterSelect, {
      props: { id: 'sort', label: 'Sort By', value: 'title', options: OPTIONS },
    });

    expect(screen.getByLabelText('Sort By')).toHaveValue('title');
  });

  it('updates the selection when the user picks a different option', async () => {
    render(FilterSelect, {
      props: { id: 'sort', label: 'Sort By', value: 'added_at', options: OPTIONS },
    });

    const select = screen.getByLabelText<HTMLSelectElement>('Sort By');
    await fireEvent.change(select, { target: { value: 'title' } });

    expect(select).toHaveValue('title');
  });

  it('renders no options when the list is empty', () => {
    render(FilterSelect, {
      props: { id: 'sort', label: 'Sort By', value: '', options: [] },
    });

    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});
