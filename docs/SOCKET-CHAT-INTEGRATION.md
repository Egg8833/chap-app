# Socket 與 Chat Store 整合文件

本文件說明了 Real-time 聊天系統中的 Socket.io 後端與前端 Zustand store 之間的關聯與運作原理。此文件旨在幫助新開發人員理解系統架構及聊天功能的實現方式。

## 系統架構概述

聊天系統由以下主要元件組成：

1. **後端 Socket.io 伺服器** (socket.js)：處理即時事件、狀態管理與訊息廣播
2. **前端狀態管理** (useChatStore.js)：負責管理聊天訊息、使用者清單與UI狀態
3. **認證狀態管理** (useAuthStore.js)：處理使用者認證與Socket連線初始化

## 系統架構視覺化

```
┌──────────────────────────────────────────────────────────┐
│                       前端 (Frontend)                     │
│                                                          │
│  ┌───────────────────┐       ┌───────────────────────┐   │
│  │   useAuthStore    │◄─────►│      useChatStore     │   │
│  │                   │       │                       │   │
│  │  • 管理登入狀態    │提供   │  • 管理聊天訊息        │   │
│  │  • 建立Socket連線  │Socket │  • 處理聊天室狀態      │   │
│  │  • 管理線上用戶    │─────► │  • 發送/接收訊息       │   │
│  └───────────────────┘       └───────────────────────┘   │
│             ▲                           ▲                │
│             │                           │                │
│             └───────────────┬───────────┘                │
│                             │                            │
└─────────────────────────────┼────────────────────────────┘
                              │
                              │ WebSocket連線
                              │
┌─────────────────────────────┼────────────────────────────┐
│                             ▼                            │
│                      後端 (Backend)                       │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                     socket.js                      │  │
│  │                                                    │  │
│  │  • 管理WebSocket連線                                │  │
│  │  • 追蹤使用者狀態 (userSocketMap, activeChats)      │  │
│  │  • 處理聊天事件 (進入/離開/發送訊息)                 │  │
│  │  • 廣播狀態更新                                     │  │
│  └────────────────────────────────────────────────────┘  │
│                             ▲                            │
│                             │                            │
└─────────────────────────────┼────────────────────────────┘
                              │
                              │ 資料庫操作
                              │
┌─────────────────────────────┼────────────────────────────┐
│                             ▼                            │
│                        MongoDB                           │
│                                                          │
│  ┌────────────────┐    ┌────────────────┐                │
│  │  使用者資料     │    │    訊息資料     │                │
│  └────────────────┘    └────────────────┘                │
└──────────────────────────────────────────────────────────┘
```

## 後端 socket.js 關鍵功能

### 使用者狀態管理

```javascript
// 使用者狀態管理 (使用 Map 優化效能)
const userSocketMap = new Map() // { userId => socketId }
const activeChats = new Map()   // { userId => chatWithUserId }
```

* `userSocketMap`: 追蹤每個已登入使用者的 Socket ID
* `activeChats`: 記錄每個使用者目前正在與誰聊天

### 核心功能

1. **通知系統**：
   * `notifyUserStatus`: 統一處理使用者進入/離開聊天室的通知

2. **聊天狀態管理**：
   * `updateAndBroadcastChatStatus`: 當使用者進入、離開聊天室時更新狀態
   * `isBothInChat`: 檢查雙方是否都在同一聊天室中

3. **資源清理**：
   * `cleanupUserData`: 處理使用者登出或斷線時的清理工作

### 主要事件處理

```javascript
// 使用者進入聊天室
socket.on('userInChat', userInChat => {...})

// 使用者離開聊天室
socket.on('userLeftChat', chatWithUserId => {...})

// 使用者斷線
socket.on('disconnect', () => {...})

// 使用者明確登出
socket.on('userLogout', () => {...})
```

## 前端 useChatStore.js 關鍵功能

### 狀態管理

```javascript
messages: [],           // 當前聊天室的訊息
users: [],              // 可聊天的使用者清單
selectedUser: null,     // 目前選定的聊天對象
isReadMessagesConnect: false, // 訊息已讀連線狀態
```

### 核心功能

1. **訊息管理**：
   * `getMessages`: 從後端取得與特定使用者的訊息紀錄
   * `sendMessage`: 發送訊息到後端

