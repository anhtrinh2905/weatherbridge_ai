FROM nginx:1.31-alpine

COPY infra/proxy/nginx.conf /etc/nginx/conf.d/default.conf
