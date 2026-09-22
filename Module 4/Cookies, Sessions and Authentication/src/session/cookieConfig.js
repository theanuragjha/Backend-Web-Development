const COOKIE_NAME = 'sid';

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    signed: true,
    path: '/',
  };
}

function getSessionCookieOptions() {
  const ttlMs = Number(process.env.SESSION_TTL_MS || 3600000);
  return {
    ...getBaseCookieOptions(),
    maxAge: ttlMs,
  };
}

function getClearCookieOptions() {
  return getBaseCookieOptions();
}

module.exports = {
  COOKIE_NAME,
  getBaseCookieOptions,
  getSessionCookieOptions,
  getClearCookieOptions,
};
