import fs from 'fs';
import path from 'path';

import { FILES } from './config';
import { ensureDirectoryExists } from './utils';

export interface StoredRefreshToken {
  refresh_token: string;
  saved_at: string;
}

export function loadStoredRefreshToken(filePath: string = FILES.tokens): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return null;

    const parsed = JSON.parse(raw) as StoredRefreshToken;
    const token = typeof parsed.refresh_token === 'string' ? parsed.refresh_token.trim() : '';
    return token.length > 0 ? token : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: unable to read stored refresh token from ${filePath}: ${message}`);
    return null;
  }
}

export function persistRefreshToken(refreshToken: string, filePath: string = FILES.tokens): void {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    const payload: StoredRefreshToken = {
      refresh_token: refreshToken,
      saved_at: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    console.log(`Stored refresh token for future runs in ${filePath}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: failed to persist refresh token to ${filePath}: ${message}`);
  }
}
