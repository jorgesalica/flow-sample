import { SourcePort, StoragePort } from './ports';
import { FlowOptions } from './types';
import { logger } from './logger';

export class FlowEngine {
    private log = logger.child({ module: 'FlowEngine' });

    constructor(
        private source: SourcePort,
        private storage: StoragePort
    ) { }

    async run(options: FlowOptions): Promise<void> {
        this.log.info({ limit: options.limit }, 'Starting flow');

        const tracks = await this.source.fetchTracks(options.limit);
        this.log.info({ count: tracks.length }, 'Fetched tracks');

        await this.storage.saveTracks(tracks);
        this.log.info('Saved tracks');

        this.log.info('Flow completed');
    }
}
