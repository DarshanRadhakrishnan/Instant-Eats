FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript source
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove source files, keep only dist
RUN rm -rf src tsconfig.json

EXPOSE 3000

CMD ["npm", "start"]
