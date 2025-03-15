# Use the official Bun image as base
FROM oven/bun:1.2.5-slim as base

# Set working directory
WORKDIR /app

# Copy package.json and bun.lock files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build the application
RUN bun run build

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
# Note: In production, you should use environment variables or secrets management
# instead of hardcoding the DATABASE_URL
ENV NODE_ENV=production

# Run the application
CMD ["bun", "run", "start"]