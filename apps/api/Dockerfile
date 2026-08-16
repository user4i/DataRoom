FROM node:26.7.0-bookworm-slim
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install --omit=dev=false

COPY . .
WORKDIR /app
RUN npm run db:generate && npm run build:api

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
