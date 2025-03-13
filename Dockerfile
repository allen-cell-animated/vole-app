#
# STEP 1: Install dependencies and build the project
#
FROM node:22-alpine3.18 AS build

WORKDIR /usr/src/vole-app/

# Install dependencies
COPY . .
RUN npm ci


# Build the project to ./imageviewer
RUN npm run docker-build

#
# STEP 2: Serve the built files using nginx
#

FROM nginx:alpine

# Copy the built files from the previous stage
COPY --from=build /usr/src/vole-app/imageviewer/ /usr/share/nginx/html

# Override nginx configuration to redirect 404s to index.html, since this is a single-page app.
# This makes subpages (like `/viewer`) work as expected when directly opened.
COPY --from=build /usr/src/vole-app/docker/nginx.conf /etc/nginx/nginx.conf
