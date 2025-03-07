import {Server} from 'socket.io'
import http from 'http'
import express from 'express'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173'],
  },
})

export function getReceiverSocketId(userId) {
  return userSocketMap[userId]
}

const userSocketMap = {} // { userId: socketId }
const activeChats = {} // { userId: chatWithUserId }
let isBothInChat = false

io.on('connection', socket => {
  console.log('A user connected', socket.id)

  const userId = socket.handshake.query.userId
  if (userId) userSocketMap[userId] = socket.id

  io.emit('getOnlineUsers', Object.keys(userSocketMap))
  console.log('getOnlineUsers-userSocketMap', userSocketMap)

  socket.on('userInChat', userInChat => {
    const [chatWithUserId, currentUserId] = userInChat // [對方ID, 自己ID]


    // **🔹 記錄當前使用者與誰聊天**
    activeChats[currentUserId] = chatWithUserId

    // **🔹 檢查對方是否在線**
    const isOtherUserOnline = chatWithUserId in userSocketMap

    // **🔹 檢查是否雙方都在聊天室**
    isBothInChat =
      activeChats[chatWithUserId] === currentUserId &&
      activeChats[currentUserId] === chatWithUserId

    // **🔹 設定聊天室狀態**
    const status = isBothInChat
      ? 'connect'
      : isOtherUserOnline
      ? 'active'
      : 'offline'



    // **🔹 回傳狀態給自己**
    if (userSocketMap[currentUserId]) {
      io.to(userSocketMap[currentUserId]).emit('chatStatus', {
        chatWithUserId,
        status,
      })
    }

    // **🔹 如果對方在線，也回傳狀態給對方**
    if (isOtherUserOnline) {
      io.to(userSocketMap[chatWithUserId]).emit('chatStatus', {
        chatWithUserId: currentUserId,
        status,
      })
    }
  })

  socket.on('userLeftChat', chatWithUserId => {
    // **🔹 刪除 activeChats 記錄**
    delete activeChats[userId]

    // **🔹 如果對方在線，通知對方**
    if (userSocketMap[chatWithUserId]) {
      io.to(userSocketMap[chatWithUserId]).emit('userLeftChat', userId)
      console.log('🚪 送出 userLeftChat 事件', userId)
    }
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id)
    delete userSocketMap[userId]
    delete activeChats[userId]

    io.emit('getOnlineUsers', Object.keys(userSocketMap))
    console.log('disconnect-userSocketMap', userSocketMap)
  })
})

export {io, app, server, isBothInChat}
