import { logger } from '@flows/core';
import { Elysia } from 'elysia';
import { BoardConflictError, BoardNotFoundError, BoardValidationError } from '../domain/errors';
import { createBoardDatabase } from './database';
import { SQLiteBoardRepository } from './repository';
import {
  boardCreateSchema,
  boardErrorSchema,
  boardLayoutUpdateSchema,
  boardRenameSchema,
  boardsSnapshotSchema,
} from './schemas';
import { BoardService, type BoardApplication } from './service';

const log = logger.child({ module: 'BoardRoutes' });

function createDefaultBoardApplication(): BoardApplication {
  return new BoardService(new SQLiteBoardRepository(createBoardDatabase()));
}

const standardResponses = {
  200: boardsSnapshotSchema,
  400: boardErrorSchema,
  404: boardErrorSchema,
  409: boardErrorSchema,
  422: boardErrorSchema,
  500: boardErrorSchema,
};

export function createBoardRoutes(application: BoardApplication = createDefaultBoardApplication()) {
  return new Elysia({ prefix: '/api/boards' })
    .onError(({ code, error, set }) => {
      if (code === 'VALIDATION') {
        set.status = 422;
        return { error: 'Invalid board request' };
      }
      if (error instanceof BoardValidationError) {
        set.status = 400;
        return { error: error.message };
      }
      if (error instanceof BoardNotFoundError) {
        set.status = 404;
        return { error: 'Board not found' };
      }
      if (error instanceof BoardConflictError) {
        set.status = 409;
        return { error: error.message };
      }

      log.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Board request failed',
      );
      set.status = 500;
      return { error: 'Internal Server Error' };
    })
    .get('/', () => application.snapshot(), { response: standardResponses })
    .post(
      '/',
      ({ body, set }) => {
        set.status = 201;
        return application.create(body);
      },
      {
        body: boardCreateSchema,
        response: { ...standardResponses, 201: boardsSnapshotSchema },
      },
    )
    .patch('/:id', ({ params, body }) => application.rename(params.id, body.name), {
      body: boardRenameSchema,
      response: standardResponses,
    })
    .put('/:id/layout', ({ params, body }) => application.updateLayout(params.id, body), {
      body: boardLayoutUpdateSchema,
      response: standardResponses,
    })
    .post('/:id/select', ({ params }) => application.select(params.id), {
      response: standardResponses,
    })
    .delete('/:id', ({ params }) => application.delete(params.id), {
      response: standardResponses,
    });
}
