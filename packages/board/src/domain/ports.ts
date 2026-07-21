import type { Board, BoardItem } from '@flows/shared';

export interface BoardRepository {
  list(): Board[];
  findById(id: string): Board | null;
  findByName(name: string): Board | null;
  findDefault(): Board | null;
  findActive(): Board | null;
  create(board: Board): Board;
  rename(id: string, name: string, updatedAt: string): Board | null;
  updateLayout(
    id: string,
    layoutVersion: Board['layoutVersion'],
    items: BoardItem[],
    updatedAt: string,
  ): Board | null;
  select(id: string): void;
  delete(id: string): boolean;
}
