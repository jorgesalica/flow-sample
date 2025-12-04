import http from 'http';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { runSpotifyFlow, type FlowRunConfig } from './scripts/core/flowRunner';
import type { CliOptions } from './scripts/types';

const HOST = process.env.SPOTIFY_FLOW_HOST ?? '127.0.0.1';
const PORT = Number.parseInt(process.env.SPOTIFY_FLOW_PORT ?? '4173', 10);

const projectRoot = path.resolve(__dirname, '..', '..');
const uiRoot = path.join(projectRoot, 'src', 'spotify-flow', 'ui');
const defaultIndex = path.join(uiRoot, 'index.html');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  const origin = `http://${req.headers.host ?? `${HOST}:${PORT}`}`;
  const requestUrl = new URL(req.url, origin);
  const { pathname } = requestUrl;

  if (req.method === 'OPTIONS' && pathname.startsWith('/api/spotify/')) {
    handleCorsPreflight(res);
    return;
  }

  if (pathname === '/api/spotify/status' && req.method === 'GET') {
    respondJson(res, 200, {
      success: true,
      message: 'Spotify Flow server ready.',
    });
    return;
  }

  if (pathname === '/api/spotify/run' && req.method === 'POST') {
    await handleRunRequest(req, res);
    return;
  }

  await serveStatic(pathname, res);
});

server.listen(PORT, HOST, () => {
  console.log(`[spotify-flow] serving UI + API at http://${HOST}:${PORT}`);
  console.log(`[spotify-flow] UI root: ${uiRoot}`);
});

function handleCorsPreflight(res: http.ServerResponse): void {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  });
  res.end();
}

async function handleRunRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  try {
    const bodyText = await readRequestBody(req);
    let payload: any = {};

    if (bodyText) {
      try {
        payload = JSON.parse(bodyText);
      } catch (error) {
        respondJson(res, 400, {
          success: false,
          error: 'Invalid JSON payload.',
        });
        return;
      }
    }

    const actions = normaliseActions(payload?.actions);
    const inputPath =
      typeof payload?.inputPath === 'string' && payload.inputPath.trim().length > 0
        ? payload.inputPath.trim()
        : undefined;

    const config: FlowRunConfig = {
      actions,
      inputPath,
      inputProvided: Boolean(inputPath),
      pageLimitOverride:
        typeof payload?.pageLimit === 'number' && Number.isFinite(payload.pageLimit)
          ? Math.floor(payload.pageLimit)
          : undefined,
    };

    const result = await runSpotifyFlow(config);

    respondJson(res, 200, {
      success: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const logs = (error as any)?.logs ?? [];
    const steps = (error as any)?.steps ?? [];
    const executed = (error as any)?.executed ?? undefined;
    const pageLimit = (error as any)?.pageLimit ?? undefined;

    respondJson(res, 500, {
      success: false,
      error: message,
      logs,
      steps,
      executed,
      pageLimit,
    });
  }
}

function normaliseActions(raw: unknown): CliOptions['actions'] {
  const actions = {
    export: true,
    enrich: true,
    compact: true,
  };

  if (!raw || typeof raw !== 'object') {
    return actions;
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.export === 'boolean') {
    actions.export = record.export;
  }
  if (typeof record.enrich === 'boolean') {
    actions.enrich = record.enrich;
  }
  if (typeof record.compact === 'boolean') {
    actions.compact = record.compact;
  }

  return actions;
}

async function serveStatic(urlPath: string, res: http.ServerResponse): Promise<void> {
  let relativePath = decodeURIComponent(urlPath);

  if (!relativePath || relativePath === '/') {
    await streamFile(defaultIndex, res);
    return;
  }

  if (relativePath.endsWith('/')) {
    relativePath = `${relativePath}index.html`;
  }

  let candidatePath: string;
  if (relativePath.startsWith('/outputs/')) {
    candidatePath = path.join(projectRoot, relativePath);
  } else {
    candidatePath = path.join(uiRoot, relativePath);
  }
  candidatePath = path.normalize(candidatePath);

  if (!isInside(projectRoot, candidatePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let filePath = candidatePath;

  if (!(await exists(filePath))) {
    if (!path.extname(filePath)) {
      const htmlFallback = `${filePath}.html`;
      if (await exists(htmlFallback)) {
        filePath = htmlFallback;
      } else {
        await streamFile(defaultIndex, res);
        return;
      }
    } else {
      await streamFile(defaultIndex, res);
      return;
    }
  } else {
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      if (await exists(indexPath)) {
        filePath = indexPath;
      } else {
        await streamFile(defaultIndex, res);
        return;
      }
    }
  }

  await streamFile(filePath, res);
}

async function streamFile(filePath: string, res: http.ServerResponse): Promise<void> {
  try {
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extension] ?? 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    });

    await fs.access(filePath);
    const stream = createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', (error) => {
      console.error('[spotify-flow] Stream error', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('Internal Server Error');
    });
  } catch (error) {
    console.error('[spotify-flow] Unable to serve file', filePath, error);
    if (!res.headersSent) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Not Found');
  }
}

function respondJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', (error) => reject(error));
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
