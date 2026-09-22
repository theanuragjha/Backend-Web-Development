const sessionStore = require('../session/sessionStore');
const userRepository = require('../db/userRepository');

function authRequired(res) {
  return res.status(401).json({
    error: {
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    },
  });
}

/**
 * Authentication Middleware
 *
 * Resolves the opaque session identifier from the signed cookie `sid`.
 * Verifies signature, validates live server session, and ensures the user exists.
 * Returns a generic 401 for any failure (missing, tampered, expired, or orphaned).
 */
module.exports = async function requireSession(req, res, next) {
  try {
    const sid = req.signedCookies ? req.signedCookies.sid : undefined;

    // `sid` is undefined if absent, or `false` if tampered/invalid signature
    if (!sid || typeof sid !== 'string') {
      return authRequired(res);
    }

    const session = sessionStore.get(sid);
    if (!session) {
      return authRequired(res);
    }

    const user = await userRepository.findUserById(session.userId);
    if (!user) {
      // Clean up orphaned session whose user was removed
      sessionStore.destroy(sid);
      return authRequired(res);
    }

    req.user = user;
    req.sessionId = sid;
    next();
  } catch (error) {
    next(error);
  }
};
