FROM node:22.17-bullseye-slim@sha256:741a60f76e79ab4080ebb10d24ec0c2aa4527fc44e33a8d609c416cc351b4fff AS build

# Build static files
WORKDIR /app
COPY . .

RUN npm ci --ignore-scripts && \
    npm run build && \
    rm -rf node_modules

# Caddy
FROM caddy:2.10.2-alpine@sha256:a4180db0805b3725ddf936d2e6290553745c7339c003565da717ee612fd8a888
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