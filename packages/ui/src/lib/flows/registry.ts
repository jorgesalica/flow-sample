// Flow Registry - Dynamic flow registration system

export interface FlowStats {
    count: number;
    status: 'active' | 'configured' | 'disabled' | 'error';
    statusMessage?: string;
}

export interface FlowDefinition {
    id: string;
    name: string;
    icon: string;
    description: string;
    route: string;
    color: string;
    getStats: () => Promise<FlowStats>;
}

// Registry of all available flows
const flowRegistry: FlowDefinition[] = [];

export function registerFlow(flow: FlowDefinition): void {
    // Avoid duplicates
    if (!flowRegistry.find((f) => f.id === flow.id)) {
        flowRegistry.push(flow);
    }
}

export function getFlows(): FlowDefinition[] {
    return [...flowRegistry];
}

export function getFlow(id: string): FlowDefinition | undefined {
    return flowRegistry.find((f) => f.id === id);
}
