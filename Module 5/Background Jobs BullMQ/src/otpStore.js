'use strict';

// ─── In-memory OTP store for email verification ──────────────────────────────
const store = new Map();
const verifiedUsers = new Set();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(email, otp) {
  store.set(email, {
    otp: String(otp),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
  });
}

function verifyOTP(email, code) {
  const entry = store.get(email);
  if (!entry) {
    return { ok: false, reason: 'not_found' };
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(email);
    return { ok: false, reason: 'expired' };
  }

  if (entry.attempts >= 3) {
    return { ok: false, reason: 'too_many_attempts' };
  }

  if (entry.otp !== String(code)) {
    entry.attempts += 1;
    return { ok: false, reason: 'wrong_code' };
  }

  store.delete(email);
  return { ok: true };
}

function markVerified(email) {
  verifiedUsers.add(email);
  console.log(`User ${email} marked as verified.`);
}

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  markVerified,
  _store: store,
  _storeForTest: (email, data) => store.set(email, data),
};
