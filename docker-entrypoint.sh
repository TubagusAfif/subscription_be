#!/bin/sh
set -e

# Materialize the MegaPayment secret key from an env var (mirrors railway.toml).
# Only writes when MPG_SECRET_KEY is provided so local/dev runs stay optional.
if [ -n "$MPG_SECRET_KEY" ]; then
  TARGET="${MPG_SECRET_KEY_PATH:-./mpg_secret.key}"
  printf '%s\n' "$MPG_SECRET_KEY" > "$TARGET"
  echo "[entrypoint] wrote MPG secret key to $TARGET"
fi

# Apply pending migrations unless explicitly disabled.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] running prisma migrate deploy"
  npx prisma migrate deploy
fi

# Seeding is opt-in (off by default) — turn on for first boot of a fresh DB.
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] running prisma db seed"
  npx prisma db seed
fi

echo "[entrypoint] starting: $*"
exec "$@"
