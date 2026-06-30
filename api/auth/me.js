const { findUserById } = require('../../_db');
const { verifyToken } = require('../../_auth');

module.exports = async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No valid token provided. Please log in.' });

  const user = await findUserById(decoded.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user: { id: user.id, email: user.email, is_verified: user.is_verified, created_at: user.created_at } });
};
