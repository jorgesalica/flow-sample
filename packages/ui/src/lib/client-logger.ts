type LogContext = Record<string, unknown>;

function write(method: 'debug' | 'error', message: string, context?: LogContext): void {
  if (method === 'debug' && !import.meta.env.DEV) return;
  const payload = context ? [message, context] : [message];
  console[method](...payload);
}

export const clientLogger = {
  debug(message: string, context?: LogContext): void {
    write('debug', message, context);
  },
  error(message: string, context?: LogContext): void {
    write('error', message, context);
  },
};
