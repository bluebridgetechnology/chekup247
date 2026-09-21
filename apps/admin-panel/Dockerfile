# ==============================================================================
# ChekUp247 Admin Isolated Panel (Next.js) Dockerfile
# ==============================================================================

# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
COPY packages/design-tokens/package.json ./packages/design-tokens/
COPY apps/api/package.json ./apps/api/
COPY apps/patient-web/package.json ./apps/patient-web/
COPY apps/doctor-portal/package.json ./apps/doctor-portal/
COPY apps/admin-panel/package.json ./apps/admin-panel/

RUN npm ci

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app ./
COPY packages/design-tokens ./packages/design-tokens
COPY apps/admin-panel ./apps/admin-panel


# Build design tokens first
RUN npm run build --workspace=@chekup247/design-tokens

# Public Next.js build-time environment variables
ARG NEXT_PUBLIC_API_URL=https://api.chekup.co.za/api/v1

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build --workspace=@chekup247/admin-panel

# --- Stage 3: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy public static files
COPY --from=builder /app/apps/admin-panel/public ./apps/admin-panel/public

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-panel/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin-panel/.next/static ./apps/admin-panel/.next/static

USER nextjs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3002 || exit 1

CMD ["node", "apps/admin-panel/server.js"]
