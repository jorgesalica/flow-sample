export { createBoardDatabase } from './backend/database';
export { SQLiteBoardRepository } from './backend/repository';
export { createBoardRoutes } from './backend/routes';
export { BoardService, type BoardApplication } from './backend/service';
export { BoardConflictError, BoardNotFoundError, BoardValidationError } from './domain/errors';
export type { BoardRepository } from './domain/ports';
