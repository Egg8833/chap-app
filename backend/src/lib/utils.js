import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });  res.cookie("jwt", token, {
    maxAge: 1 * 24 * 60 * 60 * 1000, // 一天，與 JWT_EXPIRES_IN 保持一致
    httpOnly: true, // prevent XSS attacks cross-site scripting attacks
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // 在線上環境使用 none 允許跨網站請求
    secure: process.env.NODE_ENV === "production", // 在線上環境需要 HTTPS
  });

  return token;
};
