import { BOARD_ITEM_SIZES, BOARD_LAYOUT_VERSION } from '@flows/shared';
import { t } from 'elysia';

export const boardItemSchema = t.Object({
  flowId: t.String({ minLength: 1 }),
  collapsed: t.Boolean(),
  size: t.Union([
    t.Literal(BOARD_ITEM_SIZES[0]),
    t.Literal(BOARD_ITEM_SIZES[1]),
    t.Literal(BOARD_ITEM_SIZES[2]),
  ]),
});

export const boardSchema = t.Object({
  id: t.String(),
  name: t.String(),
  isDefault: t.Boolean(),
  layoutVersion: t.Literal(BOARD_LAYOUT_VERSION),
  items: t.Array(boardItemSchema),
  createdAt: t.String(),
  updatedAt: t.String(),
});

export const boardsSnapshotSchema = t.Object({
  boards: t.Array(boardSchema),
  activeBoard: boardSchema,
});

export const boardCreateSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 80 }),
  layoutVersion: t.Optional(t.Literal(BOARD_LAYOUT_VERSION)),
  items: t.Optional(t.Array(boardItemSchema, { maxItems: 100 })),
});

export const boardRenameSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 80 }),
});

export const boardLayoutUpdateSchema = t.Object({
  layoutVersion: t.Literal(BOARD_LAYOUT_VERSION),
  items: t.Array(boardItemSchema, { maxItems: 100 }),
});

export const boardErrorSchema = t.Object({ error: t.String() });
