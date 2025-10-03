FROM node:18-alpine

WORKDIR /app

# Install Android SDK and other dependencies
RUN apk add --no-cache openjdk11 android-sdk android-platform-tools
RUN npm install -g @expo/ngrok@^4.1.0

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8081 19000 19001 19002

ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
ENV ANDROID_HOME=/usr/lib/android-sdk

CMD [ "npx", "expo", "start", "--tunnel" ]