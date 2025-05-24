/**
 * 簡單的 Logger 系統 - 支援生產環境 console 移除
 */

class Logger {
  static log(message, ...args) {
    if (import.meta.env.DEV) {
      console.log(`[LOG] ${message}`, ...args);
    }
  }

  static warn(message, ...args) {
    if (import.meta.env.DEV) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  static error(message, ...args) {
    // 錯誤訊息在生產環境也會記錄
    console.error(`[ERROR] ${message}`, ...args);
  }

  static debug(message, ...args) {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}

export default Logger;
