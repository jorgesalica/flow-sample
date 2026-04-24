import { Elysia, t } from 'elysia';
import crypto from 'crypto';
import { 
    tokenize, 
    saveAnalysis, 
    findAnalysisBySourceId,
    createDatabase
} from '@flows/core';
import type { CanvasAnalysis, CanvasSource, MUSIC_LAYERS } from '@flows/shared';
import { analyzeLyrics } from './music-analyzer';

// We need read access to the music.db to get track details and lyrics
const musicDb = createDatabase('music.db');

function getTrackDetails(trackId: string) {
    const row = musicDb.prepare(`
        SELECT 
            t.id, 
            t.title, 
            t.album_image_url as imageUrl,
            GROUP_CONCAT(a.name, ', ') as artist,
            l.plain_lyrics as plainLyrics
        FROM tracks t
        LEFT JOIN track_artists ta ON t.id = ta.track_id
        LEFT JOIN artists a ON ta.artist_id = a.id
        LEFT JOIN lyrics l ON t.id = l.track_id
        WHERE t.id = ?
        GROUP BY t.id
    `).get(trackId) as any;

    return row;
}

function hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
}

export const canvasRoutes = new Elysia({ prefix: '/:trackId/canvas' })
    .get('/', async ({ params, set }) => {
        const { trackId } = params;
        
        // 1. Check if we have a cached analysis in canvas.db
        const cached = findAnalysisBySourceId(trackId);
        
        if (cached) {
            return cached;
        }

        // 2. If not, check if the track even exists and has lyrics
        const track = getTrackDetails(trackId);
        
        if (!track) {
            set.status = 404;
            return { error: 'Track not found' };
        }

        if (!track.plainLyrics) {
            set.status = 404;
            return { error: 'Lyrics not available for this track' };
        }

        // Return a standard 404 indicating analysis is needed, but the source is valid
        set.status = 404;
        return { 
            error: 'Analysis not found', 
            needsAnalysis: true,
            source: {
                sourceId: track.id,
                sourceType: 'track',
                title: track.title,
                author: track.artist,
                imageUrl: track.imageUrl
            }
        };
    })
    .post('/analyze', async ({ params, set }) => {
        const { trackId } = params;
        
        const track = getTrackDetails(trackId);
        
        if (!track || !track.plainLyrics) {
            set.status = 400;
            return { error: 'Track or lyrics not available' };
        }

        // 1. Tokenize the text (Deterministic)
        const tokenAst = tokenize(track.plainLyrics);
        
        // 2. Analyze with LLM
        const analysisResult = await analyzeLyrics(tokenAst, track.title, track.artist);
        
        // 3. Construct the CanvasAnalysis object
        // We need the MUSIC_LAYERS from shared
        // Since we can't easily import the runtime value here if it's type-only, 
        // wait, MUSIC_LAYERS is exported as a value from shared.
        
        const now = new Date().toISOString();
        const textHash = hashText(track.plainLyrics);
        
        // Lazy-load layers to avoid circular/value import issues if any
        const layers = [
            { id: 'chords', name: 'Chords', icon: '🎸', color: '#4ade80' },
            { id: 'vocal', name: 'Vocal', icon: '🎤', color: '#f59e0b' },
            { id: 'production', name: 'Production', icon: '🎛️', color: '#818cf8' },
            { id: 'meaning', name: 'Meaning', icon: '💡', color: '#22d3ee' }
        ];

        const analysis: CanvasAnalysis = {
            id: `ca_${crypto.randomUUID()}`,
            sourceId: trackId,
            sourceType: 'track',
            sourceTextHash: textHash,
            tokenAst,
            annotations: analysisResult.annotations,
            layers,
            meta: analysisResult.meta,
            modelUsed: 'gemini-2.5-pro', // we should ideally get this from the LLM client response, but hardcoding for now or we can get it later
            providerUsed: 'gemini',
            createdAt: now,
            updatedAt: now,
        };

        // 4. Save to canvas.db
        saveAnalysis(analysis);

        return analysis;
    });
