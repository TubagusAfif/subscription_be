import winston from 'winston';
import LokiTransport from 'winston-loki';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format for console output.
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  // Format metadata
  let metaStr = '';
  if (Object.keys(meta).length) {
    // Custom replacer to handle Error objects inside meta
    metaStr = `\n${JSON.stringify(meta, (key, value) => {
      if (value instanceof Error) {
        return { ...value, message: value.message, stack: value.stack };
      }
      return value;
    }, 2)}`;
  }

  let logOutput = message;
  if (stack) {
    // If stack doesn't already include the message, prepend it
    if (typeof message === 'string' && typeof stack === 'string' && !stack.includes(message)) {
      logOutput = `${message}\n${stack}`;
    } else {
      logOutput = stack;
    }
  }

  return `${timestamp} [${level}]: ${logOutput}${metaStr}`;
});

// Structured JSON format for production environments.
const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format.json());

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format:
    env.NODE_ENV === 'production'
      ? prodFormat
      : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), devFormat),
  transports: [new winston.transports.Console()],
});

if (env.GRAFANA_LOKI_HOST && env.GRAFANA_LOKI_API_TOKEN) {
  logger.add(
    new LokiTransport({
      host: env.GRAFANA_LOKI_HOST,
      basicAuth: env.GRAFANA_LOKI_API_TOKEN,
      labels: { app: 'subscription-api', component: 'payment-audit' },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error('Loki connection error:', err),
    })
  );
}


// Express-compatible stream for HTTP request logging.
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export { logger };
