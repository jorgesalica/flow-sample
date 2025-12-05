import fs from 'fs/promises';
import path from 'path';
import { StoragePort } from '../../core/ports';
import { Track } from '../../core/types';

const OUTPUT_FILE = 'liked_songs.json';

export class FileSystemAdapter implements StoragePort {
    constructor(private baseDir: string) { }

    private getPath(): string {
        return path.join(this.baseDir, OUTPUT_FILE);
    }

    async saveTracks(tracks: Track[]): Promise<void> {
        await fs.mkdir(this.baseDir, { recursive: true });
        const filePath = this.getPath();
        await fs.writeFile(filePath, JSON.stringify(tracks, null, 2), 'utf-8');
    }

    async loadTracks(): Promise<Track[] | null> {
        const filePath = this.getPath();
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content) as Track[];
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
}
