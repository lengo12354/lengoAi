FROM node:18-bullseye

# Install ffmpeg globally just in case (though ffmpeg-static is used)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the port (Hugging Face routes traffic to 7860 by default)
EXPOSE 7860
ENV PORT=7860

# Start the server
CMD ["npm", "start"]
