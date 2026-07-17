/** Vitest adapter for the SvelteKit virtual navigation module. */
export function replaceState(url: string | URL, state: Record<string, unknown>): void {
  window.history.replaceState(state, '', url);
}

export async function invalidate(): Promise<void> {
  await Promise.resolve();
}
