const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { sendOTPEmail } = require('../services/email');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  req.session.isAdmin = user.is_admin === 1;

  res.json({
    id: user.id,
    name: user.name,
    phone: user.phone,
    is_admin: user.is_admin === 1
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = db.prepare('SELECT id, name, phone, email, is_admin FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json({ ...user, is_admin: user.is_admin === 1 });
});

router.put('/change-password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  res.json({ ok: true, message: 'Password changed successfully' });
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { phone, email } = req.body;
    if (!phone || !email) return res.status(400).json({ error: 'Phone and email required' });

    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const recentCount = db.prepare(
      "SELECT COUNT(*) as count FROM password_resets WHERE user_id = ? AND created_at > ?"
    ).get(user.id, oneHourAgo);

    if (recentCount.count >= 3) {
      return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
    }

    db.prepare("UPDATE password_resets SET is_used = 1 WHERE user_id = ? AND is_used = 0").run(user.id);

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.prepare(
      'INSERT INTO password_resets (user_id, email, otp_code, otp_expires_at) VALUES (?, ?, ?, ?)'
    ).run(user.id, email, otp, expiresAt);

    await sendOTPEmail(email, otp);

    res.json({ ok: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/reset-password', (req, res) => {
  const { phone, otp, new_password } = req.body;
  if (!phone || !otp || !new_password) {
    return res.status(400).json({ error: 'Phone, OTP and new password required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const reset = db.prepare(
    "SELECT * FROM password_resets WHERE user_id = ? AND otp_code = ? AND is_used = 0 AND otp_expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
  ).get(user.id, otp);

  if (!reset) return res.status(400).json({ error: 'Invalid or expired OTP' });

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  db.prepare('UPDATE password_resets SET is_used = 1 WHERE id = ?').run(reset.id);

  res.json({ ok: true, message: 'Password reset successfully' });
});

module.exports = router;
