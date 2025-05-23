import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import {devtools} from 'zustand/middleware'

export const useChatStore = create(
  devtools(
  (set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isReadMessagesConnect: false,

  getUsers: async () => {
    set({isUsersLoading: true})
    try {
      const res = await axiosInstance.get('/messages/users')
      set({users: res.data})
    } catch (error) {
      toast.error(error.response.data.message)
    } finally {
      set({isUsersLoading: false})
    }
  },

  getMessages: async userId => {
    set({isMessagesLoading: true})
    try {
      const res = await axiosInstance.get(`/messages/${userId}`)
      set({messages: res.data})
    } catch (error) {
      toast.error(error.response.data.message)
    } finally {
      set({isMessagesLoading: false})
    }
  },
  sendMessage: async messageData => {
    const {selectedUser, messages} = get()
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      )
      set({messages: [...messages, res.data]})
    } catch (error) {
      toast.error(error.response.data.message)
    }
  },
  subscribeToMessages: () => {
    const {selectedUser} = get()
    if (!selectedUser) return

    const socket = useAuthStore.getState().socket
    if (!socket) return
    
    // 先移除舊的事件處理器，避免重複監聽
    socket.off('newMessage')
    socket.off('messagesRead')

    // 監聽新訊息
    socket.on('newMessage', newMessage => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id
      if (!isMessageSentFromSelectedUser) return

      console.log('收到來自選定用戶的新訊息:', newMessage._id)
      
      set({
        messages: [...get().messages, newMessage],
      })
    })
    
    // 監聽訊息已讀事件
    socket.on('messagesRead', ({by, messageIds}) => {
      // 確認是目前選定的用戶標記了訊息為已讀
      if (by !== selectedUser._id) {
        console.log('收到非目前聊天對象的已讀通知，忽略')
        return
      }
      
      console.log(`收到訊息已讀通知，共 ${messageIds?.length || 0} 條`)
      
      // 更新訊息為已讀
      const currentMessages = get().messages
      const updatedMessages = currentMessages.map(msg => {
        if (messageIds?.includes(msg._id) || (!msg.isRead && msg.senderId === useAuthStore.getState().authUser._id)) {
          return {...msg, isRead: true}
        }
        return msg
      })
      
      // 如果有變更，更新狀態
      if (JSON.stringify(currentMessages) !== JSON.stringify(updatedMessages)) {
        console.log('更新訊息已讀狀態')
        set({messages: updatedMessages})
      }
    })
  },
  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket
    if (!socket) return
    
    // 取消所有相關事件的監聽
    socket.off('newMessage')
    socket.off('messagesRead')
    
    console.log('已取消訊息事件監聽')
  },
  
  subscribeToChatStatus: () => {
    const socket = useAuthStore.getState().socket

    if (!socket) return

    // 先移除可能已存在的監聽器，防止重複監聽
    socket.off('chatStatus')
    socket.off('userEnteredChat')
    socket.off('userLeftChat')
    
    // 監聽聊天狀態事件
    socket.on('chatStatus', ({chatWithUserId, status}) => {
      console.log(`🔔 你與 ${chatWithUserId} 的狀態: ${status}`)

      // 只有當目前選取的用戶為相關用戶時才更新
      const selectedUser = get().selectedUser
      if (!selectedUser || selectedUser._id !== chatWithUserId) return

      if (status === 'connect') {
        console.log('✅ 你們都在同一個聊天室，狀態為 connect')
        
        // 只有在真正連線且雙方都在聊天室時才設定已讀狀態
        set({isReadMessagesConnect: true})
        
        // 更新訊息為已讀
        const messages = get().messages
        const updatedMessages = messages.map(msg =>
            !msg.isRead && msg.senderId === useAuthStore.getState().authUser._id ? {...msg, isRead: true} : msg
          )
        set({messages: updatedMessages})
      } else {
        // 不管是 'active' 還是 'offline'，都確保設為未讀
        console.log(`⚠️ 狀態不是 connect (${status})，設定為未讀`)
        set({isReadMessagesConnect: false})
      }
    })  // 監聽使用者進入聊天室事件
    socket.on('userEnteredChat', userId => {
      const usersList = get().users
      const selectedUser = get().selectedUser
      const messages = get().messages
        // 確認進入聊天室的是自己正在聊天的對象
      if (selectedUser && userId === selectedUser._id) {
        const userName = usersList.find(user => user._id === userId)?.fullName || userId
        console.log(`🚪 ${userName} 進入了聊天室`)
        
        // 檢查最近訊息
        const lastMessages = messages.slice(-10)
        
        // 只檢查是否為重複通知，允許顯示進入訊息，即使剛剛有離開訊息
        const hasExactDuplicateMessage = lastMessages.some(msg => 
          msg.isSystemMessage && 
          msg.text === `${userName} 進入了聊天室` && 
          (Date.now() - new Date(msg.createdAt).getTime() < 3000) // 僅檢查最近3秒內的完全相同訊息
        )
        
        // 只有在偵測到完全相同的重複訊息時才不顯示
        if (hasExactDuplicateMessage) {
          console.log('忽略進入聊天室通知：偵測到完全相同的重複訊息')
          return
        }
        
        // 顯示系統訊息
        const systemMessage = {
          _id: `system-enter-${Date.now()}`,
          text: `${userName} 進入了聊天室`,
          isSystemMessage: true,
          createdAt: new Date().toISOString()
        }
        
        set({messages: [...messages, systemMessage]})
        console.log('新增進入聊天室系統訊息')
      }
    })    // 監聽使用者離開聊天室事件
    socket.on('userLeftChat', userId => {
      const usersList = get().users
      const selectedUser = get().selectedUser
      const messages = get().messages
        // 檢查離開的用戶是否為當前選定的用戶
      if (selectedUser && userId === selectedUser._id) {
        const userName = usersList.find(user => user._id === userId)?.fullName || userId
        console.log(`🚪 對方 (${userName}) 已離開聊天室`)
        
        // 立即將已讀連線狀態設為 false，確保新訊息不再顯示為已讀
        set({isReadMessagesConnect: false})
        
        // 檢查最近訊息
        const lastMessages = messages.slice(-10)
        
        // 只檢查是否為重複通知，允許顯示離開訊息，即使剛剛有進入訊息
        const hasExactDuplicateMessage = lastMessages.some(msg => 
          msg.isSystemMessage && 
          msg.text === `${userName} 已離開聊天室` && 
          (Date.now() - new Date(msg.createdAt).getTime() < 3000) // 僅檢查最近3秒內的完全相同訊息
        )
        
        // 只有在偵測到完全相同的重複訊息時才不顯示
        if (hasExactDuplicateMessage) {
          console.log('忽略離開聊天室通知：偵測到完全相同的重複訊息')
          return
        }
        
        // 顯示系統訊息
        const systemMessage = {
          _id: `system-leave-${Date.now()}`,
          text: `${userName} 已離開聊天室`,
          isSystemMessage: true,
          createdAt: new Date().toISOString()
        }
        
        set({messages: [...messages, systemMessage]})
        console.log('新增離開聊天室系統訊息')
      }
    })
  },

  userInChat: (selectedUser, authUser) => {
    const socket = useAuthStore.getState().socket
    if (!socket) return
    
    const userChatMap = [selectedUser._id, authUser._id]
    socket.emit('userInChat', userChatMap)
  },
  
  userLeaveChat: () => {
    const selectedUser = get().selectedUser?._id
    const socket = useAuthStore.getState().socket
    if (!socket || !selectedUser) return

    console.log(`🚪 送出 userLeftChat 事件: ${selectedUser}`)
    socket.emit('userLeftChat', selectedUser)
    
    // 立即將已讀連線狀態設為 false，這只會影響新訊息
    set({isReadMessagesConnect: false})
    
    // 修正：保留已讀狀態，不再重設已經標記為已讀的訊息
    console.log('離開聊天室：保留已讀訊息狀態，新訊息將為未讀')
  },

  setSelectedUser: selectedUser => {
    // 如果已經有選定的用戶，先發出離開聊天室的事件
    const previousSelectedUser = get().selectedUser
    if (previousSelectedUser) {
      get().userLeaveChat()
    }
    
    set({selectedUser})
  },

  getReadMessagesApi: async selectedUserId => {
    const res = await axiosInstance.get(
      `/messages/markAsRead/${selectedUserId}`
    )
    console.log('isAllReadMessages', res.data)
  },
})))
