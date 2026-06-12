import 'dotenv/config';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  BASE_URL: z.string().default(''),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MPG_BASE_URL: z.string().url().default('https://developer.bankmega.app'),
  MPG_PARTNER_ID: z.string().min(1),
  MPG_CHANNEL_ID: z.string().min(1).default('95221'),
  MPG_SECRET_KEY_PATH: z.string().min(1),
  MPG_CLIENT_ID: z.string().min(1),
  MPG_CLIENT_SECRET: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SERVICE: z.string().min(1),
  SMTP_MAIL: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  CLIENT_APP_URL: z.string().default('http://localhost:8085'),
  ALLOWED_ORIGINS: z.string().default(''),
  SENTRY_DSN: z.string().optional(),
  WALLET_DEFAULT_BALANCE: z.coerce.number().int().nonnegative().default(300),
  WEBHOOK_SHARED_SECRET: z.string().min(32),
  DOMAIN2_BASE_URL: z.string().url(),
  GRAFANA_LOKI_HOST: z.string().url().optional(),
  GRAFANA_LOKI_API_TOKEN: z.string().optional(),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  // Logger unavailable here (circular dep) — write directly to stderr
  process.stderr.write(`Invalid environment variables: ${JSON.stringify(_env.error.format())}\n`);
  throw new Error('Invalid environment variables');
}

// Read the MPG secret key from the file path specified in .env
const secretKeyPath = path.resolve(_env.data.MPG_SECRET_KEY_PATH);
let mpgSecretKey: string;
try {
  mpgSecretKey = fs.readFileSync(secretKeyPath, 'utf-8').trim();
} catch (err) {
  process.stderr.write(`Failed to read MPG secret key from ${secretKeyPath}\n`);
  throw new Error(`Failed to read MPG secret key file: ${secretKeyPath}`);
}

export const env = {
  ..._env.data,
  MPG_SECRET_KEY: mpgSecretKey,
};

