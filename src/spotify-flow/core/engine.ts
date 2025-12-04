import { SourcePort, StoragePort } from './ports';
import { FlowOptions } from './types';

export class FlowEngine {
    constructor(
        private source: SourcePort,
        private storage: StoragePort
    ) { }

    async run(options: FlowOptions): Promise<void> {
        console.log('[FlowEngine] Starting flow...');

        // 1. Export (Fetch)
        console.log('[FlowEngine] Step: Export (Fetching tracks...)');
        const tracks = await this.source.fetchTracks(options.limit);
        console.log(`[FlowEngine] Fetched ${tracks.length} tracks.`);

        // 2. Enrich (Simulated for now, but part of the flow)
        console.log('[FlowEngine] Step: Enrich');
        const enriched = await this.source.enrichTracks(tracks);

        // 3. Save (Single Source of Truth)
        await this.storage.save('enriched_likes', enriched);
        console.log('[FlowEngine] Saved enriched_likes.json');

        console.log('[FlowEngine] Flow completed successfully.');
    }
}
