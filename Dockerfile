# Build Stage
FROM node:20.15.1-alpine AS build

WORKDIR /app

# Build arguments for environment variables (must be before COPY)
ARG VITE_API_URL
ARG SERVER_URL
ARG GEMINI_API_KEY

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV SERVER_URL=${SERVER_URL}
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Verify source files exist
RUN echo "=== Verifying Source Files ===" && \
    test -f vite.config.ts && echo "✅ vite.config.ts" || echo "❌ vite.config.ts MISSING" && \
    test -f tsconfig.json && echo "✅ tsconfig.json" || echo "❌ tsconfig.json MISSING" && \
    test -f index.html && echo "✅ index.html" || echo "❌ index.html MISSING" && \
    echo "Environment: VITE_API_URL=${VITE_API_URL:-NOT SET}"

# Build the application
RUN echo "=== Building Application ===" && \
    npm run build && \
    echo "=== Build Complete ===" && \
    ls -la /app/dist/ || echo "❌ dist folder not found"

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx configuration for SPA
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript; \
    \
    # Security headers \
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    \
    # SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Cache static assets \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Don'\''t cache HTML files \
    location ~* \.html$ { \
        expires -1; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]