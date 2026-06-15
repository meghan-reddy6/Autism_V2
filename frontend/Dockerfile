FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Skipped production build for development speed. To build for prod, uncomment:
# RUN npm run build
CMD ["npm", "run", "dev"]