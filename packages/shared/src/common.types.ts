/**
 * Common types used across multiple flows
 */

// UI status
export type StatusTone = 'info' | 'success' | 'warning' | 'error';

export interface StatusMessage {
  message: string;
  tone: StatusTone;
}

// Search & Pagination
export interface SearchOptions {
  page?: number;
  limit?: number;
  q?: string;
  genre?: string;
  year?: number;
  sortBy?: 'added_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// UI component types
export interface SelectOption {
  value: string;
  label: string;
}

// Stats types
export interface YearRange {
  oldest: number;
  newest: number;
}
