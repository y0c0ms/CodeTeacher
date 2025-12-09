FROM node:22-bookworm AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && npm prune --production

FROM node:22-bookworm AS runner
WORKDIR /app

# Install Go for on-demand execution
RUN apt-get update && apt-get install -y golang-go && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV API_PORT=3001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/vite.config.ts ./vite.config.ts
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/index.html ./index.html
COPY --from=builder /app/tsconfig*.json ./
COPY --from=builder /app/postcss.config.js ./postcss.config.js

USER node

EXPOSE 4173
EXPOSE 3001

CMD ["npm", "run", "start:prod"]

