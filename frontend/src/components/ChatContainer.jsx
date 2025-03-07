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
  } = useChatStore()
  const {authUser} = useAuthStore()
  const messageEndRef = useRef(null)

  useEffect(() => {
    getMessages(selectedUser._id)
    subscribeToMessages()

    return () => unsubscribeFromMessages()
  }, [
    selectedUser._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
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
