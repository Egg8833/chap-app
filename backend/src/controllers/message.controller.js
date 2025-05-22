import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import {getReceiverSocketId, io, isBothInChat} from '../lib/socket.js'

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    // 驗證必要資料
    if ((!text || !text.trim()) && !image) {
      return res.status(400).json({ error: "訊息內容不能為空" });
    }

    let imageUrl;
    if (image) {
      try {
        // Upload base64 image to cloudinary with better options
        const uploadResponse = await cloudinary.uploader.upload(image, {
          resource_type: 'image',
          quality: 'auto',
          fetch_format: 'auto'
        });
        imageUrl = uploadResponse.secure_url;
      } catch (uploadError) {
        console.error("上傳圖片時發生錯誤:", uploadError);
        return res.status(400).json({ error: "圖片上傳失敗" });
      }
    }

    // 實時檢查雙方是否都在相同聊天室 - 這是決定訊息已讀狀態的關鍵
    const bothInChat = isBothInChat(senderId.toString(), receiverId);
    console.log('發送訊息時雙方是否都在聊天室:', bothInChat);

    // 建立新訊息，只有當雙方都在聊天室時才標記為已讀
    const newMessage = new Message({
      senderId,
      receiverId,
      text: text ? text.trim() : undefined,
      isRead: bothInChat,
      image: imageUrl,
    });

    await newMessage.save();

    // 即時通知接收者
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      console.log(`向接收者 ${receiverId} 發送即時訊息通知`);
      io.to(receiverSocketId).emit("newMessage", newMessage);
    } else {
      console.log(`接收者 ${receiverId} 不在線，僅儲存訊息`);
    }

    return res.status(201).json(newMessage);
  } catch (error) {
    console.error("發送訊息時發生錯誤:", error);
    return res.status(500).json({ error: "伺服器內部錯誤" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const {id: userToChatId} = req.params;
    const myId = req.user._id;
    
    if (!userToChatId) {
      return res.status(400).json({ error: "缺少聊天對象 ID" });
    }
    
    console.log(`將來自用戶 ${userToChatId} 的訊息標記為已讀`);

    // 只有在用戶真的在聊天室時才標記訊息為已讀
    const bothInChat = isBothInChat(myId.toString(), userToChatId);
    
    if (!bothInChat) {
      console.log(`用戶 ${myId} 和 ${userToChatId} 不在同一聊天室，不標記已讀`);
      return res.status(200).json({ 
        message: '用戶不在聊天室中，未標記訊息為已讀',
        modifiedCount: 0,
        bothInChat: false
      });
    }

    // 標記訊息為已讀
    const updatedMessages = await Message.updateMany(
      {senderId: userToChatId, receiverId: myId, isRead: false},
      {$set: {isRead: true}}
    );
    
    // 找出所有被標記為已讀的訊息 ID
    const updatedMessageIds = bothInChat ? 
      await Message.find({senderId: userToChatId, receiverId: myId, isRead: true})
        .select('_id')
        .lean()
        .exec() : [];
    
    // 通知發送者他的訊息已被讀取
    const senderSocketId = getReceiverSocketId(userToChatId);
    if (senderSocketId && updatedMessages.modifiedCount > 0) {
      console.log(`通知發送者 ${userToChatId} 他的訊息已被讀取`);
      io.to(senderSocketId).emit("messagesRead", { 
        by: myId,
        count: updatedMessages.modifiedCount,
        messageIds: updatedMessageIds.map(msg => msg._id) 
      });
    }

    return res.status(200).json({
      message: '訊息已標記為已讀',
      modifiedCount: updatedMessages.modifiedCount,
      bothInChat: true
    });
  } catch (error) {
    console.error('標記訊息為已讀時發生錯誤:', error);
    return res.status(500).json({ error: "伺服器內部錯誤" });
  }
}