FROM node:20

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose Engine default port (assuming 3001 or similar)
EXPOSE 3001

# Start development server
CMD ["npm", "run", "start:dev"]
