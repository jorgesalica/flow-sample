import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BOARD_LAYOUT_VERSION } from '@flows/shared';
import { createBoardRoutes } from '../../src/backend/routes';
import { SQLiteBoardRepository } from '../../src/backend/repository';
import { BoardService, type BoardApplication } from '../../src/backend/service';

describe('Board routes', () => {
  let database: Database.Database;
  let service: BoardService;

  beforeEach(() => {
    database = new Database(':memory:');
    service = new BoardService(new SQLiteBoardRepository(database), {
      createId: () => 'generated',
      now: () => '2026-07-21T00:00:00.000Z',
    });
  });

  afterEach(() => database.close());

  function request(path: string, init?: RequestInit): Promise<Response> {
    return createBoardRoutes(service).handle(new Request(`http://localhost${path}`, init));
  }

  it('lists the bootstrapped active board', async () => {
    const response = await request('/api/boards');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      activeBoard: { id: 'default', isDefault: true },
      boards: [{ id: 'default' }],
    });
  });

  it('creates, renames, updates, selects, and deletes a board', async () => {
    const createResponse = await request('/api/boards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Research' }),
    });
    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.activeBoard.id).toBe('board_generated');

    const renameResponse = await request('/api/boards/board_generated', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ideas' }),
    });
    expect(renameResponse.status).toBe(200);
    expect((await renameResponse.json()).activeBoard.name).toBe('Ideas');

    const layoutResponse = await request('/api/boards/board_generated/layout', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        layoutVersion: BOARD_LAYOUT_VERSION,
        items: [{ flowId: 'spotify', collapsed: true, size: 'wide' }],
      }),
    });
    expect(layoutResponse.status).toBe(200);
    expect((await layoutResponse.json()).activeBoard.items).toEqual([
      { flowId: 'spotify', collapsed: true, size: 'wide' },
    ]);

    expect((await request('/api/boards/default/select', { method: 'POST' })).status).toBe(200);
    const deleteResponse = await request('/api/boards/board_generated', { method: 'DELETE' });
    expect(deleteResponse.status).toBe(200);
    expect((await deleteResponse.json()).boards).toHaveLength(1);
  });

  it('maps schema, domain, conflict, and absence errors deliberately', async () => {
    const invalidSchema = await request('/api/boards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Valid',
        items: [{ flowId: 'x', collapsed: false, size: 'huge' }],
      }),
    });
    expect(invalidSchema.status).toBe(422);
    await expect(invalidSchema.json()).resolves.toEqual({ error: 'Invalid board request' });

    const invalidName = await request('/api/boards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });
    expect(invalidName.status).toBe(400);

    const defaultDelete = await request('/api/boards/default', { method: 'DELETE' });
    expect(defaultDelete.status).toBe(409);
    await expect(defaultDelete.json()).resolves.toEqual({
      error: 'The default board cannot be deleted',
    });

    const missing = await request('/api/boards/missing/select', { method: 'POST' });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: 'Board not found' });
  });

  it('sanitizes unexpected application failures', async () => {
    const fail = () => {
      throw new Error('database details');
    };
    const failingApplication = {
      snapshot: fail,
      create: fail,
      rename: fail,
      updateLayout: fail,
      select: fail,
      delete: fail,
    } satisfies BoardApplication;

    const response = await createBoardRoutes(failingApplication).handle(
      new Request('http://localhost/api/boards'),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Internal Server Error' });
  });
});
