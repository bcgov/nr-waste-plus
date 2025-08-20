FROM node:20-bullseye-slim AS build

WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts --omit=dev

COPY . .
RUN npm run build && \
    rm -rf node_modules

# Caddy
FROM caddy:2.10.0-alpine
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