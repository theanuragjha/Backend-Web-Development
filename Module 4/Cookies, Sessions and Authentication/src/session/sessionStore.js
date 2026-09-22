const crypto = require('crypto');

/**
 * In-Memory Session Store
 *
 * ARCHITECTURAL NOTE:
 * This in-memory Map store is suitable for local development, testing, and single-instance
 * learning environments only. Server restarts erase all active sessions, and multi-process
 * deployments (e.g. behind a load balancer) cannot share in-memory state.
 * Production environments require a shared, expiring data store such as Redis or Memcached
 * with atomic expiration (TTL) and cluster support.
 */

const store = new Map();

/**
 * Creates a cryptographically random, unpredictable session ID.
 * Stores { userId, expiresAt } against the session ID.
 * Never stores passwords, tokens, or credential data.
 */
function create(userId, customTtlMs) {
  const sessionId = crypto.randomUUID();
  const ttlMs = customTtlMs !== undefined ? Number(customTtlMs) : Number(process.env.SESSION_TTL_MS || 3600000);
  const expiresAt = Date.now() + ttlMs;

  const session = {
    id: sessionId,
    userId,
    expiresAt,
  };

  store.set(sessionId, session);
  return session;
}

/**
 * Retrieves a session by its opaque session ID.
 * Lazily evicts expired sessions on read.
 */
function get(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return null;

  const session = store.get(sessionId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    store.delete(sessionId);
    return null;
  }

  return session;
}

/**
 * Destroys a session record from the store.
 * Idempotent: returns boolean indicating whether the record existed.
 */
function destroy(sessionId) {
  if (!sessionId) return false;
  return store.delete(sessionId);
}

/**
 * Clears all sessions (useful for testing).
 */
function clear() {
  store.clear();
}

module.exports = {
  create,
  get,
  destroy,
  clear,
};
