# Use the official Node.js LTS image as the base image
FROM node:lts-alpine

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Copy the rest of the application files to the container
COPY . .

# Install the application dependencies
RUN npm install

# Expose the port on which the application is running
EXPOSE 8080

# Set the command to run when the container starts
CMD ["npm", "start"]