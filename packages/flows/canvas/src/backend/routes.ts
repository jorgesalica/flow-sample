import { logger } from '@flows/core';
import {
  createAnalysisRepository,
  type AnalysisRepository,
} from '@flows/analysis';
import { Elysia, t } from 'elysia';
import { CanvasAnalysisError } from '../domain/errors';
import { AnalysisCanvasRepository } from './repository';
import { CanvasService, type CanvasApplication } from './service';
import { analyzeText } from './text-analyzer';

const log = logger.child({ module: 'CanvasRoutes' });

export function createCanvasFlowApplication(
  repository: AnalysisRepository = createAnalysisRepository(),
): CanvasApplication {
  return new CanvasService(new AnalysisCanvasRepository(repository), analyzeText);
}

export function createCanvasFlowRoutes(
  service: CanvasApplication = createCanvasFlowApplication(),
) {
  return new Elysia({ prefix: '/api/canvas' })
    .get('/', () => service.list())
    .get('/:id', ({ params, set }) => {
      const analysis = service.get(params.id);

      if (!analysis) {
        set.status = 404;
        return { error: 'Canvas not found' };
      }

      return analysis;
    })
    .post(
      '/',
      async ({ body, set }) => {
        try {
          return await service.create(body);
        } catch (error) {
          if (!(error instanceof CanvasAnalysisError)) {
            throw error;
          }

          log.error({ error: error.message }, 'Canvas analysis failed');
          set.status = 503;
          return { error: 'AI analysis is temporarily unavailable' };
        }
      },
      {
        body: t.Object({
          text: t.String(),
          title: t.Optional(t.String()),
          author: t.Optional(t.String()),
        }),
      },
    )
    .delete('/:id', ({ params, set }) => {
      if (!service.delete(params.id)) {
        set.status = 404;
        return { error: 'Canvas not found' };
      }

      return { success: true };
    });
}
