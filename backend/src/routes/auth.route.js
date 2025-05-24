import express from "express";
import { checkAuth, login, logout, signup, updateProfile, } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import passport from "passport";
import { generateJWT } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.put("/update-profile", protectRoute, updateProfile);

router.get("/check", protectRoute, checkAuth);
// Google OAuth 路由
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Google 回調路由
router.get("/google/callback", passport.authenticate("google", { 
    failureRedirect: process.env.NODE_ENV === "production" 
      ? `${process.env.FRONTEND_URL}/login` 
      : `${process.env.DEV_FRONTEND_URL || "http://localhost:5173"}/login` 
}), (req, res) => {    
    // 生成 JWT 權杖並儲存到 Cookie
    generateJWT(req.user, res);
    
    // 記錄重定向資訊
    const redirectUrl = process.env.NODE_ENV === "production" 
        ? process.env.FRONTEND_URL 
        : process.env.DEV_FRONTEND_URL || "http://localhost:5173";
    
    console.log(`Google OAuth 成功，重定向到: ${redirectUrl}`);
    
    // 成功後重定向到前端首頁
    res.redirect(redirectUrl);
});

export default router;
