# 聊天應用程式部署指南

## 專案結構
```
backend/ - Node.js 後端專案
frontend/ - React 前端專案
```

## 環境需求
- Node.js 14+
- npm 或 yarn
- MongoDB Atlas 帳戶
- Google OAuth 認證

## 部署步驟

### 前端部署 (Vercel)

1. **環境變數設定**
   - `VITE_API_BASE_URL=https://chap-app-9mu5.onrender.com`

2. **建構指令**
   - 建構指令: `npm run build` 
   - 輸出目錄: `dist`
   - 框架預設: `Vite`

3. **域名設定**
   - 使用預設域名: `chap-app-sigma.vercel.app`

### 後端部署 (Render)

1. **環境變數設定**
   ```
   PORT = 3000
   MONGODB_URI = 資料庫連線字串
   NODE_ENV = production
   JWT_SECRET = 安全金鑰
   JWT_EXPIRES_IN = 1d
   GOOGLE_CLIENT_ID = Google OAuth ID
   GOOGLE_CLIENT_SECRET = Google OAuth 密鑰
   SESSION_SECRET = 會話安全金鑰
   CLOUDINARY_CLOUD_NAME = Cloudinary 名稱
   CLOUDINARY_API_KEY = Cloudinary API 金鑰
   CLOUDINARY_API_SECRET = Cloudinary 密鑰
   FRONTEND_URL = https://chap-app-sigma.vercel.app
   BACKEND_URL = https://chap-app-9mu5.onrender.com
   ```

2. **建構與啟動設定**
   - 建構指令: `npm install`
   - 啟動指令: `npm start`

3. **其他設定**
   - 選擇永久免費方案
   - 選擇適當的區域
   - 確保自動部署已啟用

## Google Cloud 設定

1. **登入 Google Cloud Console**: https://console.cloud.google.com/
2. 選擇專案: `arboreal-lane-417302`
3. 前往 "API 和服務" > "憑證" 
4. 設定 OAuth 2.0 用戶端 ID:
   - 已授權的重定向 URI: `https://chap-app-9mu5.onrender.com/api/auth/google/callback`
   - 已授權的 JavaScript 來源: 
     - `https://chap-app-9mu5.onrender.com`
     - `https://chap-app-sigma.vercel.app`

## MongoDB Atlas 設定

1. **加入 Render 靜態 IP 地址**:
   - `100.20.92.101`
   - `44.225.181.72`
   - `44.227.217.144`

## 部署後測試

確保測試以下功能:
1. 一般註冊/登入
2. Google OAuth 登入
3. 聊天功能
4. 個人資料更新
5. 跨裝置回應式設計

## 疑難排解

如遇到 CORS 問題，檢查:
- 後端 CORS 配置是否正確
- Cookie 設定是否適當 
- Google OAuth 重定向是否設定正確

如遇到資料庫連線問題:
- 確認 MongoDB Atlas 網路存取設定
- 檢查連線字串格式

## 安全注意事項

- 確保敏感資訊不會暴露在前端程式碼中
- 使用環境變數處理所有機密資訊
- 定期更新相依套件以修補安全漏洞
