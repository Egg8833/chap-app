import User from '../models/user.model.js'
import bcrypt from 'bcryptjs'
import {generateToken} from '../lib/utils.js'

export const signup = async (req, res, next) => {
  try {
    const {email, fullName, password} = req.body

    // 檢查必要欄位
    if (!email || !fullName || !password) {
      return res.status(400).json({message: 'All fields are required'})
    }

    // 檢查密碼長度
    if (password.length < 6) {
      return res
        .status(400)
        .json({message: 'Password must be at least 6 characters long'})
    }

    // 檢查用戶是否已存在
    const existingUser = await User.findOne({email})
    if (existingUser) {
      return res.status(400).json({message: 'User already exists'})
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10)

    // 創建用戶
    const newUser = await User.create({
      email,
      fullName,
      password: hashedPassword,
    })

    // 生成 JWT Token 並設置到 Cookie
    generateToken(newUser._id, res)

    // 返回用戶資料
    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    })
  } catch (error) {
    console.error('Error in signup:', error)
    next(error) // 傳遞錯誤給 Express 錯誤處理中介軟體
  }
}

export const login = async(req, res) => {
  const {email, password} = req.body

  try{
    const user = await User.findOne({email})
    if(!user){
      return res.status(400).json({message: 'Invalid email or password'})
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password)

    if(!isPasswordCorrect){
      return res.status(400).json({message: 'Invalid email or password'})
    }

    generateToken(user._id, res)
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    })
  } catch (error) {
    console.error('Error in login:', error)
    res.status(500).json({message: 'Server Error'})
    next(error)

  }
  }

export const logout =  (req, res) => {
    try{
      res.clearCookie('jwt')
      res.status(200).json({message: 'Logout successfully'})
    }
    catch(error){
      console.error('Error in logout:', error)
      res.status(500).json({message: 'Server Error'})
      next(error)
    }
}


export const updateProfile = async (req, res) => {
  try {

  }
  catch (error) {}
}

export const checkAuth = async (req, res) => {
  try {
    res.status(200).json(req.user)
  }
  catch (error) {
    console.error('Error in checkAuth:', error)
    res.status(500).json({message: 'Server Error'})
    next(error)
  }
}