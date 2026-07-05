FROM node:20 AS build

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM caddy:2

COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /build/dist /srv/dist
