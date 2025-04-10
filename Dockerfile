# Use the official Node.js image (adjust version if needed)
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app's files into the working directory
COPY . .

# Build the app (if your app requires a build step)
RUN npm run build

# Expose the port your app runs on (default port for Node.js apps is usually 3000)
EXPOSE 3000

# Set the command to start your app
CMD ["node", "dist/index.js"]
