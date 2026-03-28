const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return transporter;
}

async function sendOTPEmail(to, otp) {
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL MOCK] OTP for ${to}: ${otp}`);
    return { mock: true };
  }

  const transport = getTransporter();
  const info = await transport.sendMail({
    from: `"IPL Bet 2026" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your IPL Bet Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #1a1a2e; color: #fff; border-radius: 12px;">
        <h2 style="color: #f5a623; text-align: center;">IPL Bet 2026</h2>
        <p>Your password reset OTP is:</p>
        <div style="text-align: center; padding: 16px; background: #16213e; border-radius: 8px; margin: 16px 0;">
          <span style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #f5a623;">${otp}</span>
        </div>
        <p style="color: #aaa; font-size: 14px;">This OTP expires in 15 minutes. If you didn't request this, please ignore.</p>
      </div>
    `
  });

  return info;
}

module.exports = { sendOTPEmail };
