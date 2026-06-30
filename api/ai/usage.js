const { verifyToken } = require('../../_auth');
const { getUsageStats } = require('../../_db');

module.exports = async (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No valid token provided. Please log in.' });

  res.json(getUsageStats(decoded.userId));
};
