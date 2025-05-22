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

// 追蹤使用者 socket 連接的對映表
const userSocketMap = {} // { userId: socketId }

// 追蹤使用者目前在哪個聊天室中
const activeChats = {} // { userId: chatWithUserId }

/**
 * 取得指定使用者的 socket ID
 * @param {string} userId - 使用者 ID
 * @returns {string|undefined} socket ID 或 undefined
 */
export function getReceiverSocketId(userId) {
  return userSocketMap[userId]
}

/**
 * 檢查兩個使用者是否都在互相的聊天室中
 * @param {string} userId1 - 第一個使用者 ID
 * @param {string} userId2 - 第二個使用者 ID
 * @returns {boolean} 是否都在聊天室中
 */
export function isBothInChat(userId1, userId2) {
  return activeChats[userId1] === userId2 && activeChats[userId2] === userId1
}

/**
 * 更新並廣播聊天室狀態
 * @param {string} currentUserId - 目前使用者 ID
 * @param {string} chatWithUserId - 聊天對象 ID
 */
function updateAndBroadcastChatStatus(currentUserId, chatWithUserId) {
  // 檢查對方是否在線
  const isOtherUserOnline = chatWithUserId in userSocketMap
  
  // 檢查是否雙方都在聊天室
  const bothInChat = isBothInChat(currentUserId, chatWithUserId)
  
  // 設定聊天室狀態
  const status = bothInChat ? 'connect' : (isOtherUserOnline ? 'active' : 'offline')
  
  // 回傳狀態給自己
  if (userSocketMap[currentUserId]) {
    io.to(userSocketMap[currentUserId]).emit('chatStatus', {
      chatWithUserId,
      status,
    })
  }
  
  // 如果對方在線，也回傳狀態給對方
  if (isOtherUserOnline) {
    io.to(userSocketMap[chatWithUserId]).emit('chatStatus', {
      chatWithUserId: currentUserId,
      status,
    })
  }
}

/**
 * 處理使用者離開聊天室的通知
 * @param {string} userId - 離開的使用者 ID
 * @param {string} chatWithUserId - 聊天對象 ID
 */
function notifyUserLeft(userId, chatWithUserId) {
  if (userSocketMap[chatWithUserId]) {
    io.to(userSocketMap[chatWithUserId]).emit('userLeftChat', userId)
    console.log('🚪 送出 userLeftChat 事件', userId)
  }
}

// Socket 連線處理
io.on('connection', socket => {
  console.log('A user connected', socket.id)

  const userId = socket.handshake.query.userId
  if (userId) userSocketMap[userId] = socket.id

  // 廣播在線使用者列表
  io.emit('getOnlineUsers', Object.keys(userSocketMap))
  console.log('getOnlineUsers-userSocketMap', userSocketMap)

  // 處理使用者進入聊天室
  socket.on('userInChat', userInChat => {
    const [chatWithUserId, currentUserId] = userInChat // [對方ID, 自己ID]

    // 記錄當前使用者與誰聊天
    activeChats[currentUserId] = chatWithUserId
    
    // 更新並廣播聊天狀態
    updateAndBroadcastChatStatus(currentUserId, chatWithUserId)
  })

  // 處理使用者離開聊天室
  socket.on('userLeftChat', chatWithUserId => {
    // 刪除 activeChats 記錄
    delete activeChats[userId]

    // 通知對方
    notifyUserLeft(userId, chatWithUserId)
  })

  // 處理使用者斷線
  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id)
    
    // 獲取此用戶當前正在與誰聊天
    const chatWithUserId = activeChats[userId]
    
    // 清除此用戶的資料
    delete userSocketMap[userId]
    delete activeChats[userId]
    
    // 如果用戶在與某人聊天，通知那個人此用戶已離線
    if (chatWithUserId) {
      notifyUserLeft(userId, chatWithUserId)
    }

    // 廣播更新後的在線使用者列表
    io.emit('getOnlineUsers', Object.keys(userSocketMap))
    console.log('disconnect-userSocketMap', userSocketMap)
  })
})

export {io, app, server}