2. **事件訂閱**：
   * `subscribeToMessages`: 訂閱新訊息與已讀狀態事件
   * `subscribeToChatStatus`: 監聽聊天狀態變化與通知事件
   * `addSystemMessage`: 統一處理系統訊息 (入/離聊天室通知)

3. **聊天控制**：
   * `userInChat`: 通知後端使用者進入聊天室
   * `userLeaveChat`: 通知後端使用者離開聊天室
   * `setSelectedUser`: 選擇聊天對象

## 前端 useAuthStore.js 的角色

作為連接 Socket 服務的橋樑：

```javascript
connectSocket: () => {
  const { authUser } = get();
  if (!authUser) return;
  
  // 建立 socket 連線
  const socket = io(BASE_URL, {
    query: {
      userId: authUser._id,
    }
  });
  
  set({ socket: socket });
  
  // 設定事件監聽...
}
```

## 連線與訊息流程

### 建立連線流程

1. 使用者登入後，`useAuthStore.connectSocket()` 建立與伺服器的 Socket 連線
2. 後端收到連線請求，記錄使用者 Socket ID 到 `userSocketMap`
3. 後端廣播更新後的在線使用者列表

### 進入聊天室流程

1. 用戶選擇聊天對象，觸發 `setSelectedUser()`
2. `userInChat()` 發送 `userInChat` 事件到伺服器
3. 伺服器更新 `activeChats` 並廣播聊天狀態
4. 伺服器發送 `userEnteredChat` 事件通知對方
5. 前端收到 `userEnteredChat`，顯示系統訊息

### 訊息交換流程

1. 使用者發送訊息，觸發 `sendMessage()`
2. 後端接收訊息，存入資料庫，並透過 Socket 轉發給接收者
3. 接收者透過 `subscribeToMessages` 監聽的 `newMessage` 事件接收訊息

### 已讀狀態流程

1. 當雙方都在同一聊天室，後端設定狀態為 `connect`
2. 前端收到 `chatStatus` 事件，若狀態為 `connect`，設定 `isReadMessagesConnect = true`
3. 當訊息設為已讀，前端呼叫 `getReadMessagesApi()` 通知後端
4. 後端發送 `messagesRead` 事件，接收方更新訊息為已讀狀態

### 離開聊天室流程

1. 使用者切換聊天對象或登出，觸發 `userLeaveChat()`
2. 後端接收 `userLeftChat` 事件，更新聊天狀態
3. 伺服器發送 `userLeftChat` 事件給對方
4. 前端收到 `userLeftChat`，顯示離開系統訊息，設定 `isReadMessagesConnect = false`

## 斷線處理機制

1. 頁面關閉前，觸發 `beforeunload` 事件處理器，發送離開訊息
2. 斷網時，自動嘗試重連：
   ```javascript
   reconnection: true,
   reconnectionAttempts: 5,
   reconnectionDelay: 1000
   ```
3. 連線成功後，重新同步在線使用者並還原聊天狀態

## 關鍵資料結構

### 伺服器端資料結構
- `userSocketMap`：使用者 ID 到 socket ID 的映射
- `activeChats`：使用者 ID 到目前聊天對象 ID 的映射

### 訊息格式
```javascript
{
  _id: "訊息ID",
  text: "訊息內容",
  senderId: "發送者ID",
  receiverId: "接收者ID",
  isRead: false/true,
  createdAt: "ISO日期時間"
}
```

### 系統訊息格式
```javascript
{
  _id: `system-${actionType}-${Date.now()}`,
  text: `${userName} ${action}了聊天室`,
  isSystemMessage: true,
  createdAt: "ISO日期時間"
}
```

## 優化與擴展建議

1. **訊息分頁**：目前一次載入所有訊息，可考慮無限滾動分頁載入
2. **訊息加密**：考慮端到端加密以提升安全性
3. **讀取指示器**：新增「對方正在輸入」的狀態顯示
4. **群組聊天**：擴展現有架構支援多人聊天室
5. **推送通知**：實作推送通知以提高使用者參與度

## 疑難排解

### 常見問題

1. **重複系統訊息**：
   - 原因：多個使用者聊天室狀態變化事件在短時間內觸發
   - 解決方案：使用系統訊息去重機制 (`isDuplicate` 檢查)

