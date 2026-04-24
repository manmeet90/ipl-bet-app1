const express = require('express');
const bcrypt = require('bcryptjs');
const firebaseDB = require('../db/firebase-web-db');
const { sendOTPEmail } = require('../services/email');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

    const user = await firebaseDB.getUserByPhone(phone);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const storedPassword = user.password || user.password_hash;
    if (!storedPassword || !bcrypt.compareSync(password, storedPassword)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.isAdmin = user.is_admin === true;

    res.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      is_admin: user.is_admin === true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = await firebaseDB.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ 
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      is_admin: user.is_admin === true 
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await firebaseDB.getUserById(req.session.userId);
    if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    await firebaseDB.updateUser(user.id, { password_hash: hash });
    res.json({ ok: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { phone, email } = req.body;
    if (!phone || !email) return res.status(400).json({ error: 'Phone and email required' });

    const user = await firebaseDB.getUserByPhone(phone);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const recentResets = await firebaseDB.getPasswordResetsByUser(user.id, oneHourAgo);

    if (recentResets.length >= 3) {
      return res.status(429).json({ error: 'Too many OTP requests. Try again later.' });
    }

    await firebaseDB.markPasswordResetsAsUsed(user.id);

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await firebaseDB.createPasswordReset({
      user_id: user.id,
      email,
      otp_code: otp,
      otp_expires_at: expiresAt,
      is_used: false
    });

    await sendOTPEmail(email, otp);

    res.json({ ok: true, message: 'OTP sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { phone, otp, new_password } = req.body;
    if (!phone || !otp || !new_password) {
      return res.status(400).json({ error: 'Phone, OTP and new password required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await firebaseDB.getUserByPhone(phone);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const reset = await firebaseDB.getValidPasswordReset(user.id, otp);
    if (!reset) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const hash = bcrypt.hashSync(new_password, 10);
    await firebaseDB.updateUser(user.id, { password_hash: hash });
    await firebaseDB.updatePasswordReset(reset.id, { is_used: true });

    res.json({ ok: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
