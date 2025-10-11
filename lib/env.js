const fs = require('fs');

function loadEnvVariables(filePath) {
  let raw = '';
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(
      `Unable to read ${filePath}. Make sure the file exists and includes SPOTIFY_CLIENT_ID, ` +
        'SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI, and SPOTIFY_AUTHORIZATION_CODE.'
    );
  }

  const env = {};
  raw.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    env[key] = rest.join('=').trim();
  });

  return env;
}

module.exports = {
  loadEnvVariables,
};