2. **已讀狀態不同步**：
   - 原因：聊天狀態未正確更新或使用者快速切換聊天室
   - 解決方案：確保 `cleanupUserData` 和 `userLeaveChat` 正確調用

3. **離線後訊息丟失**：
   - 原因：僅依賴 Socket 進行訊息傳遞
   - 解決方案：重新連線時從資料庫檢查未讀訊息

## 小結

Socket.js 和 useChatStore.js 之間的整合建立了一個完整的即時聊天系統。Socket.js 負責管理連線和事件廣播，而 useChatStore.js 則管理前端狀態和提供聊天功能的介面。理解這兩個檔案之間的互動對於維護和擴展聊天功能至關重要。

## 元件交互詳細圖

以下圖示展示了各元件間的詳細交互關係：

```
┌─────────────────────────┐     ┌─────────────────────────────┐
│      React 元件層       │     │       狀態管理層             │
│                         │     │                             │
│ ┌───────────────┐       │     │  ┌───────────────────┐      │
│ │  ChatContainer │◄───────────┼──┤    useChatStore   │◄─┐   │
│ └───────┬───────┘       │     │  └───────────────────┘  │   │
│         │               │     │           ▲             │   │
│ ┌───────▼───────┐       │     │           │             │   │
│ │  MessageInput  │◄─────────┐ │  ┌─────────┴───────┐    │   │
│ └───────────────┘       │  │ │  │   useAuthStore   │◄───┘   │
│                         │  │ │  └─────────────────┘        │
│ ┌───────────────┐       │  │ │           ▲                 │
│ │  MessageItem   │◄─────────┘ │           │                 │
│ └───────┬───────┘       │    │           │                 │
│         │               │    │           │                 │
│ ┌───────▼───────┐       │    │           │                 │
│ │    Sidebar     │◄────────────────────┐ │                 │
│ └───────────────┘       │    │        │ │                 │
└─────────────────────────┘    └────────┼─┼─────────────────┘
                                        │ │
                                        │ │ Socket 連線
                                        │ │
┌───────────────────────────────────────┼─▼─────────────────┐
│                                       │                   │
│                    Socket.io 服務器    │                   │
│                                       │                   │
│  ┌────────────────────────────────────┴───┐               │
│  │              socket.js                 │               │
│  │                                        │               │
│  │  ┌───────────────┐    ┌──────────────┐ │               │
│  │  │  狀態管理映射  │    │  事件處理器   │ │               │
│  │  └───────┬───────┘    └──────┬───────┘ │               │
│  │          │                   │         │               │
│  │  ┌───────▼───────────────────▼───────┐ │               │
│  │  │            資料廣播機制            │ │               │
│  │  └───────────────────┬───────────────┘ │               │
│  └───────────────────────────────────────┘                │
│                          │                                │
│                          ▼                                │
│                     MongoDB 資料庫                        │
└───────────────────────────────────────────────────────────┘
```

## 訊息傳遞詳細流程

```
┌───────────┐          ┌─────────────┐          ┌──────────────┐          ┌───────────┐
│  發送端UI  │          │ useChatStore │          │   Socket.js   │          │  接收端UI  │
└─────┬─────┘          └──────┬──────┘          └──────┬───────┘          └─────┬─────┘
      │                       │                        │                        │
      │  發送訊息              │                        │                        │
      │───────────────────────>                        │                        │
      │                       │                        │                        │
      │                       │  sendMessage() API 請求 │                        │
      │                       │───────────────────────>│                        │
      │                       │                        │                        │
      │                       │                        │  存儲訊息到資料庫        │
      │                       │                        │───────────┐            │
      │                       │                        │           │            │
      │                       │                        │<──────────┘            │      │                       │                        │                        │
      │                       │                        │  透過 socket 發送訊息    │
      │                       │                        │───────────────────────>│
      │                       │                        │                        │
      │                       │                        │                        │
      │                       │<─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  newMessage 事件   │
      │                       │                        │                        │
      │   更新 UI              │                        │                        │
      │<──────────────────────│                        │                        │
      │                       │                        │                        │
      │                       │                        │    接收方開啟訊息        │
      │                       │                        │<───────────────────────│
      │                       │                        │                        │
      │                       │                        │  標記訊息為已讀          │
      │                       │                        │───────────┐            │
      │                       │                        │           │            │
      │                       │                        │<──────────┘            │
      │                       │                        │                        │
      │                       │                        │  messagesRead 事件      │
      │                       │<───────────────────────│                        │
      │                       │                        │                        │
```

