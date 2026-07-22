# Architecture Diagrams: Trading Bot Flow

> **Status**: Design Phase
> **Purpose**: Visualizing the structure, databases, and container interactions of the Sovereign Trading Advisor.

## 1. Data Schema (ERD) - `trading.db`

The persistence layer (N2) uses a dedicated SQLite database to ensure isolation. `trading.db` is separate from the main `flow.db`.

```mermaid
erDiagram
    CANDLES {
        int id PK
        string symbol "e.g. BTCUSDT"
        string interval "e.g. 1m, 1h"
        int open_time "Timestamp (ms)"
        float open
        float high
        float low
        float close
        float volume
        int close_time
    }

    FRACTAL_NODES {
        int id PK
        string symbol
        string timeframe "e.g. 1d, 4h"
        float price_level
        string type "RESISTANCE_HIGH | SUPPORT_LOW"
        boolean is_swept "True if wicked but not closed"
        boolean is_broken "True if closed beyond"
        int created_at_candle_id FK
    }

    ADVISOR_LOGS {
        int id PK
        int candle_id FK
        float hurst_value
        string regime "TRENDING | MEAN_REVERSION | NOISE"
        string llm_response "Raw text from N5"
        datetime created_at
    }

    CANDLES ||--o{ FRACTAL_NODES : "generates"
    CANDLES ||--o{ ADVISOR_LOGS : "analyzed_in"
```

## 2. C4 Model - Level 1: System Context

How the Trading Advisor fits into the user's world and external systems.

```mermaid
graph TD
    user(User) -- Views Dashboard / Configures --> trading_bot[Trading Advisor Bot]
    trading_bot -- Subscribes to Ticks --> binance[Binance API]
    trading_bot -- Sends Context prompts --> llm_provider[LLM Provider]

    subgraph External Systems
        binance
        llm_provider
    end
```

## 3. C4 Model - Level 2: Container Diagram

The internal anatomy of the "Trading Advisor" system.

```mermaid
graph TB
    subgraph frontend [Frontend]
        UI[Svelte Dashboard]
    end

    subgraph backend [Backend Application]
        N1[N1: Watcher Service]
        N2[N2: Persistence Layer]
        N3[N3: Navigator Logic]
        N4[N4: Prompt Builder]
        N5[N5: LLM Client]
        DB[(Trading DB SQLite)]
    end

    UI -- Polls / SSE Updates --> N1
    N1 -- Emits Candle Closed --> N2
    N2 -- Writes Data --> DB
    N2 -- Triggers Analysis --> N3
    N3 -- Reads History --> DB
    N3 -- Passes MarketState --> N4
    N4 -- Passes Prompt --> N5
    N5 -- Returns Insight --> UI
```

## 4. Sequence Diagram: The "Heartbeat" Cycle

The flow of a single minute in the system.

```mermaid
sequenceDiagram
    participant Binance
    participant N1_Watcher
    participant N2_Scribe
    participant DB as TradingDB
    participant N3_Navigator
    participant N5_Captain
    participant UI_Dashboard

    Binance->>N1_Watcher: kline_1m (Final: True)
    N1_Watcher->>N2_Scribe: Emit CANDLE_CLOSED
    N2_Scribe->>DB: INSERT Candle
    N2_Scribe->>N3_Navigator: Trigger Analysis(candle_id)

    rect rgb(240, 248, 255)
    note right of N3_Navigator: Math Phase
    N3_Navigator->>DB: SELECT last 500 candles
    N3_Navigator->>N3_Navigator: Calc Hurst & Fractals
    end

    alt Regime == NOISE
        N3_Navigator-->>UI_Dashboard: Status: WAIT
    else Regime == TRENDING
        N3_Navigator->>N5_Captain: "Analyze Trend Context"
        N5_Captain-->>UI_Dashboard: "Trend Continuation Likely"
    end
```
