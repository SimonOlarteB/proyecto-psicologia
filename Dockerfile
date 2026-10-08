# Imagen de producción para VPS / PaaS con Docker.
# Requiere: salida `standalone` (ya está en next.config.ts).

FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# El build no necesita base de datos ni secretos
# (las páginas son force-dynamic).
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no root.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Volumen para las fotos de perfil/blog/trayectoria.
# Súbelo a un volumen persistente y apunta UPLOAD_DIR aquí.
RUN mkdir -p /app/public/uploads \
 && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
