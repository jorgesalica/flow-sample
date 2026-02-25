# Knowledge Synthesis: Standard Trading Theory

> **Status**: Deep Research Integrated
> **Key Insight**: Trading is probability management. We filter price through **Structure** (Context) and **Indicators** (Momentum) while strictly managing **Risk** (Survival).

## 1. Market Structure: The Context

* **Transactional Memory**: Support/Resistance are not lines; they are zones of "trapped inventory" where buyers/sellers are stuck.
* **The "Flip"**: Polarity changes. Broken Resistance becomes Support.
* **Breakout vs. Fakeout (Liquidity Trap)**:
  * *Real Breakout*: Sustained close beyond level + Volume Expansion.
  * *Fakeout*: Price pokes level to trigger Stop Losses (Liquidity Grab) and reverses.
  * *Bot Logic*: `If (High > Level && Close < Level)` -> Flag as Potential Fakeout.

## 2. Technical Quantification: The Calculus

### RSI (Relative Strength Index)

* **Formula**: Normalized momentum (0-100) using Wilder's Smoothing.
* **Divergence (The Truth Teller)**:
  * *Regular Bearish*: Price Higher High, RSI Lower High -> **Reversal**.
  * *Hidden Bullish*: Price Higher Low, RSI Lower Low -> **Continuation**.
* **Logic**: In Strong Trends ($H > 0.6$), ignore Overbought signals.

### MACD (Moving Average Convergence Divergence)

* **Mechanism**: Distance between 12-EMA and 26-EMA.
* **Histogram**: The "Derivative". Shrinking bars signal early momentum loss before the moving averages cross.

## 3. Risk Management: The Shield

* **The 1% Rule**: Position size is derived from determining risk, not account size.
  * `Position Size = (Account * 0.01) / (Entry - StopLoss)`
* **Stop Loss Logic**:
  * **Structure**: Below Swing Low.
  * **Volatility (ATR)**: `Entry - (2 * ATR)`. Never use arbitrary dollar amounts.
* **Expectancy**: R:R (Reward:Risk) must be > 2.0. If the distance to the next Resistance (Target) is less than 2x the risk, **ABORT TRADE**.

---

## 🤖 Advisor Implementation Logic

### How the LLM should speak
>
> "Market Structure shows a **Fakeout** at the $98k resistance; price wicked above but closed below. Volume did not expand. Additionally, RSI shows **Regular Bearish Divergence**.
>
> **Action**: Recommending Short Setup.
> **Risk Protocol**: Stop Loss placed at swign high + 2 ATR. Position size calculated for 1% risk. Verification: Reward to next support is 3.5R. Valid."

### Updated Flow Requirements

1. **Analyst Node**: Implement `isFakeout()` logic checking Candle Close vs Level.
2. **Analyst Node**: Calculate ATR (Average True Range) for dynamic Stop Loss placement.
3. **Risk Node**: Implement `calculatePositionSize()` based on the 1% formula.
