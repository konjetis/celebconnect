'use strict';

/**
 * Email sender for CelebConnect using Resend.
 *
 * Required env var:
 *   RESEND_API_KEY   — from resend.com dashboard
 *   RESEND_FROM      — verified sender address, e.g. "CelebConnect <noreply@yourdomain.com>"
 *                      Defaults to "CelebConnect <onboarding@resend.dev>" for testing
 *                      (works for sending to your own email only until domain is verified)
 */

function getResend() {
  try {
    const { Resend } = require('resend');
    return new Resend(process.env.RESEND_API_KEY);
  } catch {
    throw new Error('resend not installed. Run: npm install resend');
  }
}

const FROM = process.env.RESEND_FROM || 'CelebConnect <onboarding@resend.dev>';

/**
 * Sends a password reset email with a deep-link button.
 * The link opens the CelebConnect app directly on the reset screen.
 */
async function sendResetEmail(toEmail, resetToken) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email send (token logged below)');
    console.warn(`[Email] Reset token for ${toEmail}: ${resetToken}`);
    return;
  }

  const resetLink = `celebconnect://reset-password?token=${resetToken}`;
  const webFallback = `${process.env.EXPO_PUBLIC_BACKEND_URL || 'https://celebconnect-production.up.railway.app'}/reset?token=${resetToken}`;

  const resend = getResend();
  const { error } = await resend.emails.send({
    from:    FROM,
    to:      toEmail,
    subject: 'Reset your CelebConnect password',
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="font-size: 48px;">🔐</div>
              <h1 style="margin: 16px 0 8px; font-size: 24px; color: #1a1a1a;">Reset your password</h1>
              <p style="color: #666; margin: 0; line-height: 1.5;">
                Someone requested a password reset for your CelebConnect account.
                If this wasn't you, you can safely ignore this email.
              </p>
            </div>

            <a href="${resetLink}"
               style="display: block; text-align: center; background: #6C63FF; color: #fff;
                      text-decoration: none; border-radius: 12px; padding: 16px 24px;
                      font-size: 16px; font-weight: 700; margin-bottom: 16px;">
              Reset Password in App
            </a>

            <p style="text-align: center; color: #999; font-size: 13px; margin: 0 0 8px;">
              Button not working? <a href="${webFallback}" style="color: #6C63FF;">Open in browser</a>
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #bbb; font-size: 12px; text-align: center; margin: 0;">
              This link expires in 1 hour. CelebConnect will never ask for your password by email.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
  console.log(`[Email] Reset email sent to ${toEmail}`);
}

module.exports = { sendResetEmail };
