import {Server} from 'socket.io'
import http from 'http'
import express from 'express'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? 'https://chap-app-sigma.vercel.app'
      : 'http://localhost:5173', 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
})

// 使用者狀態管理 (使用 Map 優化效能)
const userSocketMap = new Map() // { userId => socketId }
const activeChats = new Map()   // { userId => chatWithUserId }

/**
 * 發送使用者狀態變化的通知
 * @param {string} userId - 發出通知的使用者 ID
 * @param {string} chatWithUserId - 接收通知的使用者 ID
 * @param {string} eventType - 事件類型 ('userEnteredChat' 或 'userLeftChat')
 * @returns {boolean} 通知是否成功發送
 */
function notifyUserStatus(userId, chatWithUserId, eventType) {
  try {
    const receiverSocketId = userSocketMap.get(chatWithUserId)
    if (!receiverSocketId) return false
    
    io.to(receiverSocketId).emit(eventType, userId)
    
    const action = eventType === 'userEnteredChat' ? '進入' : '離開'
    console.log(`🚪 通知 ${chatWithUserId}：${userId} ${action}聊天室`)
    return true
  } catch (error) {
    console.error(`發送${eventType === 'userEnteredChat' ? '進入' : '離開'}聊天室通知時發生錯誤:`, error)
    return false
  }
}

/**
 * 取得指定使用者的 socket ID
 * @param {string} userId - 使用者 ID
 * @returns {string|undefined} socket ID 或 undefined
 */
export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId)
}

/**
 * 檢查兩個使用者是否都在互相的聊天室中
 * @param {string} userId1 - 第一個使用者 ID
 * @param {string} userId2 - 第二個使用者 ID
 * @returns {boolean} 是否都在聊天室中
 */
export function isBothInChat(userId1, userId2) {
  return activeChats.get(userId1) === userId2 && activeChats.get(userId2) === userId1
}

/**
 * 更新並廣播聊天室狀態
 * @param {string} currentUserId - 目前使用者 ID
 * @param {string} chatWithUserId - 聊天對象 ID
 */
function updateAndBroadcastChatStatus(currentUserId, chatWithUserId) {
  try {
    // 檢查對方是否在線
    const isOtherUserOnline = userSocketMap.has(chatWithUserId)
    
    // 檢查是否雙方都在聊天室
    const bothInChat = isBothInChat(currentUserId, chatWithUserId)
    
    // 設定聊天室狀態
    const status = bothInChat ? 'connect' : (isOtherUserOnline ? 'active' : 'offline')
    
    // 定義發送狀態的輔助函式
    const sendStatus = (userId, partnerId, chatStatus) => {
      const socketId = userSocketMap.get(userId)
      if (socketId) {
        io.to(socketId).emit('chatStatus', {
          chatWithUserId: partnerId,
          status: chatStatus,
        })
      }
    }
    
    // 回傳狀態給自己
    sendStatus(currentUserId, chatWithUserId, status)
    
    // 如果對方在線，也回傳狀態給對方
    if (isOtherUserOnline) {
      sendStatus(chatWithUserId, currentUserId, status)
    }

    console.log(`聊天狀態更新 - ${currentUserId} 和 ${chatWithUserId}: ${status}`)
  } catch (error) {
    console.error('更新聊天狀態時發生錯誤:', error)
  }
}

/**
 * 清理使用者資料並處理離開聊天室
 * @param {string} userId - 使用者 ID
 * @param {boolean} broadcast - 是否廣播在線使用者列表更新
 * @returns {boolean} 是否成功清理資料
 */
function cleanupUserData(userId, broadcast = true) {
  if (!userId) {
    console.warn('嘗試清理無效的 userId')
    return false
  }
  
  try {
    // 獲取當前聊天對象（如果有）
    const chatWithUserId = activeChats.get(userId)
    
    // 清除使用者資料
    userSocketMap.delete(userId)
    activeChats.delete(userId)
    
    // 如果有聊天對象，發送離開通知
    if (chatWithUserId) {
      notifyUserStatus(userId, chatWithUserId, 'userLeftChat')
      updateAndBroadcastChatStatus(userId, chatWithUserId)
    }
    
    // 廣播更新後的在線使用者列表
    if (broadcast) {
      io.emit('getOnlineUsers', Array.from(userSocketMap.keys()))
      console.log('更新線上名單:', Array.from(userSocketMap.keys()))
    }
    
    return true
  } catch (error) {
    console.error('清理使用者資料時發生錯誤:', error)
    return false
  }
}

