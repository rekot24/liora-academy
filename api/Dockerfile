# Build from the REPO ROOT so the shared db/ code is available:
#   docker compose -f api/docker-compose.yml build
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/api

# dependencies first (cached unless package files change)
COPY api/package.json api/package-lock.json ./
RUN npm ci --omit=dev

# the API itself, plus the shared database code it imports (../../db/lib), seed data and migrations
COPY api/src ./src
COPY db/lib /app/db/lib
COPY db/seed /app/db/seed
COPY db/migrations /app/db/migrations

USER node
CMD ["node", "src/index.mjs"]
