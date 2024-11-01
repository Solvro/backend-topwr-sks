# Base stage
FROM node:20.12.2-alpine3.18 AS base

# All deps stage
FROM base AS deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci

# Production-only deps stage
FROM base AS production-deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci --omit=dev

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .
RUN node ace build

# Production stage
FROM base
ENV NODE_ENV=production
WORKDIR /app

# Copy production dependencies and build output
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app

# Add the wrapper script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set CMD to run the wrapper script
CMD ["sh", "/app/start.sh"]