## 關鍵事件映射表 (Socket.js 與 useChatStore.js 的事件關聯)

以下表格整理了 socket.js 和 useChatStore.js 之間的主要事件對應關係：

| 後端 socket.js (發送) | 前端事件 (監聽) | 說明 |
|---------------------|---------------|------|
| `io.emit('getOnlineUsers')` | `socket.on('getOnlineUsers')` | 廣播線上使用者清單 |
| `io.to(socketId).emit('chatStatus')` | `socket.on('chatStatus')` | 更新聊天狀態 (connect, active, offline) |
| `io.to(socketId).emit('userEnteredChat')` | `socket.on('userEnteredChat')` | 通知使用者進入聊天室 |
| `io.to(socketId).emit('userLeftChat')` | `socket.on('userLeftChat')` | 通知使用者離開聊天室 |
| `io.to(socketId).emit('newMessage')` | `socket.on('newMessage')` | 發送新訊息通知 |
| `io.to(socketId).emit('messagesRead')` | `socket.on('messagesRead')` | 通知訊息已被閱讀 |

| 前端 (發送) | 後端 socket.js (監聽) | 說明 |
|-----------|---------------------|------|
| `socket.emit('userInChat')` | `socket.on('userInChat')` | 通知進入聊天室 |
| `socket.emit('userLeftChat')` | `socket.on('userLeftChat')` | 通知離開聊天室 |
| `socket.emit('userLogout')` | `socket.on('userLogout')` | 明確登出聊天 |

## Socket 事件運作流程圖

以下是主要 Socket 事件的簡易運作流程：

### 登入與取得線上使用者流程
```
  使用者A           前端 useAuthStore          後端 socket.js         其他使用者
    │                     │                        │                     │
    │  登入成功           │                        │                     │
    │─────────────────────>                        │                     │
    │                     │                        │                     │
    │                     │  connectSocket()       │                     │
    │                     │───────────────────────>│                     │
    │                     │                        │                     │
    │                     │                        │  更新 userSocketMap  │
    │                     │                        │──────────┐          │
    │                     │                        │          │          │
    │                     │                        │<─────────┘          │
    │                     │                        │                     │
    │                     │                        │  廣播 getOnlineUsers │
    │                     │                        │────────────────────>│
    │                     │<───────────────────────│                     │
    │                     │                        │                     │
    │  更新線上使用者列表   │                        │                     │
    │<────────────────────│                        │                     │
    │                     │                        │                     │
```

### 聊天室進入與離開流程
```
  使用者A           前端 useChatStore         後端 socket.js          使用者B
    │                     │                        │                     │
    │  選擇聊天對象        │                        │                     │
    │─────────────────────>                        │                     │
    │                     │                        │                     │
    │                     │  setSelectedUser()     │                     │
    │                     │───────────┐            │                     │
    │                     │           │            │                     │
    │                     │<──────────┘            │                     │
    │                     │                        │                     │
    │                     │  userInChat 事件        │                     │
    │                     │───────────────────────>│                     │
    │                     │                        │                     │
    │                     │                        │  更新 activeChats    │
    │                     │                        │──────────┐          │
    │                     │                        │          │          │
    │                     │                        │<─────────┘          │
    │                     │                        │                     │
    │                     │                        │  userEnteredChat 事件│
    │                     │                        │────────────────────>│
    │                     │                        │                     │
    │                     │                        │  chatStatus 事件     │
    │                     │                        │────────────────────>│
    │                     │<───────────────────────│                     │
    │                     │                        │                     │
    │  顯示對方狀態        │                        │                     │
    │<────────────────────│                        │                     │
    │                     │                        │                     │
    │  離開聊天室          │                        │                     │
    │─────────────────────>                        │                     │
    │                     │                        │                     │
    │                     │  userLeaveChat 事件     │                     │
    │                     │───────────────────────>│                     │
    │                     │                        │                     │
    │                     │                        │  userLeftChat 事件   │
    │                     │                        │────────────────────>│
    │                     │                        │                     │
    │                     │                        │  chatStatus 更新     │
    │                     │<───────────────────────┼────────────────────>│
    │                     │                        │                     │
```

