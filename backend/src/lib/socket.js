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

function isUserChatOnline(userChatId) {
  return userSocketMap.hasOwnProperty(userChatId)
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
    console.log('🔵 userInChat:', {chatWithUserId, currentUserId})

    // **🔹 先通知舊的聊天室對象：「我離開了聊天室」**
    if (activeChats[currentUserId]) {
      const previousChatWithUserId = activeChats[currentUserId]
      const previousRoom = `room-${currentUserId}-${previousChatWithUserId}`

      // 離開舊的房間
      socket.leave(previousRoom)
      console.log(`🚪 ${currentUserId} 離開 ${previousRoom}`)

      // 通知還在聊天室的用戶
      io.to(previousRoom).emit('userLeftChat', currentUserId)
    }

    // **🔹 記錄當前使用者與誰聊天**
    activeChats[currentUserId] = chatWithUserId
    console.log('📌 activeChats:', activeChats)

    // **🔹 設定 room**
    const room = `room-${currentUserId}-${chatWithUserId}`
    socket.join(room)
    console.log(`🏠 ${currentUserId} 加入 ${room}`)

    // **🔹 檢查對方是否在線**
    const isOtherUserOnline = chatWithUserId in userSocketMap

    // **🔹 檢查是否雙方都在聊天室**
    isBothInChat =
      activeChats[chatWithUserId] === currentUserId &&
      activeChats[currentUserId] === chatWithUserId

    // **🔹 如果雙方都在彼此聊天室，讓對方加入相同的 room**
    if (isBothInChat && userSocketMap[chatWithUserId]) {
      io.to(userSocketMap[chatWithUserId]).socketsJoin(room)
      console.log(`🔗 雙方都在 ${room}`)
    }

    // **🔹 設定聊天室狀態**
    const status = isBothInChat
      ? 'connect'
      : isOtherUserOnline
      ? 'active'
      : 'offline'

    console.log('⚡️ 更新狀態:', {currentUserId, chatWithUserId, status})

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
    console.log(`❌ ${userId} 離開與 ${chatWithUserId} 的聊天室`)

    // **🔹 刪除 activeChats 記錄**
    delete activeChats[userId]

    // **🔹 離開 room**
    const room = `room-${userId}-${chatWithUserId}`
    socket.leave(room)
    console.log(`🚪 ${userId} 離開 ${room}`)

    // **🔹 如果對方在線，通知對方**
    if (userSocketMap[chatWithUserId]) {
      io.to(userSocketMap[chatWithUserId]).emit('userLeftChat', userId)
    }
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id)
    delete userSocketMap[userId]

    // **🔹 移除 activeChats 記錄**
    delete activeChats[userId]

    // **🔹 離開所有聊天室**
    const rooms = Array.from(socket.rooms).filter(r => r.startsWith('room-'))
    rooms.forEach(room => {
      socket.leave(room)
      io.to(room).emit('userLeftChat', userId)
      console.log(`🚪 ${userId} 離開 ${room} (disconnect)`)
    })

    io.emit('getOnlineUsers', Object.keys(userSocketMap))
    console.log('disconnect-userSocketMap', userSocketMap)
  })
})

export {io, app, server, isBothInChat}
