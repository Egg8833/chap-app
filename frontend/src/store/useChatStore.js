import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
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

    socket.on('newMessage', newMessage => {
      const isMessageSentFromSelectedUser =
        newMessage.senderId === selectedUser._id
      if (!isMessageSentFromSelectedUser) return

      set({
        messages: [...get().messages, newMessage],
      })
    })
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket
    socket.off('newMessage')
  },
  subscribeToChatStatus: () => {
    const socket = useAuthStore.getState().socket
    if (!socket) return

    socket.on('chatStatus', ({chatWithUserId, status}) => {
      console.log(`🔔 你與 ${chatWithUserId} 的狀態: ${status}`)

      if (status === 'connect') {
        console.log('✅ 你們都在同一個聊天室，狀態為 connect')
        set({isReadMessagesConnect: true})
      } else if (status === 'active') {
        console.log('⚡️ 你進入聊天室，對方在線但未進入你的聊天室')
        set({isReadMessagesConnect: false})
      } else {
        console.log('❌ 對方不在線')
        set({isReadMessagesConnect: false})
      }
    })

    socket.on('userLeftChat', chatWithUserId => {
      console.log(`🚪 對方 (${chatWithUserId}) 已離開聊天室`)
      set({isReadMessagesConnect: false})
    })

    return () => {
      socket.off('chatStatus')
      socket.off('userLeftChat')
      console.log('🔕 已移除 chatStatus & userLeftChat 監聽')
    }
  },

  userInChat: (selectedUser, authUser) => {
    const socket = useAuthStore.getState().socket
    const userChatMap = [selectedUser, authUser]
    socket.emit('userInChat', userChatMap)
  },
  userLeaveChat: () => {
    const selectedUser = get().selectedUser?._id
    const socket = useAuthStore.getState().socket
    if (!socket) return

    console.log(`🚪 送出 userLeftChat 事件: ${selectedUser}`)
    socket.emit('userLeftChat', selectedUser)
  },

  setSelectedUser: async selectedUser => set({selectedUser}),

  getReadMessagesApi: async selectedUserId => {
    const res = await axiosInstance.get(
      `/messages/markAsRead/${selectedUserId}`
    )
    console.log('select res-', res.data)
  },
}))
