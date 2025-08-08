# Use Node.js base image
FROM node:20

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Build the Next.js app
RUN npm run build

# Set environment variables (if needed)
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
