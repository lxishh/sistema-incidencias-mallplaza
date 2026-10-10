FROM node:20-bookworm-slim

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
COPY db/migrations/ /app/db/migrations/

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && node src/server.js"]
