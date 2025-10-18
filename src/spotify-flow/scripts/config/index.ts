import path from 'path';

export const ENV_FILE = '.env';

export const OUTPUT_ROOT = path.resolve('outputs');
export const SPOTIFY_OUTPUT_DIR = path.join(OUTPUT_ROOT, 'spotify');

export const FILES = {
  likedJson: path.join(SPOTIFY_OUTPUT_DIR, 'my_liked_songs.json'),
  tokens: path.join(SPOTIFY_OUTPUT_DIR, 'spotify_tokens.json'),
  skippedFeatures: path.join(SPOTIFY_OUTPUT_DIR, 'spotify_skipped_audio_features.json'),
  enrichedJson: path.join(SPOTIFY_OUTPUT_DIR, 'enriched_likes.json'),
  enrichedCsv: path.join(SPOTIFY_OUTPUT_DIR, 'enriched_likes.csv'),
  compactJson: path.join(SPOTIFY_OUTPUT_DIR, 'enriched_likes.compact.json'),
};
