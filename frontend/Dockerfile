FROM node:24.18-bullseye-slim AS build

# Cache npm dependencies by copying package files first
WORKDIR /app
# Cache npm dependencies by copying package files first
COPY package*.json ./
RUN npm ci --ignore-scripts

# Build static files
COPY . .
RUN npm run build && \
    rm -rf node_modules

# Caddy
FROM caddy:2.11.4-alpine
ENV LOG_LEVEL=info

# Copy static files and config
COPY --from=build /app/build/ /srv
COPY Caddyfile /etc/caddy/Caddyfile

# CA certs and Caddy format
RUN apk add --no-cache ca-certificates && \
    caddy fmt --overwrite /etc/caddy/Caddyfile

# User, port and healthcheck
USER 1001
EXPOSE 3000
HEALTHCHECK CMD curl -f http://localhost:3000 || exit 1
