const { findUserByEmail, updateUser, checkRateLimit } = require('../../_db');
const { generateOTP } = require('../../_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const allowed = await checkRateLimit(`otp_${ip}`, 10, 1800);
  if (!allowed)
    return res.status(429).json({ error: 'Too many attempts. Try again in 30 minutes.' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const user = await findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'No account found' });
  if (user.is_verified) return res.status(400).json({ error: 'Already verified' });

  const otp = generateOTP();
  const otp_expires_at = Math.floor(Date.now() / 1000) + 10 * 60;
  await updateUser(user.id, { otp_code: otp, otp_expires_at });

  console.log(`New OTP for ${email}: ${otp}`);

  res.json({ message: 'New verification code generated', demoOtp: otp });
};
