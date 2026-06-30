const { verifyToken } = require('../../_auth');
const { logAIUsage, getUsageStats, countRecentAIRequests } = require('../../_db');

const FREELLM_URL = process.env.FREELLM_URL || 'https://openrouter.ai/api';
const FREELLM_API_KEY = process.env.FREELLM_API_KEY;
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = verifyToken(req);
  if (!decoded) return res.status(401).json({ error: 'No valid token provided. Please log in.' });

  // Per-user rate limit: 10/hour
  const recent = countRecentAIRequests(decoded.userId, 60 * 60 * 1000);
  if (recent >= 10)
    return res.status(429).json({ error: 'AI request limit reached (10/hour). Upgrade to Pro for unlimited requests.' });

  try {
    const { messages, model } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'Messages array is required' });

    if (!FREELLM_API_KEY)
      return res.status(500).json({ error: 'Server misconfigured: FREELLM_API_KEY missing in Vercel env vars' });

    const response = await fetch(`${FREELLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FREELLM_API_KEY}`,
        'HTTP-Referer': 'https://vercel.app', // OpenRouter likes this set
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Upstream AI error:', data);
      return res.status(response.status).json({ error: 'AI service error', detail: data });
    }

    const usage = data.usage || {};
    logAIUsage({
      userId: decoded.userId,
      model: data.model || model || DEFAULT_MODEL,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
    });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reach AI service', detail: String(err) });
  }
};
