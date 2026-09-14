# ── build ──
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_API_URL se hornea en el bundle en build time (Vite no lee env vars en
# runtime) — se pasa como build arg para no atarlo a un valor fijo acá.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ── runtime ──
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/dist ./dist
COPY scripts/start.mjs ./scripts/start.mjs

EXPOSE 3000
# Mismo script que "npm start" (scripts/start.mjs): lee PORT en runtime, no
# en build time — Railway y la mayoría de PaaS lo asignan por variable de
# entorno, así que no puede quedar fijo o el proxy no encuentra el
# contenedor escuchando donde espera.
CMD ["node", "scripts/start.mjs"]
