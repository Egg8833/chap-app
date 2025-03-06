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

    let imageUrl;
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    console.log('isBothInChat', isBothInChat)


    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      isRead: isBothInChat,
      image: imageUrl,
    })

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const {id: userToChatId} = req.params
    const myId = req.user._id
    console.log('userToChatId-', userToChatId)
    console.log('myId-', myId)


    const updatedMessages = await Message.updateMany(
      {senderId: userToChatId, receiverId: myId, isRead: false},
      {$set: {isRead: true}}
    )

    res.status(200).json({message: 'Messages marked as read'})
  } catch (error) {
    console.error('Error in markMessagesAsRead:', error)
    res.status(500).json({error: 'Internal server error'})
  }
}