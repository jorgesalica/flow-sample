import assert from 'node:assert/strict';
import test from 'node:test';
import { scanSensitiveContent } from './sensitive-data.mjs';

test('detects credentials and personal data in repository text', () => {
  const findings = scanSensitiveContent(
    'fixture.ts',
    `
      const token = 'sk-proj-abcdefghijklmnopqrstuvwxyz';
      const privateKey = '-----BEGIN PRIVATE KEY-----';
      const database = 'postgresql://owner:real-password@db.example.com/app';
      const admin = { email: 'personal@gmail.com', dni: '87654321' };
    `,
  );

  assert.deepEqual(
    findings.map((finding) => finding.rule),
    ['secret-token', 'private-key', 'credential-url', 'personal-email', 'dni'],
  );
});

test('allows documented placeholders and fictional identities', () => {
  assert.deepEqual(
    scanSensitiveContent(
      '.env.example',
      `
        GEMINI_API_KEY=AIza...
        GROQ_API_KEY=gsk_your_key_here
        DATABASE_URL=postgresql://user:password@localhost/app
        CONTACT=developer@mock.test
        DNI=12345678
      `,
    ),
    [],
  );
});
