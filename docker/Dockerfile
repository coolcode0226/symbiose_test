# Shared image for the `api` and `web` workspaces.
# Installs the whole npm workspace once; each compose service overrides the command.
FROM node:24-bookworm-slim

# Build tools for native deps (bcrypt) in case prebuilt binaries are unavailable.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only manifests first so `npm install` is cached across source changes.
COPY package.json package-lock.json turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json

RUN npm install

# Copy the rest of the source (overridden by bind mounts in docker-compose for dev).
COPY . .
