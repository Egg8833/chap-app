import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

function isUserChatOnline(userChatId) {
  return userSocketMap.hasOwnProperty(userChatId)
}

const userSocketMap = {} // { userId: socketId }
let userChat = null // ✅ 改成 null 避免錯誤
let userChatAndOnline = false

io.on('connection', socket => {
  console.log('A user connected', socket.id)

  const userId = socket.handshake.query.userId
  if (userId) userSocketMap[userId] = socket.id

  io.emit('getOnlineUsers', Object.keys(userSocketMap))
  updateUserChatStatus() // ✅ 重新計算 userChatAndOnline

  socket.on('userInChat', userInChat => {
    userChat = userInChat[0] || null // ✅ 確保 userChat 不是 undefined
    updateUserChatStatus()
    console.log('userInChat-userChatAndOnline', userChatAndOnline)
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id)
    delete userSocketMap[userId]

    io.emit('getOnlineUsers', Object.keys(userSocketMap))
    updateUserChatStatus() // ✅ 重新計算 userChatAndOnline
    console.log('disconnect-userChatAndOnline', userChatAndOnline)
    console.log('disconnect-userSocketMap', userSocketMap)
  })
})

// ✅ 新增一個函式來確保 `userChatAndOnline` 會正確更新
function updateUserChatStatus() {
  userChatAndOnline = userChat ? userSocketMap.hasOwnProperty(userChat) : false
}


export {io, app, server, userChatAndOnline}
