const bcrypt = require('bcryptjs');
const { findUserByEmail, createUser } = require('../../_db');
const { generateOTP, checkRateLimit } = require('../../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  if (!checkRateLimit(`register_${ip}`, 3, 60 * 60 * 1000))
    return res.status(429).json({ error: 'Too many accounts created from this IP. Try again in 1 hour.' });

  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    if (findUserByEmail(email))
      return res.status(409).json({ error: 'An account with this email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otp_expires_at = Math.floor(Date.now() / 1000) + 10 * 60;

    createUser({ email, password_hash, otp_code: otp, otp_expires_at });

    console.log(`📧 OTP for ${email}: ${otp}`);

    res.status(201).json({
      message: 'Account created. Verification code generated (shown below for this demo).',
      email: email.toLowerCase(),
      demoOtp: otp, // shown directly in demo since there's no real email service wired up
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
