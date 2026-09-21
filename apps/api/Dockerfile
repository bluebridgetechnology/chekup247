# ==============================================================================
# ChekUp247 NestJS API Dockerfile (Production Multi-Stage Build)
# ==============================================================================

# --- Stage 1: Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY apps/api/package.json ./apps/api/
COPY apps/patient-web/package.json ./apps/patient-web/
COPY apps/doctor-portal/package.json ./apps/doctor-portal/
COPY apps/admin-panel/package.json ./apps/admin-panel/

# Install all dependencies for build
RUN npm ci

# Copy source code
COPY packages/design-tokens ./packages/design-tokens
COPY apps/api ./apps/api

# Build shared packages and NestJS API
RUN npm run build --workspace=@chekup247/design-tokens
RUN npm run build --workspace=@chekup247/api

# --- Stage 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache curl

# Create non-root system user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

# Copy package manifests for production install
COPY package.json package-lock.json ./
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY apps/api/package.json ./apps/api/
COPY apps/patient-web/package.json ./apps/patient-web/
COPY apps/doctor-portal/package.json ./apps/doctor-portal/
COPY apps/admin-panel/package.json ./apps/admin-panel/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/packages/design-tokens/dist ./packages/design-tokens/dist
COPY --from=builder /app/packages/design-tokens/src ./packages/design-tokens/src
COPY --from=builder /app/apps/api/dist ./apps/api/dist

USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/health/live || exit 1

CMD ["node", "apps/api/dist/main.js"]
