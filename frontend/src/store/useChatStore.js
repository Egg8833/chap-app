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

        const messages = get().messages
        const updatedMessages = messages.map(msg =>
            !msg.isRead ? {...msg, isRead: true} : msg
          )
        set({messages: updatedMessages})

      } else if (status === 'active') {
        console.log('⚡️ 你進入聊天室，對方在線但未進入你的聊天室')
        set({isReadMessagesConnect: false})
      } else {
        console.log('❌ 對方不在線')
        set({isReadMessagesConnect: false})
      }
    })

    socket.on('userLeftChat', chatWithUserId => {
      const usersList = get().users

      const userName = usersList.find(user => user._id === chatWithUserId).fullName || chatWithUserId

      console.log(`🚪 對方 (${userName}) 已離開聊天室`)
      set({isReadMessagesConnect: false})
    })
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

  setSelectedUser:  selectedUser => set({selectedUser}),

  getReadMessagesApi: async selectedUserId => {
    const res = await axiosInstance.get(
      `/messages/markAsRead/${selectedUserId}`
    )
    console.log('isAllReadMessages', res.data)
  },
}))
