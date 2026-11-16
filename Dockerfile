FROM node:22.21.1-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && mkdir -p /data && chown node:node /data
USER node
ENV NODE_ENV=production PORT=4320
EXPOSE 4320
CMD ["node", "server/local.mjs"]
