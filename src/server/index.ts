import http from 'http';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import * as path from 'path';
import { loadConfig } from '../spotify-flow/config/schema';
import { SpotifyAdapter } from '../spotify-flow/adapters/spotify';
import { FileSystemAdapter } from '../spotify-flow/adapters/filesystem';
import { FlowEngine } from '../spotify-flow/core/engine';
import { logger } from '../spotify-flow/core/logger';

const config = loadConfig();
const HOST = config.app.host;
const PORT = config.app.port;

const projectRoot = path.resolve(__dirname, '..', '..');
const uiRoot = path.join(projectRoot, 'ui');
const defaultIndex = path.join(uiRoot, 'index.html');

const log = logger.child({ module: 'Server' });

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
    if (!req.url) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
    }

    const origin = `http://${req.headers.host ?? `${HOST}:${PORT}`}`;
    const requestUrl = new URL(req.url, origin);
    const { pathname } = requestUrl;

    // CORS preflight
    if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
        handleCorsPreflight(res);
        return;
    }

    // API: Status
    if (pathname === '/api/status' && req.method === 'GET') {
        respondJson(res, 200, { success: true, message: 'Server ready.' });
        return;
    }

    // API: Spotify Run
    if (pathname === '/api/spotify/run' && req.method === 'POST') {
        await handleSpotifyRun(req, res);
        return;
    }

    // Static files
    await serveStatic(pathname, res);
});

server.listen(PORT, HOST, () => {
    log.info({ host: HOST, port: PORT }, 'Server started');
});

function handleCorsPreflight(res: http.ServerResponse): void {
    res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
}

async function handleSpotifyRun(req: http.IncomingMessage, res: http.ServerResponse) {
    try {
        const bodyText = await readRequestBody(req);
        let payload: { limit?: number } = {};

        if (bodyText) {
            try {
                payload = JSON.parse(bodyText);
            } catch {
                respondJson(res, 400, { success: false, error: 'Invalid JSON.' });
                return;
            }
        }

        const limit = typeof payload.limit === 'number' ? payload.limit : config.spotify.pageLimit;

        log.info({ limit }, 'Running Spotify flow via API');

        const spotify = new SpotifyAdapter(config.spotify);
        const storage = new FileSystemAdapter(config.paths.output);
        const engine = new FlowEngine(spotify, storage);

        await engine.run({ limit });

        respondJson(res, 200, {
            success: true,
            message: 'Flow completed.',
            output: 'liked_songs.json',
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error({ error: message }, 'Spotify flow failed');
        respondJson(res, 500, { success: false, error: message });
    }
}

async function serveStatic(urlPath: string, res: http.ServerResponse): Promise<void> {
    let relativePath = decodeURIComponent(urlPath);

    if (!relativePath || relativePath === '/') {
        await streamFile(defaultIndex, res);
        return;
    }

    let candidatePath: string;
    if (relativePath.startsWith('/outputs/')) {
        candidatePath = path.join(projectRoot, relativePath);
    } else {
        candidatePath = path.join(uiRoot, relativePath);
    }
    candidatePath = path.normalize(candidatePath);

    if (!isInside(projectRoot, candidatePath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    if (!(await exists(candidatePath))) {
        await streamFile(defaultIndex, res);
        return;
    }

    const stats = await fs.stat(candidatePath);
    if (stats.isDirectory()) {
        await streamFile(path.join(candidatePath, 'index.html'), res);
        return;
    }

    await streamFile(candidatePath, res);
}

async function streamFile(filePath: string, res: http.ServerResponse): Promise<void> {
    try {
        const extension = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[extension] ?? 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' });
        const stream = createReadStream(filePath);
        stream.pipe(res);
        stream.on('error', () => {
            if (!res.headersSent) res.writeHead(500);
            res.end('Internal Server Error');
        });
    } catch {
        if (!res.headersSent) res.writeHead(404);
        res.end('Not Found');
    }
}

function respondJson(res: http.ServerResponse, status: number, payload: unknown): void {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(payload));
}

function readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

async function exists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function isInside(parent: string, target: string): boolean {
    const relative = path.relative(parent, target);
    return !relative.startsWith('..') && !path.isAbsolute(relative);
}
