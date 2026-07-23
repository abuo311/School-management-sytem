FROM nginx:stable-alpine
# Copy the dist folder you just built
COPY dist /usr/share/nginx/html
# Copy your nginx.conf (make sure this file exists in the folder)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]