FROM node:22-bookworm-slim AS workspace
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

FROM workspace AS build
RUN npm ci --workspace backend
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
COPY backend/database ./backend/database
RUN npm run build --workspace backend

FROM workspace AS production-dependencies
RUN npm ci --omit=dev --workspace backend

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app/backend
COPY --from=production-dependencies /app/node_modules /app/node_modules
COPY --from=build /app/backend/package.json ./
COPY --from=build /app/backend/dist ./dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "dist/src/index.js"]
