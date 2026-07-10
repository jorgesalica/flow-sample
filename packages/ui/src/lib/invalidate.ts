import { invalidate } from '$app/navigation';

export function invalidateData(key: string): Promise<void> {
  return invalidate(key);
}
