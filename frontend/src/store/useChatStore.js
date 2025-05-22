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
  },subscribeToChatStatus: () => {
    const socket = useAuthStore.getState().socket

    if (!socket) return

    // 先移除可能已存在的監聽器，防止重複監聽
    socket.off('chatStatus')
    socket.off('userLeftChat')

    socket.on('chatStatus', ({chatWithUserId, status}) => {
      console.log(`🔔 你與 ${chatWithUserId} 的狀態: ${status}`)

      // 只有當目前選取的用戶為相關用戶時才更新
      const selectedUser = get().selectedUser
      if (!selectedUser || selectedUser._id !== chatWithUserId) return

      if (status === 'connect') {
        console.log('✅ 你們都在同一個聊天室，狀態為 connect')
        
        // 只有在真正連線且雙方都在聊天室時才設定已讀狀態
        set({isReadMessagesConnect: true})        // 更新訊息為已讀
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
    })
      socket.on('userLeftChat', chatWithUserId => {
      const usersList = get().users
      const selectedUser = get().selectedUser
      const authUserId = useAuthStore.getState().authUser._id
      
      // 檢查離開的用戶是否為當前選定的用戶
      if (selectedUser && selectedUser._id === chatWithUserId) {
        const userName = usersList.find(user => user._id === chatWithUserId)?.fullName || chatWithUserId

        console.log(`🚪 對方 (${userName}) 已離開聊天室`)
        
        // 立即將已讀連線狀態設為 false，確保新訊息不再顯示為已讀
        set({isReadMessagesConnect: false})
        
        // 重要：對方離開聊天室時，不再重設已讀訊息的狀態
        // 已經被標記為已讀的訊息應該繼續顯示為已讀
        // 只有新訊息才應該受到 isReadMessagesConnect 狀態的影響
        console.log('對方離開聊天室：保留已讀訊息狀態，新訊息將為未讀')
      }
    })
  },

  userInChat: (selectedUser, authUser) => {
    const socket = useAuthStore.getState().socket
    if (!socket) return
    
    const userChatMap = [selectedUser._id, authUser._id]
    socket.emit('userInChat', userChatMap)
  },  userLeaveChat: () => {
    const selectedUser = get().selectedUser?._id
    const socket = useAuthStore.getState().socket
    if (!socket || !selectedUser) return

    console.log(`🚪 送出 userLeftChat 事件: ${selectedUser}`)
    socket.emit('userLeftChat', selectedUser)
    
    // 立即將已讀連線狀態設為 false，這只會影響新訊息
    set({isReadMessagesConnect: false})
    
    // 修正：保留已讀狀態，不再重設已經標記為已讀的訊息
    console.log('離開聊天室：保留已讀訊息狀態，新訊息將為未讀')
    
    // 不修改任何訊息的已讀狀態，讓之前已標記為已讀的訊息保持已讀
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
