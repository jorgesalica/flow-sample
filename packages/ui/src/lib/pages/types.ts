import type { FlowDefinition, FlowStats } from '@lib/flows';

export interface FlowCardModel extends FlowDefinition {
  stats: FlowStats;
}
