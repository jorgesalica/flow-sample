import type { BoardCardContract } from './board-card';

export interface FlowDefinition {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly route: string;
  readonly boardCard: BoardCardContract;
}

export interface FlowRegistry {
  readonly getFlows: () => FlowDefinition[];
  readonly getFlow: (id: string) => FlowDefinition | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNonEmptyString(value: Record<string, unknown>, field: string): boolean {
  return typeof value[field] === 'string' && value[field].trim().length > 0;
}

function parseFlowDefinition(value: unknown, index: number): FlowDefinition {
  if (!isRecord(value)) {
    throw new Error(`Invalid flow definition at index ${index}: expected an object.`);
  }

  for (const field of ['id', 'name', 'icon', 'description', 'route']) {
    if (!hasNonEmptyString(value, field)) {
      throw new Error(`Invalid flow definition at index ${index}: ${field} is required.`);
    }
  }

  if (!(value.route as string).startsWith('/')) {
    throw new Error(`Invalid flow definition at index ${index}: route must start with "/".`);
  }

  if (!isRecord(value.boardCard) || typeof value.boardCard.load !== 'function') {
    throw new Error(`Invalid flow definition at index ${index}: boardCard.load is required.`);
  }

  const boardCard = Object.freeze({
    load: value.boardCard.load as BoardCardContract['load'],
  });

  return Object.freeze({
    id: value.id as string,
    name: value.name as string,
    icon: value.icon as string,
    description: value.description as string,
    route: value.route as string,
    boardCard,
  });
}

export function createFlowRegistry(definitions: readonly unknown[]): FlowRegistry {
  const flows = definitions.map(parseFlowDefinition);
  const flowById = new Map<string, FlowDefinition>();

  for (const flow of flows) {
    if (flowById.has(flow.id)) throw new Error(`Duplicate flow id "${flow.id}".`);
    flowById.set(flow.id, flow);
  }

  return {
    getFlows: () => [...flows],
    getFlow: (id) => flowById.get(id),
  };
}
