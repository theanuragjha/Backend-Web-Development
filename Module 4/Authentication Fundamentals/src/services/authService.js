'use strict';

const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

// A precomputed, valid 12-round bcrypt hash used to equalize execution time
// on the missing-user path, defending against timing-based email enumeration.
const DUMMY_HASH = '$2a$12$e80MvQkL3UqmzJ04XoK0/O5JqN8R05WJkXvFzYt2mR6xY8L0q4h7y';

/**
 * Creates the standardized generic 401 credential error.
 */
function createInvalidCredentialsError() {
  const err = new Error('Invalid email or password');
  err.statusCode = 401;
  err.code = 'INVALID_CREDENTIALS';
  return err;
}

/**
 * Explicit safe-field allowlist mapping.
 * Prevents any credential or internal fields from leaking into responses.
 * @param {object} user
 * @returns {{ id: number, name: string, email: string }}
 */
function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

const authService = {
  toSafeUser,

  /**
   * Registers a new user.
   * Validates uniqueness, hashes password, persists, and returns safe user.
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.email
   * @param {string} params.password
   * @returns {Promise<{ id: number, name: string, email: string }>}
   */
  async register({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // Check if user already exists
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      const err = new Error('An account with this email already exists');
      err.statusCode = 409;
      err.code = 'EMAIL_EXISTS';
      throw err;
    }

    const costFactor = Number(process.env.BCRYPT_COST) || 12;
    const passwordHash = await bcrypt.hash(password, costFactor);

    try {
      const user = await userRepository.create({
        name: trimmedName,
        email: normalizedEmail,
        passwordHash,
      });

      return toSafeUser(user);
    } catch (err) {
      // Prisma unique constraint violation (P2002) fallback for concurrent registrations
      if (err.code === 'P2002') {
        const conflictErr = new Error('An account with this email already exists');
        conflictErr.statusCode = 409;
        conflictErr.code = 'EMAIL_EXISTS';
        throw conflictErr;
      }
      throw err;
    }
  },

  /**
   * Authenticates a user with email and password.
   * Returns safe user on success, throws generic 401 on credential mismatch.
   * @param {object} params
   * @param {string} params.email
   * @param {string} params.password
   * @returns {Promise<{ id: number, name: string, email: string }>}
   */
  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Perform comparable bcrypt work to eliminate response-timing leaks
      await bcrypt.compare(password, DUMMY_HASH);
      throw createInvalidCredentialsError();
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw createInvalidCredentialsError();
    }

    return toSafeUser(user);
  },
};

module.exports = authService;
