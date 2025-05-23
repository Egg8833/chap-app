import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

dotenv.config();

// 設定 Google 策略
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === "production" 
        ? `${process.env.BACKEND_URL}/api/auth/google/callback` 
        : "http://localhost:3000/api/auth/google/callback",
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google 資料收到:', profile);
      // 檢查使用者是否已經存在
      let user = await User.findOne({ email: profile.emails[0].value });
      
      // 如果使用者不存在，建立新使用者
      if (!user) {
        // 生成隨機密碼 (使用者不需要知道，因為會透過 Google 登入)
        const password = crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        user = await User.create({
          fullName: profile.displayName,
          email: profile.emails[0].value,
          profilePic: profile.photos[0]?.value || '',
          password: hashedPassword,
          googleId: profile.id
        });
      } 
      // 如果使用者存在但沒有 Google ID，更新使用者資料
      else if (!user.googleId) {
        user.googleId = profile.id;
        if (!user.profilePic && profile.photos[0]?.value) {
          user.profilePic = profile.photos[0].value;
        }
        await user.save();
      }
      
      return done(null, user);
    } catch (error) {
      console.error('Google 登入錯誤:', error);
      return done(error, null);
    }
  }
));

// 序列化和反序列化使用者
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
