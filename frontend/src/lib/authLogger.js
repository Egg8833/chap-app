// 此檔案用於記錄前端 Google OAuth 登入的相關資訊
// 可用於追蹤使用者認證流程並診斷問題

export const logAuthActivity = (message, data = {}) => {
  // 只在開發環境記錄詳細資訊
  if (import.meta.env.DEV) {
    console.log(`[認證記錄] ${message}`, data);
  }
  
  // 在生產環境僅記錄活動，不包含詳細資料
  if (import.meta.env.PROD) {
    console.log(`[認證記錄] ${message}`);
  }
};

export const handleAuthError = (error) => {
  console.error('[認證錯誤]', error);
  
  // 可以在此處實作重試邏輯或自定義錯誤處理
  return {
    success: false,
    message: '認證處理期間發生錯誤',
    error: error.message
  };
};
