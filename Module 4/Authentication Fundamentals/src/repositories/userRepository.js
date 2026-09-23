'use strict';

const prisma = require('../db/prisma');

/**
 * Repository isolating Prisma operations for the User model.
 */
const userRepository = {
  /**
   * Find a user by unique email address.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  /**
   * Find a user by primary key ID.
   * @param {number} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  /**
   * Create a new user record.
   * @param {object} params
   * @param {string} params.name
   * @param {string} params.email
   * @param {string} params.passwordHash
   * @returns {Promise<object>}
   */
  async create({ name, email, passwordHash }) {
    return prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
  },
};

module.exports = userRepository;
