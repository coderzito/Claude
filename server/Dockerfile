# Build context is the repo root (so this can COPY ../db alongside server/src) —
# deployed with `docker build --network host -f server/Dockerfile <repo-root>`.
#
# HTTPS_PROXY/NODE_EXTRA_CA_CERTS are only used inline on the npm install RUN
# steps (this sandbox's outbound network requires it) — never declared with
# ENV, so nothing proxy-related is baked into the image or reaches the
# deployed app at runtime.
FROM node:22-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build
ARG HTTPS_PROXY
WORKDIR /app
COPY server/.build/ca-bundle.crt /tmp/ca-bundle.crt
COPY server/package.json server/package-lock.json ./
RUN HTTPS_PROXY=$HTTPS_PROXY NODE_EXTRA_CA_CERTS=/tmp/ca-bundle.crt npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build
RUN rm -f /tmp/ca-bundle.crt

FROM node:22-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5
ARG HTTPS_PROXY
WORKDIR /app
ENV NODE_ENV=production
COPY server/.build/ca-bundle.crt /tmp/ca-bundle.crt
COPY server/package.json server/package-lock.json ./
RUN HTTPS_PROXY=$HTTPS_PROXY NODE_EXTRA_CA_CERTS=/tmp/ca-bundle.crt npm ci --omit=dev && rm -f /tmp/ca-bundle.crt
COPY --from=build /app/dist ./dist
COPY db ./db
EXPOSE 8080
CMD ["node", "dist/index.js"]
