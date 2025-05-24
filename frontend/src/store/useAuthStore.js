import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useChatStore } from './useChatStore';
import Logger from '../lib/logger.js';

const BASE_URL = import.meta.env.MODE === "production" 
  ? (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL)
  : "http://localhost:3000";

// Socket 連線狀態常數
const SOCKET_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
};

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  socketState: SOCKET_STATES.DISCONNECTED,

  checkAuth: async () => {
    const startTime = performance.now();
    try {
      const res = await axiosInstance.get("/auth/check");
      
      // 驗證回傳的資料是否為有效使用者物件
      if (res.data && res.data._id) {
        set({ authUser: res.data });
        Logger.log('使用者認證成功', res.data._id);
        get().connectSocket();
      } else {
        Logger.warn("回傳的使用者資料無效", res.data);
        set({ authUser: null });
      }
    } catch (error) {
      Logger.error("認證檢查失敗", error?.response?.data?.message || error.message);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
      Logger.performance('checkAuth', performance.now() - startTime);
    }
  },
  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("帳戶建立成功");
      Logger.log('使用者註冊成功', res.data._id);
      get().connectSocket();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || '註冊失敗';
      toast.error(errorMessage);
      Logger.error('註冊失敗', error);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("登入成功");
      Logger.log('使用者登入成功', res.data._id);
      get().connectSocket();
    } catch (error) {
      const errorMessage = error?.response?.data?.message || '登入失敗';
      toast.error(errorMessage);
      Logger.error('登入失敗', error);
    } finally {
      set({ isLoggingIn: false });
    }
  },
  logout: async () => {
    try {
      const { selectedUser, setSelectedUser } = useChatStore.getState();
      
      // 發送離開聊天室事件，但不修改訊息狀態
      const socket = get().socket;
      if (socket?.connected) {
        // 如果有選定的用戶，發送離開聊天室事件
        if (selectedUser) {
          socket.emit('userLeftChat', selectedUser._id);
          Logger.socket('userLeftChat', selectedUser._id);
        }
        
        // 發送明確登出事件到 socket 伺服器
        socket.emit('userLogout');
        Logger.socket('userLogout', null);
      }

      await axiosInstance.post("/auth/logout");
      toast.success("登出成功");
      Logger.log('使用者登出成功');

      get().disconnectSocket();
      setSelectedUser(null);
      set({ 
        authUser: null,
        onlineUsers: [],
        socketState: SOCKET_STATES.DISCONNECTED
      });

    } catch (error) {
      const errorMessage = error?.response?.data?.message || '登出失敗';
      toast.error(errorMessage);
      Logger.error('登出失敗', error);
    }
  },
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("個人資料更新成功");
      Logger.log('個人資料更新成功', res.data._id);
    } catch (error) {
      const errorMessage = error?.response?.data?.message || '更新失敗';
      toast.error(errorMessage);
      Logger.error('個人資料更新失敗', error);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },
  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) {
      Logger.warn('無法連接 socket：使用者未登入');
      return;
    }
    
    if (!authUser._id) {
      Logger.warn('無法連接 socket：使用者 ID 不存在');
      return;
    }

    // 檢查連線是否已存在
    const existingSocket = get().socket;
    if (existingSocket) {
      if (existingSocket.connected) {
        Logger.log('Socket 已連線，無需重複連線');
        return;
      } else {
        // 嘗試重新連線現有的 socket
        Logger.log('嘗試重新連線現有的 socket');
        set({ socketState: SOCKET_STATES.RECONNECTING });
        existingSocket.connect();
        return;
      }
    }    let socket;
    
    try {
      Logger.log(`嘗試連接到 socket 伺服器: ${BASE_URL}`);
      set({ socketState: SOCKET_STATES.CONNECTING });
      
      // 建立新的 socket 連線
      socket = io(BASE_URL, {
        query: {
          userId: authUser._id,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
        transports: ['websocket', 'polling']
      });

      // 立即設定事件監聽器（在 connect 之前）
      socket.on("getOnlineUsers", (userIds) => {
        Logger.socket('getOnlineUsers', userIds);
        set({ onlineUsers: userIds });
      });
      
      socket.on('connect', () => {
        Logger.socket('connect', authUser._id);
        set({ socketState: SOCKET_STATES.CONNECTED });
      });
      
      socket.on('disconnect', (reason) => {
        Logger.socket('disconnect', reason);
        set({ socketState: SOCKET_STATES.DISCONNECTED });
      });
      
      socket.on('reconnect', (attemptNumber) => {
        Logger.socket('reconnect', `嘗試次數: ${attemptNumber}`);
        set({ socketState: SOCKET_STATES.CONNECTED });
      });

      socket.on('connect_error', (error) => {
        Logger.error('Socket 連線錯誤', error);
        set({ socketState: SOCKET_STATES.DISCONNECTED });
      });
      
      // 建立連線
      socket.connect();
        // 儲存 socket 實例
      set({ socket: socket });
      
    } catch (error) {
      Logger.error('Socket 連線失敗', error);
      toast.error('無法連接到聊天服務，請稍後再試');
      set({ socketState: SOCKET_STATES.DISCONNECTED });
      return;
    }

    // 重新整理頁面時的處理 - 確保在頁面關閉前執行完成
    const handleBeforeUnload = () => {
      const { selectedUser } = useChatStore.getState();
      const currentSocket = get().socket;
      
      if (selectedUser && currentSocket?.connected) {
        Logger.log('頁面即將重新整理，發送離開聊天室事件');
        
        // 只發送離開聊天室事件，不修改訊息狀態
        // 這樣可以保留已讀訊息狀態
        currentSocket.emit('userLeftChat', selectedUser._id);
        
        // 將聊天狀態設為 false，但不修改已讀訊息
        currentSocket.emit('chatStatus', {
          chatWithUserId: selectedUser._id,
          status: 'inactive'
        });
        
        // 伺服器同步處理，確保狀態更新
        currentSocket.emit('sync');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 返回一個函式用於清理事件監聽器
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) {
      socket.disconnect();
    }
    // 清理線上使用者列表和 socket 實例
    set({ 
      socket: null, 
      onlineUsers: [], 
      socketState: SOCKET_STATES.DISCONNECTED 
    });
  },
}));
