// Centralized Redis client. Checks every possible env var name Vercel's
// KV/Upstash integration might use, since the naming varies by how it
// was connected.
const { Redis } = require('@upstash/redis');

const url =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.REDIS_URL;

const token =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.REDIS_TOKEN;

if (!url || !token) {
  console.error('Redis env vars not found. Available env keys:', Object.keys(process.env).filter(k => k.includes('REDIS') || k.includes('KV')));
}

const kv = new Redis({ url, token });

module.exports = { kv };
