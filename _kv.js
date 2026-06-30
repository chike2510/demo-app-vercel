// Centralized Redis client using the current supported package.
// Works with Upstash Redis connected via Vercel Marketplace.
const { Redis } = require('@upstash/redis');

const kv = Redis.fromEnv();

module.exports = { kv };
