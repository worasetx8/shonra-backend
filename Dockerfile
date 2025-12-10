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
RUN npm run build && \
    echo "=== Build completed ===" && \
    echo "=== Checking dist folder ===" && \
    ls -la dist/ && \
    echo "=== Checking dist/assets folder ===" && \
    ls -la dist/assets/ 2>/dev/null || echo "No assets folder found" && \
    echo "=== Checking index.html content ===" && \
    head -20 dist/index.html && \
    echo "=== Checking for script tags in index.html ===" && \
    grep -i "script" dist/index.html | head -5 || echo "No script tags found"

# Final stage: Nginx server to serve the built files
FROM nginx:alpine

# Copy built files from the builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Add custom Nginx configuration to handle sub-path and SPA routing
RUN echo 'server { \
    listen 5173; \
    server_name localhost; \
    \
    # Set the root for all requests
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Gzip compression \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1024; \
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript; \
    \
    # Set proper MIME types for JavaScript modules \
    types { \
        application/javascript js mjs; \
        text/css css; \
        text/html html htm; \
    } \
    \
    # Handle static assets (JS, CSS, images, fonts) \
    # Vite builds assets in /assets/ and HTML references them as /backoffice/assets/... \
    # So we need to strip /backoffice prefix and serve from /assets/ \
    location /backoffice/assets/ { \
        alias /usr/share/nginx/html/assets/; \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
        access_log off; \
    } \
    \
    # Handle CSS files with /backoffice prefix \
    location ~ ^/backoffice/(.+\.css)$ { \
        alias /usr/share/nginx/html/$1; \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Handle JS/TSX files with /backoffice prefix \
    # Note: Vite will convert ./index.tsx to /backoffice/assets/index-xxx.js when building \
    # This location is a fallback in case the path was not converted \
    location ~ ^/backoffice/(.+\.(js|mjs|tsx))$ { \
        alias /usr/share/nginx/html/$1; \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Handle other static files referenced with /backoffice prefix \
    location ~ ^/backoffice/(.+\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot))$ { \
        alias /usr/share/nginx/html/$1; \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Handle absolute paths at root (fallback for assets) \
    location /assets/ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    \
    # Handle the SPA routing for /backoffice/ \
    # Vite build creates index.html at root (/usr/share/nginx/html/index.html) \
    # HTML has paths like /backoffice/assets/... which will be handled above \
    location /backoffice/ { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Handle /backoffice without trailing slash \
    location = /backoffice { \
        return 301 /backoffice/; \
    } \
    \
    # Redirect root requests to the /backoffice/ sub-path \
    location = / { \
        return 301 /backoffice/; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 5173

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
