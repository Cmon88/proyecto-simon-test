# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# OS deps for Prisma engines
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install --include=dev

COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 4000
# At container start, sync schema (idempotent) and launch server. docker-compose overrides this to also seed.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
