# Stage 1: Build the Angular application
FROM node:18-alpine as build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application (production configuration)
RUN npm run build -- --configuration production

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy the built application from the build stage to the Nginx html directory
# NOTE: Check if usage of 'fleetflow-dashboard' in dist path matches angular.json output path
COPY --from=build /app/dist/fleetflow-dashboard/browser /usr/share/nginx/html

# Copy a custom nginx configuration file (optional but recommended for SPA routing)
# We will create this file next
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
