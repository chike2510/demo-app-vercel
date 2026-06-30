const bcrypt = require('bcryptjs');
const { findUserByEmail } = require('../../_db');
const { signToken, checkRateLimit } = require('../../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!checkRateLimit(`login_${ip}`, 5, 15 * 60 * 1000))
    return res.status(429).json({ error: 'Too many login attempts. Try again in 15 minutes.' });

  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.is_verified)
      return res.status(403).json({
        error: 'Please verify your email before logging in',
        needsVerification: true,
        email: user.email,
      });

    const token = signToken(user);
    res.json({ message: 'Login successful', token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
