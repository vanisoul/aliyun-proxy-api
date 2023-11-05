# docker build .  設定 VERSION 範例
# docker build . --build-arg VERSION=0.0.1 -t china-vpn:0.0.1

# docker run 範例
# docker run --rm -d -p 2376:3000 --name china-vpn china-vpn:0.0.1

# 使用 ARG 將 Project VERSION 設置為預設值
ARG VERSION=0.0.0

# 使用 Node.js 18.17.1 作為基礎映像檔
FROM node:18.17.1-slim

# 將 ARG 的版本抓進 image 中
ARG VERSION
ENV VERSION=${VERSION}

# 安裝 curl
RUN apt-get update && apt-get install -y curl unzip

# 安裝 bun cli
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# 清除相關暫存
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# 設置工作目錄
WORKDIR /app

# 將專案代碼複製到容器中
COPY . .

# 在容器啟動時運行 `bun dev` 命令
CMD ["bun", "dev"]
