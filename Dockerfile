FROM node:22-bookworm

# Install Go for the runner
RUN apt-get update && apt-get install -y golang-go && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 4173
EXPOSE 8787

ENV GO_RUNNER_PORT=8787

CMD ["npm", "run", "start:prod"]

