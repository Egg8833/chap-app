import {formatMessageTime} from '../lib/utils'
const MessageItem = ({
  message,
  authUser,
  selectedUser,
  isReadMessagesConnect,
  isLastMessage,
  messageEndRef,
}) => {
  const isSentByUser = message.senderId === authUser._id
  const profilePic = isSentByUser
    ? authUser.profilePic || '/avatar.png'
    : selectedUser.profilePic || '/avatar.png'
  const showReadReceipt =
    isSentByUser && (message.isRead || isReadMessagesConnect)

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
