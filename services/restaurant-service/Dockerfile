FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY tsconfig.json ./
COPY src ./src

RUN npm run build
RUN rm -rf src tsconfig.json

EXPOSE 3003

CMD ["npm", "start"]
