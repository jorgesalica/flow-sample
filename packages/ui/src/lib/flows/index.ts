// Flow exports
export { registerFlow, getFlows, getFlow, type FlowDefinition, type FlowStats } from './registry';

import { registerFlow } from './registry';
import { spotifyFlow } from './spotify';
import { tradingFlow } from './trading/trading';
import { lyricsFlow } from './lyrics';
import { chatFlow } from './chat';

// ──────────────────────────────────────────────
// The board manifest
//
// Every flow hung on the canvas, in display order.
// To add a flow: export its FlowDefinition, then list it here.
// This is the single place that decides what's on the board.
// ──────────────────────────────────────────────
const flows = [spotifyFlow, tradingFlow, lyricsFlow, chatFlow];
flows.forEach(registerFlow);
