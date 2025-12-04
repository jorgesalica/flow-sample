import { SourcePort, StoragePort } from './ports';
import { FlowOptions } from './types';

export class FlowEngine {
    constructor(
        private source: SourcePort,
        private storage: StoragePort
    ) { }

    async run(options: FlowOptions): Promise<void> {
        console.log('[FlowEngine] Starting flow...');

        const tracks = await this.source.fetchTracks(options.limit);
        console.log(`[FlowEngine] Fetched ${tracks.length} tracks.`);

        await this.storage.saveTracks(tracks);
        console.log('[FlowEngine] Saved tracks.');

        console.log('[FlowEngine] Flow completed.');
    }
}
