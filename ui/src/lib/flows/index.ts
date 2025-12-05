// Flow exports
export { registerFlow, getFlows, getFlow, type FlowDefinition, type FlowStats } from './registry';

// Auto-register flows by importing them
import './spotify';
