FROM node:18-bullseye

# Install .NET Core 3.1 + Lua 5.1 + dependencies
RUN apt-get update && apt-get install -y \
    wget \
    apt-transport-https \
    lua5.1 \
    && wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-runtime-3.1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Buat symlink lua
RUN ln -sf /usr/bin/lua5.1 /usr/bin/lua || true

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3000

CMD ["node", "index.js"]
