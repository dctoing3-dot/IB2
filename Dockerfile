FROM node:18-bullseye

# Install .NET 6.0 + wget + unzip
RUN apt-get update && apt-get install -y \
    wget \
    apt-transport-https \
    unzip \
    && wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-runtime-6.0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download IronBrew2
RUN wget https://github.com/Trollicus/IronBrew2/releases/download/1.0.0.0/IronBrew2.CLI.zip -O ironbrew.zip \
    && unzip ironbrew.zip -d IronBrew2.CLI \
    && rm ironbrew.zip \
    && chmod -R +x IronBrew2.CLI/ || true

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "index.js"]
