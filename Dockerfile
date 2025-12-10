# Build Stage
FROM node:20.15.1-alpine AS build

WORKDIR /app

# Build arguments for environment variables
ARG VITE_API_URL
ARG SERVER_URL
ARG GEMINI_API_KEY
ARG VITE_BASE_PATH=/backoffice

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV SERVER_URL=${SERVER_URL}
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set proper permissions for nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html 

# Nginx configuration for SPA with base path /backoffice
# Vite build includes /backoffice in base path, so nginx must serve at /backoffice
RUN echo 'server { \
    listen 5173; \
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
    # Static assets with base path /backoffice/assets \
    # Vite builds files in /assets/ but references them as /backoffice/assets/... \
    location /backoffice/assets/ { \
    alias /usr/share/nginx/html/assets/; \
    expires 1y; \
    add_header Cache-Control "public, immutable"; \
    access_log off; \
    } \
    \
    # SPA routing with base path /backoffice \
    # Use rewrite + root instead of alias for proper try_files support \
    location /backoffice/ { \
    rewrite ^/backoffice(.*)$ $1 break; \
    root /usr/share/nginx/html; \
    try_files $uri $uri/ /index.html =404; \
    index index.html; \
    } \
    \
    # Redirect /backoffice to /backoffice/ \
    location = /backoffice { \
    return 301 /backoffice/; \
    } \
    \
    # Root redirect to /backoffice \
    location = / { \
    return 301 /backoffice/; \
    } \
    \
    # Cache static assets (fallback for other paths) \
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

EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
