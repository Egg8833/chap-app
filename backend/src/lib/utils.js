import jwt from 'jsonwebtoken'

export const generateToken = (user, res) => {
  const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })

  res.cookie('jwt', token, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV !== 'development',
  })

  return token
}
