# Google OAuth 問題排解指南

## 常見問題及解決方案

### 1. "無法連接到此頁面" 錯誤

#### 可能原因與解決方案:

1. **伺服器未啟動**
   - 確保前端與後端伺服器都正在運行
   - 前端應執行在 http://localhost:5173
   - 後端應執行在 http://localhost:3000

2. **連線埠被佔用**
   - 確認沒有其他程式使用這些連線埠
   - 可嘗試修改連線埠設定並相應更新重定向 URL

3. **Google Cloud Console 設定不正確**
   - 確認已在 Google Cloud Console 添加以下已授權的重定向 URI:
     `http://localhost:3000/api/auth/google/callback`
   - 確認已添加以下已授權的 JavaScript 來源:
     `http://localhost:3000` 和 `http://localhost:5173`

4. **環境變數問題**
   - 確保 backend/.env 檔案中設定了正確的:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `SESSION_SECRET`
   - 確保 frontend/.env 檔案中有 `VITE_API_BASE_URL` 設定

### 2. 驗證流程步驟

標準的 OAuth 流程應該是:

1. 用戶點擊 "使用 Google 帳號登入" 按鈕
2. 前端將用戶重定向到 `http://localhost:3000/api/auth/google`
3. 後端將用戶重定向到 Google 認證頁面
4. 用戶在 Google 頁面授權應用程式
5. Google 將用戶重定向回 `http://localhost:3000/api/auth/google/callback`
6. 後端生成 JWT 並將用戶重定向回 `http://localhost:5173`

### 3. 檢查工具

使用以下工具來診斷問題:

1. **執行驗證腳本**: 
   ```
   cd backend
   node src/validate-oauth.js
   ```

2. **檢查後端狀態**:
   瀏覽 `http://localhost:3000/api/auth/oauth-status`

3. **檢查瀏覽器網路請求**:
   - 開啟瀏覽器開發者工具 (F12)
   - 切換到「網路」標籤
   - 點擊 Google 登入按鈕並觀察重定向流程

### 4. 常見解決方法

1. **清除瀏覽器 Cookie 與快取**
2. **重新啟動前後端伺服器**
3. **確保 Google OAuth 同意畫面已正確設定**
4. **檢查瀏覽器控制台中的錯誤訊息**
