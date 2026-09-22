/**
 * requireRole factory
 *
 * Creates a middleware gate ensuring the authenticated user possesses one of the allowed roles.
 * Must run after requireAuth.
 *
 * @param {...string} allowedRoles - List of permitted roles
 * @returns {import('express').RequestHandler}
 */
module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: insufficient permissions',
        },
      });
    }

    next();
  };
};
