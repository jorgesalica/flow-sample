export * from './board-card';
export { createFlowRegistry, type FlowDefinition, type FlowRegistry } from './registry';

import { createFlowRegistry } from './registry';
import { canvasFlow } from './canvas';
import { chatFlow } from './chat';
import { lyricsFlow } from './lyrics';
import { spotifyFlow } from './spotify';
import { tradingFlow } from './trading/trading';

const registry = createFlowRegistry([spotifyFlow, tradingFlow, lyricsFlow, chatFlow, canvasFlow]);

export const getFlows = registry.getFlows;
export const getFlow = registry.getFlow;
