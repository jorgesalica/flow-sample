# @flows/core

Shared infrastructure utilities for the Flow monorepo.

## What's Inside

- **Logger** — Pre-configured [Pino](https://getpino.io/) logger with pretty-print for development
- **Shared utilities** — Common helpers used across flow packages

## Usage

```ts
import { logger } from '@flows/core';

const log = logger.child({ module: 'MyModule' });
log.info('Hello from MyModule');
```
