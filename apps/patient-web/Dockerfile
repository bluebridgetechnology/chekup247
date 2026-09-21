# ==============================================================================
# ChekUp247 Patient Web (Next.js) Dockerfile
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
COPY apps/patient-web ./apps/patient-web


# Build design tokens first
RUN npm run build --workspace=@chekup247/design-tokens

# Public Next.js build-time environment variables
ARG NEXT_PUBLIC_API_URL=https://api.chekup.co.za/api/v1
ARG NEXT_PUBLIC_DOCTOR_PORTAL_URL=https://doctor.chekup.co.za
ARG NEXT_PUBLIC_SITE_URL=https://chekup.co.za
ARG NEXT_PUBLIC_APP_URL=https://chekup.co.za

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_DOCTOR_PORTAL_URL=$NEXT_PUBLIC_DOCTOR_PORTAL_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build --workspace=@chekup247/patient-web

# --- Stage 3: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy public static files
COPY --from=builder /app/apps/patient-web/public ./apps/patient-web/public

# Copy Next.js standalone output
COPY --from=builder --chown=nextjs:nodejs /app/apps/patient-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/patient-web/.next/static ./apps/patient-web/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["node", "apps/patient-web/server.js"]
