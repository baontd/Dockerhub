# Sử dụng NGINX làm base image
FROM nginx:alpine

# Xoá các file mặc định của nginx
RUN rm -rf /usr/share/nginx/html/*

# Copy toàn bộ frontend vào nginx
COPY . /usr/share/nginx/html

# Expose port 80 để truy cập web
EXPOSE 80

# Lệnh chạy nginx mặc định
CMD ["nginx", "-g", "daemon off;"]