// Socket 連線處理
io.on('connection', socket => {
  console.log('使用者已連線:', socket.id)

  const userId = socket.handshake.query.userId
  if (!userId) {
    console.warn('使用者連線但未提供 userId，關閉連線')
    socket.disconnect()
    return
  }

  // 檢查是否已有此使用者的其他連線
  const existingSocketId = userSocketMap.get(userId)
  if (existingSocketId && existingSocketId !== socket.id) {
    console.log(`使用者 ${userId} 已有連線，舊連線為 ${existingSocketId}，新連線為 ${socket.id}`)
    
    // 更新 socket 映射
    userSocketMap.set(userId, socket.id)
    
    // 重新建立使用者的聊天狀態
    const previousChatWithUserId = activeChats.get(userId)
    if (previousChatWithUserId) {
      console.log(`重新建立使用者 ${userId} 的聊天狀態，之前在與 ${previousChatWithUserId} 聊天`)
      updateAndBroadcastChatStatus(userId, previousChatWithUserId)
    }
  } else {
    // 儲存使用者 socket 映射
    userSocketMap.set(userId, socket.id)
  }

  // 廣播在線使用者列表
  io.emit('getOnlineUsers', Array.from(userSocketMap.keys()))
  console.log('線上使用者:', Array.from(userSocketMap.keys()))

  // 處理使用者進入聊天室
  socket.on('userInChat', userInChat => {
    try {
      const [chatWithUserId, currentUserId] = userInChat // [對方ID, 自己ID]
      if (!chatWithUserId || !currentUserId) {
        console.warn('進入聊天室時缺少必要資訊')
        return
      }

      console.log(`使用者 ${currentUserId} 進入與 ${chatWithUserId} 的聊天室`)
      
      // 檢查之前是否有在聊天室
      const previousChatWith = activeChats.get(currentUserId)
      if (previousChatWith && previousChatWith !== chatWithUserId) {
        console.log(`使用者 ${currentUserId} 從聊天室 ${previousChatWith} 切換到 ${chatWithUserId}`)
        // 如果從另一個聊天室切換過來，先通知對方自己已離開
        notifyUserStatus(currentUserId, previousChatWith, 'userLeftChat')
      }
      
      // 記錄當前使用者與誰聊天
      activeChats.set(currentUserId, chatWithUserId)
      
      // 更新並廣播聊天狀態
      updateAndBroadcastChatStatus(currentUserId, chatWithUserId)
      
      // 若對方在線，發送雙向通知
      if (userSocketMap.has(chatWithUserId)) {
        // 發送通知給對方：我進入了聊天室
        notifyUserStatus(currentUserId, chatWithUserId, 'userEnteredChat')
        
        // 如果對方也在和我聊天，則發送通知給自己：對方進入了聊天室
        if (activeChats.get(chatWithUserId) === currentUserId) {
          notifyUserStatus(chatWithUserId, currentUserId, 'userEnteredChat')
        }
      }
    } catch (error) {
      console.error('處理使用者進入聊天室時發生錯誤:', error)
    }
  })
  // 處理使用者離開聊天室
  socket.on('userLeftChat', chatWithUserId => {
    try {
      if (!chatWithUserId) {
        console.warn('離開聊天室時缺少聊天對象 ID')
        return
      }
      console.log(`使用者 ${userId} 離開與 ${chatWithUserId} 的聊天室`)
      
      // 如果使用者確實在這個聊天室，發送離開通知
      if (activeChats.get(userId) === chatWithUserId) {
        notifyUserStatus(userId, chatWithUserId, 'userLeftChat')
      }
      
      // 清除聊天室狀態並更新
      activeChats.delete(userId)
      updateAndBroadcastChatStatus(userId, chatWithUserId)
    } catch (error) {
      console.error('處理使用者離開聊天室時發生錯誤:', error)
    }
  })  // 處理使用者明確登出
  socket.on('userLogout', () => {
    console.log(`使用者 ${userId} 明確登出`)
    cleanupUserData(userId)
  })
  // 處理使用者斷線
  socket.on('disconnect', () => {
    console.log('使用者已斷線:', socket.id)
    
    // 確保 userId 存在
    if (!userId) return
    
    // 檢查是否是同一使用者的最後一個連線
    const currentSocketId = userSocketMap.get(userId)
    if (currentSocketId !== socket.id) {
      console.log(`使用者 ${userId} 的連線 ${socket.id} 斷線，但有更新的連線 ${currentSocketId}，保留狀態`)
      return
    }
    
    // 處理清理邏輯
    cleanupUserData(userId)
  })
})

export {io, app, server}