### 訊息發送與已讀流程
```
  使用者A           前端 useChatStore         後端 socket.js          使用者B
    │                     │                        │                     │
    │  發送訊息           │                        │                     │
    │─────────────────────>                        │                     │
    │                     │                        │                     │
    │                     │  sendMessage() API 請求 │                     │
    │                     │───────────────────────>│                     │
    │                     │                        │                     │    │                     │                        │  儲存訊息到資料庫    │
    │                     │                        │───────────┐          │
    │                     │                        │           │          │
    │                     │                        │<─────────┘          │
    │                     │                        │                     │
    │                     │                        │  newMessage 事件     │
    │                     │                        │────────────────────>│
    │                     │                        │                     │
    │                     │                        │  雙方都在聊天室      │
    │                     │                        │  (isBothInChat)     │
    │                     │                        │──────────┐          │
    │                     │                        │          │          │
    │                     │                        │<─────────┘          │
    │                     │                        │                     │
    │                     │                        │  messagesRead 事件   │
    │                     │<───────────────────────│                     │
    │                     │                        │                     │
    │  更新已讀狀態        │                        │                     │
    │<────────────────────│                        │                     │
    │                     │                        │                     │
```

### 登出流程
```
  使用者A           前端 useAuthStore          後端 socket.js         其他使用者
    │                     │                        │                     │
    │  登出               │                        │                     │
    │─────────────────────>                        │                     │
    │                     │                        │                     │
    │                     │  userLogout 事件       │                     │
    │                     │───────────────────────>│                     │
    │                     │                        │                     │
    │                     │                        │  cleanupUserData()  │
    │                     │                        │──────────┐          │
    │                     │                        │          │          │
    │                     │                        │<─────────┘          │
    │                     │                        │                     │
    │                     │                        │  廣播 getOnlineUsers │
    │                     │                        │────────────────────>│
    │                     │                        │                     │
    │                     │  斷開 socket 連線       │                     │
    │                     │───────────────────────>│                     │
    │                     │                        │                     │
    │  清空本地聊天資訊    │                        │                     │
    │<────────────────────│                        │                     │
    │                     │                        │                     │
```

## 開發指南

### 新增功能的實現步驟

當需要新增功能時，通常需要在前後端進行相應的更改：

1. **在 socket.js 中**:
   - 定義新的事件處理函數
   - 實現相關的資料處理邏輯
   - 設定適當的廣播機制

2. **在 useChatStore.js 中**:
   - 新增相應的訂閱函數
   - 更新適當的狀態管理
   - 實現前端交互邏輯

例如，要實現「正在輸入中」功能，步驟如下：

```javascript
// 1. 在 socket.js 中新增事件處理
socket.on('userTyping', ({toUserId, isTyping}) => {
  const receiverSocketId = userSocketMap.get(toUserId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit('userTypingStatus', {
      userId: socket.handshake.query.userId,
      isTyping
    });
  }
});

// 2. 在 useChatStore.js 中新增:
// 狀態
typingUsers: new Set(), // 正在輸入的使用者ID集合

// 訂閱事件
subscribeToTyping: () => {
  const socket = useAuthStore.getState().socket;
  if (!socket) return;
  
  socket.off('userTypingStatus'); // 先移除可能的舊訂閱
  socket.on('userTypingStatus', ({userId, isTyping}) => {
    const typingUsers = new Set(get().typingUsers);
    if (isTyping) {
      typingUsers.add(userId);
    } else {
      typingUsers.delete(userId);
    }
    set({ typingUsers });
  });
},

// 發送正在輸入事件
sendTypingStatus: (isTyping) => {
  const socket = useAuthStore.getState().socket;
  const { selectedUser } = get();
  if (!socket || !selectedUser) return;
  
  socket.emit('userTyping', {
    toUserId: selectedUser._id,
    isTyping
  });
}
```

透過上述這種方式，您可以在聊天系統中逐步新增功能，確保前後端一致性。
