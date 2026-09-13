# Stage 1 — build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — serve
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/knowledge-space/browser ./public
COPY server.js .
RUN ls -la /app && ls -la /app/public | head -5
EXPOSE 8080
CMD ["node", "server.js"]
