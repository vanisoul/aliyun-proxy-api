# aliyun-proxy-api

這是一個使用 Elysia with Bun 架構的微服務，主要功能是在 Aliyun
上自動建立虛擬機器 (VM) 並在該虛擬機器上啟動 VPN 和 Socks5 服務。

### 開始之前

請確保您已經安裝了 Bun（安裝指南）。Bun 是一個快速的 JavaScript
運行環境和套件管理器。

### 環境配置

此微服務需要以下環境變數進行配置：

- ACCESS_KEY_ID: 您的 Aliyun Access Key ID。
- ACCESS_KEY_SECRET: 您的 Aliyun Access Key Secret。
- ENDPOINT: Aliyun 服務的端點。
- REGION_ID: 您希望創建 VM 的 Aliyun 區域 ID。
- CONNECT_TIMEOUT: 連接超時設置（以秒為單位）。
- PROXY_TARGETS: Socks5 代理目標，使用逗號 , 分隔。
- X_API_KEY: API 授權密鑰，用於查詢字串驗證。
- ENABLE_FORCE_CLEAR: 是否啟動每日強制清除實體，預設 `false`。
- FORCE_CLEAR_TIME: 每日強制清除實體時間，使用 CronTab 格式，當
  `ENABLE_FORCE_CLEAR` 啟動才有作用，預設 `0 4 * * *`。
- internetMaxBandwidthOut: 頻寬限制預設 50，最大 100，單位Mbps

### 安裝依賴

在專案目錄下執行以下命令來安裝必要的依賴： `bun install`

### 啟動服務

使用以下命令來啟動微服務： `bun dev`

### 參考文件

`http://localhost:3000/swagger`

### 檢查影像安全

- `docker build -t testimg .`
- `docker scout cves local://testimg`
