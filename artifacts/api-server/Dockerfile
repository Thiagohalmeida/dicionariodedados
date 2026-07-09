# Dockerfile para API Server (Validador de Dicionário de Dados)
# Uso: docker build -t validador-api -f artifacts/api-server/Dockerfile .
#      docker run -p 5000:5000 --env-file artifacts/api-server/.env validador-api

FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all packages (needed for workspace dependencies)
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
COPY scripts/ scripts/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build API server
RUN pnpm --filter @workspace/api-server run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built artifacts and dependencies
COPY --from=base /app/node_modules node_modules
COPY --from=base /app/artifacts/api-server/dist artifacts/api-server/dist
COPY --from=base /app/artifacts/api-server/package.json artifacts/api-server/package.json
COPY --from=base /app/lib lib
COPY --from=base /app/package.json .
COPY --from=base /app/pnpm-lock.yaml .

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]