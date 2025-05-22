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
    
    if (selectedUser && authUser) {
      console.log(`進入聊天室: ${selectedUser.fullName} (${selectedUser._id})`)
      
      // 1. 首先獲取訊息歷史
      getMessages(selectedUser._id)
      
      // 2. 設定事件監聽器 - 先訂閱新訊息事件
      subscribeToMessages()
      
      // 3. 訂閱聊天狀態變更事件
      subscribeToChatStatus()
      
      // 4. 告知後端此使用者進入聊天室 (最後執行，確保前端準備就緒)
      userInChat(selectedUser, authUser)
      
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
    }
  }, [
    // 只在這些值變化時重新執行
    selectedUser?._id,
    authUser?._id
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
