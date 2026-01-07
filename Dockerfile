# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Copy package files (for production install)
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy server code
COPY server ./server

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "run", "start:server"]
