const { findUserByEmail, updateUser, checkRateLimit } = require('../../_db');
const { signToken } = require('../../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const allowed = await checkRateLimit(`otp_${ip}`, 10, 1800);
  if (!allowed)
    return res.status(429).json({ error: 'Too many verification attempts. Try again in 30 minutes.' });

  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const user = await findUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'No account found with this email' });
    if (user.is_verified) return res.status(400).json({ error: 'Account is already verified' });
    if (!user.otp_code) return res.status(400).json({ error: 'No verification code found. Request a new one.' });

    const now = Math.floor(Date.now() / 1000);
    if (now > user.otp_expires_at)
      return res.status(400).json({ error: 'Verification code has expired. Request a new one.' });

    if (user.otp_code !== code.trim())
      return res.status(400).json({ error: 'Invalid verification code' });

    await updateUser(user.id, { is_verified: true, otp_code: null, otp_expires_at: null });

    const token = signToken(user);
    res.json({
      message: 'Email verified successfully!',
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', detail: String(err) });
  }
};
