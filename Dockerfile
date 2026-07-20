# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install all dependencies (dev deps are needed for vite/esbuild/tsc)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build frontend (dist/public) + server bundle (dist/boot.js)
COPY . .
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
