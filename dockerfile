FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Install Expo CLI dependencies globally
RUN npm install -g @expo/ngrok@^4.1.0

# Copy application files
COPY . .

# Expose ports for Expo
EXPOSE 8081 19000 19001 19002

# Set Expo environment variables
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

CMD ["npx", "expo", "start", "--tunnel"]