# syntax=docker/dockerfile:1

# ---------- base: shared OS layer ----------
# Node 24 LTS (close to your local v25). Debian slim + openssl for Prisma.
FROM node:24-bookworm-slim AS base
ENV NODE_ENV=production
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------- deps: install ALL deps (incl. dev) for the build ----------
FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build: generate prisma client + compile TS ----------
FROM deps AS build
COPY . .
# Runs both generators in schema.prisma (prisma-client-js + prisma-dbml-generator),
# which is why the dev deps above must be present.
RUN npx prisma generate \
    && npm run build

# ---------- runtime: lean image that actually runs ----------
FROM base AS runtime
ENV NODE_ENV=production

# Full node_modules from the build stage: keeps the generated Prisma client,
# the Prisma CLI (for `migrate deploy`) and ts-node (for `db seed`) available.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/public ./public
COPY package.json package-lock.json prisma.config.ts ./
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh \
    && mkdir -p public/uploads/images public/uploads/documents \
    && chown -R node:node /app

USER node
EXPOSE 8000

# Liveness check: server is up if the port answers (any status < 500).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD node -e "require('http').get({host:'127.0.0.1',port:process.env.PORT||8000,path:'/'},r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
