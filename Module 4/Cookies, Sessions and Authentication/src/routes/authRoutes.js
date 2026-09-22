const express = require('express');
const bcrypt = require('bcryptjs');
const sessionStore = require('../session/sessionStore');
const userRepository = require('../db/userRepository');
const requireSession = require('../middleware/requireSession');
const {
  COOKIE_NAME,
  getSessionCookieOptions,
  getClearCookieOptions,
} = require('../session/cookieConfig');

const router = express.Router();

function genericAuthFailure(res) {
  return res.status(401).json({
    error: {
      code: 'AUTH_REQUIRED',
      message: 'Invalid email or password',
    },
  });
}

/**
 * POST /auth/login
 * Verifies credentials, generates an opaque session identifier, stores it in server-side store,
 * and sets a signed `sid` cookie.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return genericAuthFailure(res);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findUserByEmail(normalizedEmail);

    if (!user) {
      return genericAuthFailure(res);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return genericAuthFailure(res);
    }

    // Create session in server-side store
    const session = sessionStore.create(user.id);

    // Set signed cookie containing only the opaque session ID
    res.cookie(COOKIE_NAME, session.id, getSessionCookieOptions());

    // Return safe user representation (no passwords or hashes)
    return res.status(200).json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * Protected identity endpoint requiring a valid, live signed session cookie.
 */
router.get('/me', requireSession, (req, res) => {
  return res.status(200).json({
    data: req.user,
  });
});

/**
 * POST /auth/logout
 * Destroys the server-side session and clears the browser cookie using matching options.
 * Idempotent: repeated calls safely return 204 No Content.
 */
router.post('/logout', (req, res, next) => {
  try {
    const sid = req.signedCookies ? req.signedCookies.sid : undefined;

    if (sid && typeof sid === 'string') {
      sessionStore.destroy(sid);
    }

    // Clear the cookie with matching scope and signing flags
    res.clearCookie(COOKIE_NAME, getClearCookieOptions());

    return res.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
