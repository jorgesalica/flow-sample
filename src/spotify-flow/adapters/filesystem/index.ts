import fs from 'fs/promises';
import path from 'path';
import { StoragePort } from '../../core/ports';

export class FileSystemAdapter implements StoragePort {
    constructor(private baseDir: string) { }

    private getPath(key: string): string {
        // Ensure extension
        const filename = key.endsWith('.json') ? key : `${key}.json`;
        return path.join(this.baseDir, filename);
    }

    async save(key: string, data: unknown): Promise<void> {
        await fs.mkdir(this.baseDir, { recursive: true });
        const filePath = this.getPath(key);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }

    async load<T>(key: string): Promise<T | null> {
        const filePath = this.getPath(key);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(content) as T;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    async exists(key: string): Promise<boolean> {
        const filePath = this.getPath(key);
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}
