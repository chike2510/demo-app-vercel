const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-change-in-production';

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simple in-memory IP rate limiter (per function instance — fine for demo)
const rateBuckets = {};
function checkRateLimit(key, max, windowMs) {
  const now = Date.now();
  if (!rateBuckets[key]) rateBuckets[key] = [];
  rateBuckets[key] = rateBuckets[key].filter(t => now - t < windowMs);
  if (rateBuckets[key].length >= max) return false;
  rateBuckets[key].push(now);
  return true;
}

module.exports = { signToken, verifyToken, generateOTP, checkRateLimit };
