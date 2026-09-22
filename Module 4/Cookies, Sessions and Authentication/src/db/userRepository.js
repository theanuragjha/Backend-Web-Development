const prisma = require('./prisma');

/**
 * Finds a user by email address (case-insensitive search via normalization).
 * Returns the full user record including passwordHash for credential verification.
 */
async function findUserByEmail(email) {
  if (!email || typeof email !== 'string') return null;
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

/**
 * Finds a user by ID and returns safe identity fields only (never passwordHash).
 */
async function findUserById(id) {
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

module.exports = {
  findUserByEmail,
  findUserById,
};
