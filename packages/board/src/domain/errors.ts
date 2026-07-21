export class BoardNotFoundError extends Error {
  constructor(id: string) {
    super(`Board ${id} was not found`);
    this.name = 'BoardNotFoundError';
  }
}

export class BoardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoardValidationError';
  }
}

export class BoardConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BoardConflictError';
  }
}
