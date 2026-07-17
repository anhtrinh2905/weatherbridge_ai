FROM nginx:1.27-alpine

COPY infra/proxy/nginx.conf /etc/nginx/conf.d/default.conf
