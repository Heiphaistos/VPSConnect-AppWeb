FROM node:20-alpine AS deps
WORKDIR /app
# Build tools required for node-pty native compilation on Alpine/musl
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY tsconfig.json .
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# bash for the web terminal, pm2 CLI to control host pm2 via mounted socket
RUN apk add --no-cache bash curl && npm install -g pm2
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
