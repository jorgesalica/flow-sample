// Makes @testing-library/jest-dom matchers (toBeInTheDocument, toBeDisabled, …)
// known to tsc / svelte-check. The runtime augmentation is loaded in vitest-setup.ts;
// this declaration is what the type-checker sees (it lives under src/ so it's in the
// svelte-check program).
import 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
declare module 'vitest' {
  interface Assertion<T = any> extends TestingLibraryMatchers<unknown, T> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type */
