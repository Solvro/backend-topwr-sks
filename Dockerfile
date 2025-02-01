# this files includes some shit we've changed with czaja
FROM node:20-bullseye-slim AS base

RUN apt-get update && apt-get install -y \
    chromium \
    chromium-driver \
    xvfb \
    procps \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# All deps stage
FROM base AS deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci

# Production only deps stage
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

# Copy docs
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app

# proxy port
EXPOSE 8080

# Set CMD to run the wrapper script
CMD ["sh", "/app/start.sh"]
