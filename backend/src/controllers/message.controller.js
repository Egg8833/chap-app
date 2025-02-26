import { Result } from 'postcss'
import Message from '../models/message.model.js'
import User from '../models/user.model.js'

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedUserId = req.user._id
    const filteredUsers = await User.find({_id: {$ne: loggedUserId}}).select(
      '-password'
    )

    res.status(200).json({
      message: "success",
      result: filteredUsers.length,
      users: filteredUsers,

    })
  } catch (error) {
    console.error('Error in getUsersForSidebar:', error)
    res.status(500).json({message: 'Server Error'})
    next(error)
  }
}

export const getMessages = async (req, res) => {
  try {
    const {id: UserToChatId} = req.params
    const myId = req.user._id

    const messages = await Message.find({
      $or: [
        {senderId: myId, receiverId: UserToChatId},
        {senderId: UserToChatId, receiverId: myId},
      ],
    })

    res.status(200).json(messages)
  } catch (error) {
    console.error('Error in getMessages:', error)
    res.status(500).json({message: 'Server Error'})
    next(error)
  }
}

export const sendMessage = async (req, res) => {

  try{

    const {text,image} = req.body
    const {id: receiverId} = req.params
    const senderId = req.user._id

    let imageUrl ;
    if(image){
      const uploadedResponse = await cloudinary.uploader.upload(image, {
        upload_preset: 'chat_app',
      })
      imageUrl = uploadedResponse.secure_url
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    })

    const message = await newMessage.save()

    res.status(201).json(message)

  } catch (error) {
    console.error('Error in sendMessage:', error)
    res.status(500).json({message: 'Server Error'})
    next(error)
  }


}

