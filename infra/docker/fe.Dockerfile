FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY fe/package.json ./fe/package.json
RUN pnpm install --frozen-lockfile
COPY fe ./fe

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=weather-bridge
ARG VITE_KEYCLOAK_CLIENT_ID=weather-bridge-fe
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
RUN pnpm --dir fe build

FROM nginx:1.27-alpine
COPY --from=build /app/fe/dist /usr/share/nginx/html
COPY infra/proxy/fe.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
