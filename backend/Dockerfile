FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY migrations ./migrations
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 3001

# Migraciones y seed corren solos al arrancar (ver src/index.js: arrancar()),
# así que no hace falta un paso aparte acá.
CMD ["node", "src/index.js"]
