import 'dotenv/config';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

/**
 * Strict boolean parser for environment flags.
 *
 * IMPORTANT: do NOT use z.coerce.boolean() here — it is Boolean(value), so the
 * string "false" (and "0", "no") coerces to TRUE. That footgun previously meant
 * MPG_MOCK_MODE=false silently ENABLED mock mode (which disables payment
 * signature verification and exposes the dev-simulate endpoints). This parser
 * fails closed: only explicit truthy strings enable the flag.
 */
const booleanFlag = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v.trim() === '') return defaultValue;
      return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
    });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'staging']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),
  BASE_URL: z.string().default(''),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PAYMENT_GATEWAY: z.enum(['midtrans', 'megabank']).default('midtrans'),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  MIDTRANS_CLIENT_KEY: z.string().default(''),
  MIDTRANS_IS_PRODUCTION: booleanFlag(false),
  MPG_MOCK_MODE: booleanFlag(false),
  MPG_BASE_URL: z.string().url().default('https://developer.bankmega.app'),
  MPG_PARTNER_ID: z.string().default(''),
  MPG_CHANNEL_ID: z.string().min(1).default('95221'),
  MPG_SECRET_KEY: z.string().optional(),
  MPG_SECRET_KEY_PATH: z.string().optional().default('./mpg_secret.key'),
  MPG_CLIENT_ID: z.string().default(''),
  MPG_CLIENT_SECRET: z.string().default(''),
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

// Hard guarantee: mock mode can NEVER be active in production. Mock mode
// bypasses payment-gateway signature verification and mounts unauthenticated
// dev-simulate endpoints, so it must be impossible to enable in prod even by
// misconfiguration.
let mpgMockMode = _env.data.MPG_MOCK_MODE;
if (mpgMockMode && _env.data.NODE_ENV === 'production') {
  process.stderr.write(
    '[env] MPG_MOCK_MODE was enabled but NODE_ENV=production — forcing mock mode OFF.\n',
  );
  mpgMockMode = false;
}

// Read the MPG secret key from environment variable directly or fallback to file path
let mpgSecretKey = _env.data.MPG_SECRET_KEY;

if (!mpgSecretKey && !mpgMockMode) {
  const secretKeyPath = path.resolve(_env.data.MPG_SECRET_KEY_PATH);
  try {
    mpgSecretKey = fs.readFileSync(secretKeyPath, 'utf-8').trim();
  } catch (err) {
    process.stderr.write(
      `Failed to read MPG secret key from ${secretKeyPath} and MPG_SECRET_KEY env variable is not set.\n`,
    );
    throw new Error(`Failed to read MPG secret key: missing from both env and file`);
  }
}

// When Midtrans is the active gateway (and not Mega mock mode), the server key
// is mandatory — fail fast rather than at first checkout. In production the
// client key is required too so the hosted Snap page can initialise.
if (_env.data.PAYMENT_GATEWAY === 'midtrans' && !mpgMockMode) {
  if (!_env.data.MIDTRANS_SERVER_KEY) {
    process.stderr.write('[env] PAYMENT_GATEWAY=midtrans but MIDTRANS_SERVER_KEY is not set.\n');
    throw new Error('Missing MIDTRANS_SERVER_KEY for active Midtrans gateway');
  }
}

export const env = {
  ..._env.data,
  MPG_MOCK_MODE: mpgMockMode,
  MPG_SECRET_KEY: mpgSecretKey,
};
