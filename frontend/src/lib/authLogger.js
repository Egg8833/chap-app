// 此檔案用於記錄前端 Google OAuth 登入的相關資訊
// 可用於追蹤使用者認證流程並診斷問題

export const logAuthActivity = (message, data = {}) => {
  // 取得當前環境
  const isProduction = import.meta.env.MODE === 'production';
  
  // 在開發環境中記錄詳細資訊，在生產環境中只記錄基本訊息
  if (isProduction) {
    console.log(`[認證記錄] ${message}`);
  } else {
    console.log(`[認證記錄] ${message}`, data);
  }
};

export const handleAuthError = (error) => {
  // 記錄錯誤
  console.error('[認證錯誤]', error?.message || '未知錯誤');
  
  // 確保即使 error 是 undefined 或 null 也能安全處理
  const errorMessage = error?.message || '未知錯誤';
  
  // 可以在此處實作重試邏輯或自定義錯誤處理
  return {
    success: false,
    message: '認證處理期間發生錯誤',
    error: errorMessage
  };
};
