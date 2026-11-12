FROM nginx:1.25-alpine

# Remove default configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom reverse proxy configuration
COPY proxy/nginx.conf /etc/nginx/nginx.conf

# Copy static frontend client assets into Nginx html root
COPY client/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
