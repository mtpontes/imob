FROM node:20-alpine
WORKDIR /app

# Copy dependency files and install them
COPY package*.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Modify proxy.conf.json to route API calls to the 'backend' container instead of 'localhost'
RUN sed -i 's/localhost:8080/backend:8080/g' proxy.conf.json

EXPOSE 4200

# Start development server with proxy configuration, listening on all interfaces
CMD ["npm", "start"]
