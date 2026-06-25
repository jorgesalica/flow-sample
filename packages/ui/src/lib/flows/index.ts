// Flow exports
export { registerFlow, getFlows, getFlow, type FlowDefinition, type FlowStats } from './registry';

// Auto-register flows by importing them
import './spotify';
import './trading/trading';
import { lyricsFlow } from './lyrics';
import { chatFlow } from './chat';
import { canvasFlow } from './canvas';
import { registerFlow } from './registry';

// Register
registerFlow(lyricsFlow);
registerFlow(chatFlow);
registerFlow(canvasFlow);
