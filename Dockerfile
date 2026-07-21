# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install all dependencies (dev deps are needed for vite/esbuild/tsc).
# --include=dev is REQUIRED: Railway sets NODE_ENV=production at build time,
# which makes plain `npm ci` skip devDependencies → "sh: vite: not found".
# .npmrc pins registry.npmjs.org — the lockfile's "resolved" URLs must be
# reachable from Railway's builders.
COPY package.json package-lock.json .npmrc ./
RUN npm ci --include=dev --no-audit --no-fund --fetch-retries=5 || { \
      echo '=== npm ci failed — npm debug log follows ==='; \
      tail -n 100 /root/.npm/_logs/*debug-0.log 2>/dev/null; \
      exit 1; \
    }

# Copy source and build frontend (dist/public) + server bundle (dist/boot.js)
COPY . .
RUN test -x node_modules/.bin/vite || { \
      echo '=== vite missing after npm ci ==='; npm config list; \
      exit 1; \
    }
RUN npm run build \
  && npm prune --omit=dev

# ---------- Runtime stage ----------
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
# Railway injects PORT at runtime; the server reads process.env.PORT (default 3000)

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Database migrations + idempotent runner (applied at container start)
COPY --from=build /app/db/migrations ./db/migrations
COPY --from=build /app/db/run-migrations.mjs ./db/run-migrations.mjs

EXPOSE 3000

CMD ["sh", "-c", "node db/run-migrations.mjs && npm start"]
