import { describe, expect, it, vi } from 'vitest';

const createDatabase = vi.hoisted(() => vi.fn());

vi.mock('@flows/core', () => ({
  createDatabase,
  logger: {
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
  LLMClient: {},
}));

describe('Chat package imports', () => {
  it('does not open a database or construct runtime services on import', async () => {
    await import('../../src/index');

    expect(createDatabase).not.toHaveBeenCalled();
  });
});
