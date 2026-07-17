FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY fe/package.json ./fe/package.json
RUN pnpm install --frozen-lockfile
COPY fe ./fe
RUN pnpm --dir fe build

FROM nginx:1.31-alpine
COPY fe/dist /usr/share/nginx/html
COPY infra/proxy/fe.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
