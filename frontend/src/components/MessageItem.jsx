import {formatMessageTime} from '../lib/utils'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'

const MessageItem = ({
  message,
  authUser,
  selectedUser,
  isReadMessagesConnect,
  isLastMessage,
  messageEndRef,
}) => {
  // 如果是系統訊息，使用不同的渲染方式
  if (message.isSystemMessage) {
    return (
      <div 
        className="flex justify-center my-2"
        ref={isLastMessage ? messageEndRef : null}
      >
        <div className="bg-base-300 px-4 py-1 rounded-full text-sm opacity-70">
          {message.text}
        </div>
      </div>
    )
  }
  
  const [showRead, setShowRead] = useState(false)
  const { onlineUsers } = useAuthStore()
  const isSentByUser = message.senderId === authUser._id
  const profilePic = isSentByUser
    ? authUser.profilePic || '/avatar.png'
    : selectedUser.profilePic || '/avatar.png'
  // 檢查接收者是否在線上
  const isReceiverOnline = onlineUsers.includes(selectedUser._id)
  
  // 決定是否顯示已讀圖示 - 修正為更穩健的邏輯
  useEffect(() => {
    const shouldShowRead = 
      isSentByUser && (
        message.isRead || // 如果訊息已被標記為已讀，永遠顯示為已讀
        (isReadMessagesConnect && isReceiverOnline) // 否則只有當雙方都在聊天室且對方在線時才顯示已讀
      )
    
    setShowRead(shouldShowRead)
  }, [message.isRead, isReadMessagesConnect, isSentByUser, isReceiverOnline, selectedUser._id])
  
  // 使用計算後的狀態，不再需要額外的變數
  const showReadReceipt = showRead

  return (
    <div
      className={`chat ${isSentByUser ? 'chat-end' : 'chat-start'}`}
      ref={isLastMessage ? messageEndRef : null}>
      <div className="chat-image avatar">
        <div className="size-10 rounded-full border">
          <img src={profilePic} alt="profile pic" />
        </div>
      </div>

      <div className="chat-header mb-1">
        <time className="text-xs opacity-50 ml-1">
          {formatMessageTime(message.createdAt)}
        </time>
      </div>

      <div className="chat-bubble flex flex-col">
        {message.image && (
          <img
            src={message.image}
            alt="Attachment"
            className="sm:max-w-[200px] rounded-md mb-2"
          />
        )}
        {message.text && <p>{message.text}</p>}
        {showReadReceipt && (
          <span className="text-xs opacity-50 absolute -left-8 bottom-3">
            已讀
          </span>
        )}
      </div>
    </div>
  )
}

export default MessageItem
