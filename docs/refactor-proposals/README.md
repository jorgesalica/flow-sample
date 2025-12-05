# Architectural Refactoring Proposals

This document outlines technical improvements to evolve the project from a prototype to a robust, scalable system.

## 1. Backend: Hexagonal Architecture (Ports & Adapters)

**Problem**: The current `flowRunner` is tightly coupled to the Spotify implementation and the file system.
**Goal**: Decouple the "Flow" logic from external systems.

### Proposal
*   **Core Domain**: Define a generic `FlowEngine` that knows nothing about Spotify. It only knows about `Steps` (Export, Enrich, Compact).
*   **Ports (Interfaces)**:
    *   `SourcePort`: Interface for fetching data (e.g., `fetchItems(limit: number)`).
    *   `StoragePort`: Interface for saving data (e.g., `save(key: string, data: any)`).
*   **Adapters (Implementations)**:
    *   `SpotifyAdapter` implements `SourcePort`.
    *   `FileSystemAdapter` implements `StoragePort`.
    *   *Future*: `NotionAdapter`, `SQLiteAdapter`.

**Benefit**: You can swap "Spotify" for "YouTube" or "FileSystem" for "S3" without touching the core logic.

## 2. Frontend: Component-Based Architecture

**Problem**: `app.js` is a "God Object" (600+ lines) handling state, fetching, rendering, and filtering.
**Goal**: Break the UI into small, single-responsibility components.

### Proposal
*   **State Management**: Extract state to a `Store` class (Observer pattern). Components subscribe to changes.
*   **Components**:
    *   `TrackGrid`: Accepts a list of tracks and renders them.
    *   `FilterBar`: Renders dropdowns and emits "filter changed" events.
    *   `MetricsPanel`: Pure component that just displays numbers.
*   **Services**:
    *   `ApiClient`: Typed wrapper for `fetch('/api/...')`.
    *   `DataTransformer`: Pure functions to convert raw JSON to UI models.

**Benefit**: Easier testing, cleaner code, and reusability.

## 3. Data Layer: Local-First SQL (DuckDB / SQLite)

**Problem**: Loading 10,000 JSON objects into memory and filtering with JavaScript arrays is inefficient and hard to query complexly.
**Goal**: Enable complex queries and better performance.

### Proposal
*   **Transition**: Move from `JSON` files to a local `SQLite` or `DuckDB` file.
*   **Workflow**:
    1.  **Export**: Fetch from Spotify -> Insert into Staging Table.
    2.  **Enrich**: Read Staging -> Fetch Metadata -> Update Rows.
    3.  **Query**: The UI sends SQL queries to the backend (e.g., `SELECT * FROM tracks WHERE year = 2023`).

**Benefit**: Instant filtering of millions of rows, complex analytics (aggregations), and standard data integrity.

## 4. Configuration: Centralized & Typed

**Problem**: Config is scattered (`.env`, `config.ts`, hardcoded constants).
**Goal**: Single source of truth.

### Proposal
*   **Config Schema**: Use `zod` or similar to validate configuration at startup.
*   **Structure**:
    ```typescript
    interface Config {
      spotify: { clientId: string; ... };
      app: { pageLimit: number; port: number };
      paths: { output: string; ... };
    }
    ```

**Benefit**: Fail fast if config is missing/wrong, and full autocomplete in the IDE.
