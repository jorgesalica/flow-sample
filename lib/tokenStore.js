const fs = require('fs');

function loadStoredRefreshToken(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return null;

    const parsed = JSON.parse(raw);
    const token = parsed && typeof parsed.refresh_token === 'string' ? parsed.refresh_token.trim() : '';
    return token || null;
  } catch (error) {
    console.warn(`Warning: unable to read stored refresh token from ${filePath}: ${error.message}`);
    return null;
  }
}

function persistRefreshToken(filePath, refreshToken) {
  try {
    const payload = {
      refresh_token: refreshToken,
      saved_at: new Date().toISOString(),
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
    console.log(`Stored refresh token for future runs in ${filePath}.`);
  } catch (error) {
    console.warn(`Warning: failed to persist refresh token to ${filePath}: ${error.message}`);
  }
}

module.exports = {
  loadStoredRefreshToken,
  persistRefreshToken,
};
