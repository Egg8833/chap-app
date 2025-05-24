import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import {useChatStore} from './useChatStore'
const BASE_URL = import.meta.env.MODE === "production" 
  ? (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL)
  : "http://localhost:3000";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      
      // 驗證回傳的資料是否為有效使用者物件
      if (res.data && res.data._id) {
        set({ authUser: res.data });
        get().connectSocket();
      } else {
        console.warn("回傳的使用者資料無效:", res.data);
        set({ authUser: null });
      }
    } catch (error) {
      console.log("Error in checkAuth:", error?.response?.data?.message || error.message);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isLoggingIn: false });
    }
  },  logout: async () => {
    try {
      const { selectedUser, setSelectedUser } = useChatStore.getState()
      
      // 發送離開聊天室事件，但不修改訊息狀態
      const socket = get().socket
      if (socket && socket.connected) {
        // 如果有選定的用戶，發送離開聊天室事件
        if (selectedUser) {
          socket.emit('userLeftChat', selectedUser._id)
        }
        
        // 發送明確登出事件到 socket 伺服器
        socket.emit('userLogout')
      }

      await axiosInstance.post("/auth/logout");
      toast.success("登出成功");

      get().disconnectSocket();
      setSelectedUser(null)
      set({ 
        authUser: null,
        onlineUsers: [] 
      });

    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("error in update profile:", error);
      toast.error(error.response.data.message);
    } finally {
      set({ isUpdatingProfile: false });
    }
  },  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) {
      console.warn('無法連接 socket：使用者未登入');
      return;
    }
    
    if (!authUser._id) {
      console.warn('無法連接 socket：使用者 ID 不存在');
      return;
    }
    
    // 檢查連線是否已存在但斷線
    if (get().socket) {
      // 嘗試重新連線
      if (!get().socket.connected) {
        get().socket.connect();
        console.log('重新連線到 socket 伺服器');
      }
      return;
    }

    try {
      console.log(`嘗試連接到 socket 伺服器: ${BASE_URL}`);
      
      // 建立新的 socket 連線
      const socket = io(BASE_URL, {
        query: {
          userId: authUser._id,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
        transports: ['websocket', 'polling']
      });
      
      socket.connect();
      console.log('連線到 socket 伺服器，使用者 ID:', authUser._id);

      set({ socket: socket });
    } catch (error) {
      console.error('Socket 連線失敗:', error);
      toast.error('無法連接到聊天服務，請稍後再試');
    }

    // 設定事件監聽器
    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
      console.log('更新線上使用者列表:', userIds);
    });
    
    socket.on('connect', () => {
      console.log('Socket 連線成功');
    });
    
    socket.on('disconnect', () => {
      console.log('Socket 連線已斷開');
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket 重新連線成功，嘗試次數: ${attemptNumber}`);
    });    // 重新整理頁面時的處理 - 確保在頁面關閉前執行完成
    const handleBeforeUnload = () => {
      const { selectedUser } = useChatStore.getState();
      
      if (selectedUser && socket.connected) {
        console.log('頁面即將重新整理，發送離開聊天室事件');
        
        // 只發送離開聊天室事件，不修改訊息狀態
        // 這樣可以保留已讀訊息狀態
        socket.emit('userLeftChat', selectedUser._id);
        
        // 將聊天狀態設為 false，但不修改已讀訊息
        socket.emit('chatStatus', {
          chatWithUserId: selectedUser._id,
          status: 'inactive'
        });
        
        // 伺服器同步處理，確保狀態更新
        socket.emit('sync');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // 返回一個函式用於清理事件監聽器
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  },
  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));
