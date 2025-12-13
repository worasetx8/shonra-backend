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
    \
    # Add MIME types
    types { \
        text/html html htm; \
        text/css css; \
        application/javascript js mjs; \
        application/json json; \
        image/svg+xml svg; \
        image/png png; \
        image/jpeg jpg jpeg; \
        image/gif gif; \
        image/webp webp; \
        font/woff woff; \
        font/woff2 woff2; \
        font/ttf ttf; \
        font/otf otf; \
    } \
    default_type application/octet-stream; \
    \
    # Handle static assets with high priority - rewrite path to remove /backoffice prefix
    # Requests for /backoffice/assets/... will be served from /usr/share/nginx/html/assets/...
    location /backoffice/assets/ { \
        alias /usr/share/nginx/html/assets/; \
        add_header Cache-Control "public, max-age=31536000, immutable"; \
        try_files $uri =404; \
    } \
    \
    # Handle /backoffice/vite.svg or other static files in root
    location ~ ^/backoffice/[^/]+\\.(svg|png|jpg|jpeg|gif|ico|webp)$ { \
        rewrite ^/backoffice/(.*)$ /$1 break; \
        try_files $uri =404; \
    } \
    \
    # Handle the SPA routing for any other /backoffice/ request
    location /backoffice/ { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Redirect root requests to the /backoffice/ sub-path
    location = / { \
        return 301 /backoffice/; \
    } \
    }' > /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 5173

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
