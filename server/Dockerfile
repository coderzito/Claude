# Build context is the repo root. Dependencies and TypeScript output are
# built on the host (npm ci / npm run build in server/, prod-only deps
# installed into server/.build/prod/) and just copied in here — running
# `npm ci` inside the Docker build hit a consistent ~70s network cutoff in
# this sandbox, so the actual install happens where networking is reliable.
#
# Host-side steps before building this image:
#   cd server && npm run build
#   rm -rf .build/prod && mkdir -p .build/prod
#   cp package.json package-lock.json .build/prod/
#   (cd .build/prod && npm ci --omit=dev)
FROM node:22-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5
WORKDIR /app
ENV NODE_ENV=production
COPY server/.build/prod/node_modules ./node_modules
COPY server/dist ./dist
COPY db ./db
EXPOSE 8080
CMD ["node", "dist/index.js"]
