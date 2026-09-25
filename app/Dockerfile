# Production image: build the SPA, then serve it from nginx.
#
# Two stages so the runtime image carries no node_modules and no toolchain —
# the dev image is ~1.2GB, this one is a few megabytes of static files plus
# nginx. Nothing in the container can rebuild itself, which is the point.

FROM node:20-alpine AS build
WORKDIR /app

# Dependencies first: this layer is reused whenever only source changed, which
# is most deploys.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .

# VITE_API_BASE is deliberately left unset. The client falls back to "/api" on
# its own origin, and nginx below proxies that to the gateway — so the browser
# never learns a second hostname and there is no CORS to configure.
RUN npm run build


FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx already handles SIGTERM correctly; no init shim needed.
CMD ["nginx", "-g", "daemon off;"]
