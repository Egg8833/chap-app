import {Server} from 'socket.io'
import http from 'http'
import express from 'express'

const app = express()
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true
  },
})

// 追蹤使用者 socket 連接的對映表 (使用 Map 優化效能)
const userSocketMap = new Map() // { userId => socketId }

// 追蹤使用者目前在哪個聊天室中 (使用 Map 優化效能)
const activeChats = new Map() // { userId => chatWithUserId }

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
    // 檢查對方是否在線 (使用 Map.has 而非 in 運算子)
    const isOtherUserOnline = userSocketMap.has(chatWithUserId)
    
    // 檢查是否雙方都在聊天室
    const bothInChat = isBothInChat(currentUserId, chatWithUserId)
    
    // 設定聊天室狀態
    const status = bothInChat ? 'connect' : (isOtherUserOnline ? 'active' : 'offline')
    
    // 回傳狀態給自己
    const currentUserSocketId = userSocketMap.get(currentUserId)
    if (currentUserSocketId) {
      io.to(currentUserSocketId).emit('chatStatus', {
        chatWithUserId,
        status,
      })
    }
    
    // 如果對方在線，也回傳狀態給對方
    if (isOtherUserOnline) {
      const otherUserSocketId = userSocketMap.get(chatWithUserId)
      if (otherUserSocketId) {
        io.to(otherUserSocketId).emit('chatStatus', {
          chatWithUserId: currentUserId,
          status,
        })
      }
    }

    console.log(`聊天狀態更新 - ${currentUserId} 和 ${chatWithUserId}: ${status}`)
  } catch (error) {
    console.error('更新聊天狀態時發生錯誤:', error)
  }
}

/**
 * 處理使用者離開聊天室的通知
 * @param {string} userId - 離開的使用者 ID
 * @param {string} chatWithUserId - 聊天對象 ID
 */
function notifyUserLeft(userId, chatWithUserId) {
  try {
    const receiverSocketId = userSocketMap.get(chatWithUserId)
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('userLeftChat', userId)
      console.log('🚪 送出 userLeftChat 事件', userId, '給', chatWithUserId)
    }
  } catch (error) {
    console.error('發送離開聊天室通知時發生錯誤:', error)
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

      // 記錄當前使用者與誰聊天
      activeChats.set(currentUserId, chatWithUserId)
      
      // 更新並廣播聊天狀態
      updateAndBroadcastChatStatus(currentUserId, chatWithUserId)
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
      
      // 刪除 activeChats 記錄
      activeChats.delete(userId)

      // 通知對方
      notifyUserLeft(userId, chatWithUserId)
      
      // 更新聊天狀態
      updateAndBroadcastChatStatus(userId, chatWithUserId)
    } catch (error) {
      console.error('處理使用者離開聊天室時發生錯誤:', error)
    }
  })

  // 處理使用者明確登出
  socket.on('userLogout', () => {
    try {
      console.log(`使用者 ${userId} 明確登出`)
      
      // 獲取此用戶當前正在與誰聊天
      const chatWithUserId = activeChats.get(userId)
      
      // 清除此用戶的資料
      userSocketMap.delete(userId)
      activeChats.delete(userId)
      
      // 如果用戶在與某人聊天，通知那個人此用戶已登出
      if (chatWithUserId) {
        notifyUserLeft(userId, chatWithUserId)
        
        // 更新聊天狀態
        updateAndBroadcastChatStatus(userId, chatWithUserId)
      }

      // 廣播更新後的在線使用者列表
      io.emit('getOnlineUsers', Array.from(userSocketMap.keys()))
    } catch (error) {
      console.error('處理使用者登出時發生錯誤:', error)
    }
  })

  // 處理使用者斷線
  socket.on('disconnect', () => {
    try {
      console.log('使用者已斷線:', socket.id)
      
      // 確保 userId 存在
      if (!userId) return
      
      // 檢查是否是同一使用者的最後一個連線
      const currentSocketId = userSocketMap.get(userId)
      if (currentSocketId !== socket.id) {
        console.log(`使用者 ${userId} 的連線 ${socket.id} 斷線，但有更新的連線 ${currentSocketId}，保留狀態`)
        return
      }
      
      // 獲取此用戶當前正在與誰聊天
      const chatWithUserId = activeChats.get(userId)
      
      // 清除此用戶的資料
      userSocketMap.delete(userId)
      activeChats.delete(userId)
      
      // 如果用戶在與某人聊天，通知那個人此用戶已離線
      if (chatWithUserId) {
        notifyUserLeft(userId, chatWithUserId)
        
        // 更新聊天狀態
        updateAndBroadcastChatStatus(userId, chatWithUserId)
      }

      // 廣播更新後的在線使用者列表
      io.emit('getOnlineUsers', Array.from(userSocketMap.keys()))
      console.log('使用者離線後的線上名單:', Array.from(userSocketMap.keys()))
    } catch (error) {
      console.error('處理使用者斷線時發生錯誤:', error)
    }
  })
})

export {io, app, server}
