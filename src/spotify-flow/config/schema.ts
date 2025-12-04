import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config();

const configSchema = z.object({
    spotify: z.object({
        clientId: z.string().min(1, "SPOTIFY_CLIENT_ID is required"),
        clientSecret: z.string().min(1, "SPOTIFY_CLIENT_SECRET is required"),
        redirectUri: z.string().url("SPOTIFY_REDIRECT_URI must be a valid URL"),
        refreshToken: z.string().optional(),
        pageLimit: z.coerce.number().default(20), // Default to 20 pages (1000 tracks)
    }),
    app: z.object({
        port: z.coerce.number().default(4173),
        host: z.string().default('127.0.0.1'),
    }),
    paths: z.object({
        output: z.string().default(path.resolve(process.cwd(), 'outputs', 'spotify')),
    }),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
    const raw = {
        spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri: process.env.SPOTIFY_REDIRECT_URI,
            refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
            pageLimit: process.env.SPOTIFY_PAGE_LIMIT,
        },
        app: {
            port: process.env.SPOTIFY_FLOW_PORT,
            host: process.env.SPOTIFY_FLOW_HOST,
        },
        paths: {
            output: process.env.SPOTIFY_OUTPUT_DIR,
        },
    };

    return configSchema.parse(raw);
}
