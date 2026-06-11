import winston from 'winston';
import LokiTransport from 'winston-loki';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format for console output.
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]${stack ? `: ${stack}` : `: ${message}`}${metaStr}`;
});

// Structured JSON format for production environments.
const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format.json());

const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'subscription-api' },
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
