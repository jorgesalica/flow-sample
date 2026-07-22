# Master Synthesis: The Fractal Advisor Strategy

> **Purpose**: This document unifies the mathematics of chaos (Fractals) with the mechanics of trading (Liquidity/Standard Theory) into a single decision engine.

## 🧠 The Cognitive Flow

The "Advisor" does not look at all data equally. It follows a hierarchy of **Regime -> Structure -> Signal -> Risk**.

```mermaid
graph TD
    Data[Raw Market Data] --> Metric{Hurst Exponent (H)}

    Metric -->|H > 0.6 (Persistent)| Trend[Trend Regime]
    Metric -->|H < 0.4 (Anti-Persist)| Range[Mean Reversion Regime]
    Metric -->|H ~ 0.5 (Random)| Noise[Noise Regime]

    subgraph Trend Logic
        Trend -->|Look For| Pullbacks[Hidden RSI Divergence]
        Trend -->|Look For| Breakouts[Fractal Node Breakout + Vol]
        Trend -->|Ignored| Oversold[Ignore RSI Overbought]
    end

    subgraph Range Logic
        Range -->|Look For| Fakes[Fakeouts / Liquidity Sweeps]
        Range -->|Look For| Divs[Regular RSI Divergence]
        Range -->|Ignored| MA[Ignore Moving Averages]
    end

    subgraph Noise Logic
        Noise -->|Action| Wait[Advice: Cash is a Position]
    end

    Pullbacks & Breakouts & Fakes & Divs --> Confluence{Fractal Confluence}

    Confluence -->|HTF + LTF Align| Setup[High Prob Setup]

    Setup --> Validation{Risk Check}
    Validation -->|R:R > 2.0 & Position=1%| Signal[EXECUTE]
    Validation -->|R:R < 2.0| Abort[SKIP - Bad Expectancy]
```

## 📐 The Four Pillars of Wisdom

### 1. The Regime (Hurst)

The Compass.

- _Logic_: If $H > 0.6$ (Trend), `Enable_Strategies = [MACD_Cross, Breakouts]`. If $H < 0.4$ (Range), `Enable_Strategies = [RSI_Div, Fakes]`.

### 2. The Structure (Fractals + Standard)

The Terrain.

- **Fractal Nodes**: Liquidity Pools.
- **Support/Resistance**: "Trapped" Memory Zones.
- _Logic_: Breakout valid ONLY IF `Close > Level` AND `Vol > Avg`. Else = **Fakeout**.

### 3. The Confluence (Alignment)

The Confirmation.

- **Divergence**: Does Momentum agree with Price?
  - _Regular_: Reversal Warning.
  - _Hidden_: Trend Fuel.
- _Logic_: Signal valid ONLY IF `HTF_Direction == LTF_Direction`.

### 4. The Shield (Risk Math)

The Law.

- **Position Sizing**: Fixed Fractional (1% Risk).
- **Stop Loss**: `Entry +/- (2 * ATR)`.
- **Expectancy**: Target must be $> 2 \times Risk$.

## 🚀 Implementation Directive

Our **State Machine** now calculates:

1. **Regime**: Hurst Exponent.
2. **Geometry**: Fractal Dimension + Nodes.
3. **Momentum**: RSI Divergence + Volume Profile.
4. **Math**: ATR for Volatility-based Stops + R:R Calc.
