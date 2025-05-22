# 即時聊天應用程式

這是一個使用 React 和 Node.js 建構的全端即時聊天應用程式，提供使用者即時通訊與狀態追蹤功能。

## 功能特色

- 使用者註冊與登入系統
- 即時訊息傳遞
- 訊息已讀狀態追蹤
- 線上狀態指示
- 使用者設定檔與頭像上傳
- 支援圖片訊息
- 深色/淺色主題切換
- 移動裝置響應式設計

## 技術堆疊

### 前端

- **React** - 使用者介面函式庫
- **Vite** - 建構工具
- **Zustand** - 狀態管理
- **React Router** - 頁面路由
- **Socket.IO Client** - 即時通訊
- **Axios** - HTTP 請求
- **TailwindCSS & DaisyUI** - 樣式與 UI 元件
- **React Hot Toast** - 通知提示

### 後端

- **Node.js** - JavaScript 執行環境
- **Express** - Web 應用程式框架
- **Socket.IO** - 即時雙向通訊
- **MongoDB & Mongoose** - 資料庫與 ODM
- **JWT** - 身分認證
- **Bcrypt** - 密碼加密
- **Cloudinary** - 圖片儲存服務

## 安裝與執行

### 前置需求

- Node.js (v16+)
- MongoDB
- Cloudinary 帳號

### 安裝步驟

1. **複製專案**
   \\\
   git clone <專案儲存庫 URL>
   cd CHAT-APP
   \\\

2. **環境變數設定**

   在 backend 目錄建立 \.env\ 檔案:
   \\\
   PORT=5000
   MONGO_URI=<你的 MongoDB 連線字串>
   JWT_SECRET=<你的 JWT 密鑰>
   NODE_ENV=development
   CLOUDINARY_CLOUD_NAME=<你的 Cloudinary 名稱>
   CLOUDINARY_API_KEY=<你的 Cloudinary API 金鑰>
   CLOUDINARY_API_SECRET=<你的 Cloudinary API 密鑰>
   \\\

3. **後端安裝與執行**
   \\\
   cd backend
   npm install
   npm run dev
   \\\

4. **前端安裝與執行**
   \\\
   cd frontend
   npm install
   npm run dev
   \\\

5. **開啟應用程式**
   前往 \http://localhost:5173\ 瀏覽應用程式

## 部署指南

### 後端部署

1. 修改 \.env\ 檔案中的 \NODE_ENV\ 為 \production\
2. 執行 \
pm start\ 啟動生產環境伺服器

### 前端部署

1. 在 frontend 目錄執行 \
pm run build\ 產生優化的靜態檔案
2. 靜態檔案會存放在 \rontend/dist\ 目錄下，可以部署到任何靜態網站託管服務

## 專案結構

\\\
/backend
  /src
    /controllers       - API 路由控制器
    /lib               - 公用函式庫與設定
    /middleware        - Express 中介軟體
    /models            - MongoDB 資料模型
    /routes            - API 路由定義
    /seeds             - 資料庫種子資料
    index.js           - 應用程式進入點

/frontend
  /public              - 靜態資源
  /src
    /components        - React 元件
    /constants         - 常數定義
    /lib               - 公用函式庫
    /pages             - 應用程式頁面
    /store             - Zustand 狀態管理
    App.jsx            - 根元件
    main.jsx           - React 進入點
\\\

## 特別功能說明

### 聊天狀態追蹤

應用程式會追蹤三種聊天狀態：
- \connect\ - 雙方都在同一聊天室中
- \ctive\ - 對方在線但未在當前聊天室
- \offline\ - 對方不在線

### 訊息讀取確認

當雙方都在同一聊天室時，訊息會自動標記為已讀。系統會即時通知發送者其訊息已被讀取。

### Socket.IO 使用說明

應用程式使用 Socket.IO 實現以下功能：
- 即時訊息傳遞
- 線上狀態同步
- 聊天狀態追蹤
- 已讀狀態通知

### 聊天室進入/離開通知

聊天應用程式現在支援聊天室進入與離開通知：
- 當一個使用者進入聊天室，而另一個使用者已經在該聊天室時，系統會顯示進入通知
- 當使用者離開聊天室時，系統會向聊天室中的其他使用者顯示離開通知
- 通知訊息會以系統訊息的形式顯示在聊天界面中
