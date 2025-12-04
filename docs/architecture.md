# System Architecture

This document outlines the architecture of Spotify Flow, moving from a high-level system overview to a detailed look at the backend engine.

## 1. System Overview (Zoom Out)

The system operates as a **three-part cycle** centered around local files. There is no complex database; the file system is the single source of truth.

1.  **The Motor (Backend Scripts)**: The "brain" that communicates with Spotify, executes the flow (Export -> Enrich -> Compact), and writes results to files.
2.  **The Warehouse (File System)**: The "memory" of the system. A simple directory (`outputs/`) containing text files (`.json`, `.csv`).
3.  **The Viewer (UI & Server)**: A lightweight frontend that *reads* from the Warehouse and visualizes the data. It is decoupled from the Motor.

```mermaid
graph TD
    Spotify[Spotify API] <--> Motor[Motor (Node.js)]
    Motor -->|Writes| Almacen[(Warehouse /outputs)]
    Almacen -->|Reads| Visor[Viewer (UI)]
    Visor -.->|Triggers| Motor
```

---

## 2. The Motor: Backend Engine (Zoom In)

The Backend Engine functions like an **assembly line**. It orchestrates the retrieval, processing, and refinement of data.

### Components

1.  **The Director (`flowRunner`)**:
    *   **Role**: Orchestrator.
    *   **Function**: Defines the sequence: Authenticate -> Export -> Enrich -> Compact. Handles error reporting.

2.  **The Miner (`exporter`)**:
    *   **Role**: Raw extraction.
    *   **Function**: Fetches all saved tracks from Spotify page by page (pagination). Produces the raw JSON.

3.  **The Historian (`enricher`)**:
    *   **Role**: Contextualization.
    *   **Function**: Enhances raw data with metadata (Artist Genres, Album Release Year). Transforms a list of names into a rich dataset.

4.  **The Editor (`compacter`)**:
    *   **Role**: Refinement.
    *   **Function**: Trims unnecessary data to create a lightweight, "pocket-sized" version for the UI.

5.  **The Diplomat (`spotifyClient`)**:
    *   **Role**: Communication.
    *   **Function**: Manages authentication (tokens), rate limiting, and direct API calls.

### Data Flow Diagram

```mermaid
graph LR
    Director[Director (FlowRunner)] -->|1. Starts| Minero[Miner (Exporter)]
    Minero -->|Raw Data| Historiador[Historian (Enricher)]
    Historiador -->|Rich Data| Editor[Editor (Compacter)]
    Editor -->|Clean Data| Salida[(Final Files)]
    
    Minero -.->|Uses| Diplomatico[Diplomat (Client)]
    Historiador -.->|Uses| Diplomatico
    Diplomatico <--> Spotify((Spotify API))
```
