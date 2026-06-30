const { kv } = require('@vercel/kv');

// ─── Users ───────────────────────────────────────────────────────────────────

async function findUserByEmail(email) {
  const user = await kv.get(`user:${email.toLowerCase()}`);
  return user || null;
}

async function findUserById(id) {
  const email = await kv.get(`userid:${id}`);
  if (!email) return null;
  return findUserByEmail(email);
}

async function createUser({ email, password_hash, otp_code, otp_expires_at }) {
  const id = await kv.incr('user:nextId');
  const user = {
    id,
    email: email.toLowerCase(),
    password_hash,
    is_verified: false,
    otp_code,
    otp_expires_at,
    created_at: Math.floor(Date.now() / 1000),
  };
  await kv.set(`user:${user.email}`, user);
  await kv.set(`userid:${id}`, user.email);
  return user;
}

async function updateUser(id, fields) {
  const user = await findUserById(id);
  if (!user) return null;
  const updated = { ...user, ...fields };
  await kv.set(`user:${user.email}`, updated);
  return updated;
}

// ─── AI usage tracking ───────────────────────────────────────────────────────

async function logAIUsage({ userId, model, promptTokens, completionTokens }) {
  const entry = { model, promptTokens, completionTokens, createdAt: Date.now() };
  await kv.lpush(`aiusage:${userId}`, JSON.stringify(entry));
  await kv.ltrim(`aiusage:${userId}`, 0, 199); // keep last 200 entries
}

async function getAllUsage(userId) {
  const raw = await kv.lrange(`aiusage:${userId}`, 0, -1);
  return raw.map(r => (typeof r === 'string' ? JSON.parse(r) : r));
}

async function getUsageStats(userId) {
  const all = await getAllUsage(userId);
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const thisHour = all.filter(u => u.createdAt > oneHourAgo);
  return {
    allTime: {
      total_requests: all.length,
      total_prompt_tokens: all.reduce((s, u) => s + (u.promptTokens || 0), 0),
      total_completion_tokens: all.reduce((s, u) => s + (u.completionTokens || 0), 0),
    },
    thisHour: { requests: thisHour.length, limit: 10 },
    remaining: Math.max(0, 10 - thisHour.length),
  };
}

async function countRecentAIRequests(userId, windowMs) {
  const all = await getAllUsage(userId);
  const cutoff = Date.now() - windowMs;
  return all.filter(u => u.createdAt > cutoff).length;
}

// ─── IP-based rate limiting (register, login, OTP) ──────────────────────────

async function checkRateLimit(key, max, windowSeconds) {
  const count = await kv.incr(`rl:${key}`);
  if (count === 1) {
    await kv.expire(`rl:${key}`, windowSeconds);
  }
  return count <= max;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  logAIUsage,
  getUsageStats,
  countRecentAIRequests,
  checkRateLimit,
};
