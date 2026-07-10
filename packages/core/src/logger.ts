import pino from 'pino';

type LoggerEnv = Record<string, string | undefined>;

export function createLoggerConfigFromEnv(env: LoggerEnv = process.env) {
    return {
        isDev: env.NODE_ENV !== 'production',
        level: env.LOG_LEVEL || 'info',
    };
}

const config = createLoggerConfigFromEnv();

export const logger = pino({
    level: config.level,
    transport: config.isDev
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});
