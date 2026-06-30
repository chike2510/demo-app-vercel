// In-memory store for demo purposes.
// NOTE: On Vercel serverless, this resets if the function cold-starts.
// For a real product, swap this for Postgres/Supabase. This is fine for
// testing the auth + AI chat flow live in one sitting.

global.__DEMO_DB__ = global.__DEMO_DB__ || {
  users: [],      // { id, email, password_hash, is_verified, otp_code, otp_expires_at }
  aiUsage: [],     // { userId, model, promptTokens, completionTokens, createdAt }
  nextUserId: 1,
};

const db = global.__DEMO_DB__;

function findUserByEmail(email) {
  return db.users.find(u => u.email === email.toLowerCase()) || null;
}

function findUserById(id) {
  return db.users.find(u => u.id === id) || null;
}

function createUser({ email, password_hash, otp_code, otp_expires_at }) {
  const user = {
    id: db.nextUserId++,
    email: email.toLowerCase(),
    password_hash,
    is_verified: false,
    otp_code,
    otp_expires_at,
    created_at: Math.floor(Date.now() / 1000),
  };
  db.users.push(user);
  return user;
}

function updateUser(id, fields) {
  const user = findUserById(id);
  if (!user) return null;
  Object.assign(user, fields);
  return user;
}

function logAIUsage({ userId, model, promptTokens, completionTokens }) {
  db.aiUsage.push({ userId, model, promptTokens, completionTokens, createdAt: Date.now() });
}

function getUsageStats(userId) {
  const all = db.aiUsage.filter(u => u.userId === userId);
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

function countRecentAIRequests(userId, windowMs) {
  const cutoff = Date.now() - windowMs;
  return db.aiUsage.filter(u => u.userId === userId && u.createdAt > cutoff).length;
}

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  logAIUsage,
  getUsageStats,
  countRecentAIRequests,
};
