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
router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), (req, res) => {    // 生成 JWT 權杖並儲存到 Cookie
    generateJWT(req.user, res);
    // 成功後重定向到前端首頁
    res.redirect(process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : "http://localhost:5173");
});

export default router;
