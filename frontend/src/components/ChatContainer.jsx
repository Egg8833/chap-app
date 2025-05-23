import {useChatStore} from '../store/useChatStore'
import {useEffect, useRef} from 'react'

import ChatHeader from './ChatHeader'
import MessageInput from './MessageInput'
import MessageSkeleton from './skeletons/MessageSkeleton'
import {useAuthStore} from '../store/useAuthStore'
import MessageItem from './MessageItem'

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    isReadMessagesConnect,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    userInChat,
    userLeaveChat,
    subscribeToChatStatus,
  } = useChatStore()
  const {authUser} = useAuthStore()
  const messageEndRef = useRef(null)
    useEffect(() => {
    if (!selectedUser || !authUser) return
    
    console.log(`初始化聊天室: ${selectedUser.fullName} (${selectedUser._id})`)
    
    // 1. 首先獲取訊息歷史
    getMessages(selectedUser._id)
    
    // 2. 設定事件監聽器 - 先訂閱新訊息事件和聊天狀態
    subscribeToMessages()
    subscribeToChatStatus() // 這個函數內包含了進入/離開聊天室的事件監聽
    
    // 3. 告知後端此使用者進入聊天室 (確保前端已設置好事件監聽)
    setTimeout(() => {
      console.log(`通知後端使用者進入聊天室: ${selectedUser._id}`)
      userInChat(selectedUser, authUser)
    }, 100) // 小延遲確保事件監聽器已設置完成
    
    // 5. 標記對方發來的訊息為已讀
    const markAsReadTimer = setTimeout(() => {
      if (selectedUser && authUser) {
        useChatStore.getState().getReadMessagesApi(selectedUser._id)
      }
    }, 1000) // 延遲 1 秒，確保聊天室初始化完成
    
    // 清理函數
    return () => {
      console.log(`離開聊天室: ${selectedUser.fullName} (${selectedUser._id})`)
      clearTimeout(markAsReadTimer)
      
      // 1. 首先通知後端離開聊天室
      userLeaveChat()
      
      // 2. 然後取消訊息事件監聽
      unsubscribeFromMessages()
    }
  }, [
    selectedUser,
    authUser,
    getMessages,
    subscribeToMessages,
    subscribeToChatStatus,
    userInChat,
    userLeaveChat,
    unsubscribeFromMessages
  ])

  useEffect(() => {
    if (messageEndRef.current && messages.length) {
      messageEndRef.current.scrollIntoView({behavior: 'smooth'})
    }
  }, [messages])

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <MessageItem
            key={message._id}
            message={message}
            authUser={authUser}
            selectedUser={selectedUser}
            isReadMessagesConnect={isReadMessagesConnect}
            isLastMessage={index === messages.length - 1}
            messageEndRef={messageEndRef}
          />
        ))}
      </div>

      <MessageInput />
    </div>
  )
}

export default ChatContainer
