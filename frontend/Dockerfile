# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Stage 2: Serve with a static server
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY .env .env

# Optional: Replace default nginx config if needed
# COPY nginx.dev.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
