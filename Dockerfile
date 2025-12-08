# Multi-stage build for React + Vite Admin Panel

# Stage 1: Build the application
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first (for better layer caching)
COPY package.json package-lock.json* ./

# Install dependencies (including devDependencies for build)
# Use npm install with legacy-peer-deps to handle peer dependency conflicts
RUN npm install --legacy-peer-deps --verbose || \
    (echo "npm install failed, trying npm ci..." && npm ci --legacy-peer-deps || npm install --legacy-peer-deps)

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL
ARG SERVER_URL
ARG GEMINI_API_KEY

# Set environment variables for build (Vite only reads VITE_* prefixed vars)
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SERVER_URL=${SERVER_URL}
ENV SERVER_URL=${SERVER_URL}
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

# Debug: Print environment variables (remove in production if needed)
RUN echo "Building with VITE_API_URL=${VITE_API_URL}" && \
    echo "Building with SERVER_URL=${SERVER_URL}" && \
    echo "Building with GEMINI_API_KEY=${GEMINI_API_KEY:+SET}" && \
    echo "GEMINI_API_KEY is ${GEMINI_API_KEY:-NOT SET}"

# Build the application with better error handling
# Step 1: Check environment and files
RUN echo "=== Build Environment Check ===" && \
    echo "Current directory: $(pwd)" && \
    echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    echo "Files in /app:" && \
    ls -la /app/ | head -20 && \
    echo "Environment variables:" && \
    env | grep -E "(VITE|SERVER|GEMINI)" || echo "No VITE/SERVER/GEMINI vars found" && \
    echo "Checking TypeScript config..." && \
    test -f tsconfig.json && echo "✅ tsconfig.json exists" || echo "⚠️ tsconfig.json not found" && \
    echo "Checking vite config..." && \
    test -f vite.config.ts && echo "✅ vite.config.ts exists" || echo "⚠️ vite.config.ts not found"

# Step 2: Check TypeScript compilation (without emitting files)
RUN echo "=== TypeScript Check ===" && \
    npx tsc --noEmit 2>&1 | head -50 || echo "⚠️ TypeScript check completed (warnings may exist)"

# Step 3: Run build (separate step to see errors clearly)
RUN echo "=== Starting Build ===" && \
    npm run build 2>&1 | tee /tmp/build.log || ( \
        echo "❌ Build failed! Showing last 100 lines of build log:" && \
        tail -100 /tmp/build.log && \
        echo "Full build log saved to /tmp/build.log" && \
        exit 1 \
    )

# Step 4: Verify dist folder exists
RUN echo "=== Verifying Build Output ===" && \
    if [ ! -d "/app/dist" ]; then \
        echo "❌ ERROR: dist folder not found after build!" && \
        echo "Contents of /app:" && \
        ls -la /app/ && \
        echo "Checking package.json build script:" && \
        cat package.json | grep -A 2 '"build"' && \
        echo "Build log:" && \
        tail -50 /tmp/build.log || echo "No build log found" && \
        exit 1; \
    fi && \
    echo "✅ dist folder exists!" && \
    echo "Contents of dist:" && \
    ls -la /app/dist/ && \
    echo "Build verification complete!"

# Stage 2: Production server with nginx
FROM nginx:alpine

# Copy built files from builder stage
# Verify the source exists before copying
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration (if exists, otherwise use default)
# Create a custom nginx config for SPA routing
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
    # SPA routing - redirect all requests to index.html \
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
    # Don\'t cache HTML files \
    location ~* \.html$ { \
        expires -1; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

