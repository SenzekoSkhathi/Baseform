# Baseform Hono backend — Cloud Run
# Build:  gcloud run deploy baseform-backend --source . (uses this Dockerfile)
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Static assets served by the app (email preview templates, etc.)
COPY public ./public
COPY data ./data

# Cloud Run injects PORT; src/index.ts already reads process.env.PORT
EXPOSE 8080
CMD ["node", "dist/index.js"]
