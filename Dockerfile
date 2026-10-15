# One image for any container host (Render, Railway, Fly.io…). Listens on $PORT.
ARG NODE_IMAGE=node:22-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm prune --prod

FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=7860 \
    FARE_CACHE_FILE=/app/.cache/fares.json
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p .cache && chown node:node .cache
USER node
EXPOSE 7860
CMD ["node", "dist/index.js"]
