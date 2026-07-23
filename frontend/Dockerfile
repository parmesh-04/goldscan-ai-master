# Frontend Dockerfile for GoldScan AI
# Two-stage build: Node.js compiles the React app, Nginx serves the static files

# ── Stage 1: Build ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files before source to maximize Docker layer cache hits
COPY package*.json ./
RUN npm ci --silent

# Inject the backend API URL at build time via Docker build argument
# Override with: docker build --build-arg VITE_API_URL=https://your-backend.com ...
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

# Copy source and build the production bundle
COPY . .
RUN npm run build

# ── Stage 2: Serve ─────────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy the compiled assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config: serve all routes via index.html (required for React Router)
# Without this, refreshing /result or /dashboard returns 404
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
