'use strict';

const prisma = require('../db/prisma');

/**
 * Maps known Prisma errors to safe application domain errors.
 * Never leaks raw database details, SQL snippets, or internal table schemas.
 */
function handlePrismaError(error) {
  if (error.code === 'P2002') {
    const domainError = new Error('Unique constraint violation: record already exists');
    domainError.statusCode = 409;
    throw domainError;
  }
  if (error.code === 'P2003') {
    const domainError = new Error('Invalid relation: referenced record does not exist');
    domainError.statusCode = 400;
    throw domainError;
  }
  if (error.code === 'P2025') {
    return null;
  }
  if (error.statusCode) {
    throw error;
  }
  const genericError = new Error('Database operation failed');
  genericError.statusCode = 500;
  throw genericError;
}

/**
 * Retrieve all posts ordered by ID ascending.
 * @returns {Promise<Array>}
 */
async function findAll() {
  try {
    return await prisma.post.findMany({
      orderBy: { id: 'asc' },
    });
  } catch (error) {
    handlePrismaError(error);
  }
}

/**
 * Retrieve a single post by ID.
 * @param {number|string} id
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;

  try {
    return await prisma.post.findUnique({
      where: { id: numericId },
    });
  } catch (error) {
    handlePrismaError(error);
  }
}

/**
 * Create a new post in the database.
 * @param {object} fields
 * @returns {Promise<object>}
 */
async function create(fields) {
  try {
    return await prisma.post.create({
      data: {
        title: fields.title,
        body: fields.body || '',
        authorId: Number(fields.authorId),
      },
    });
  } catch (error) {
    handlePrismaError(error);
  }
}

/**
 * Update an existing post by ID.
 * @param {number|string} id
 * @param {object} patch
 * @returns {Promise<object|null>}
 */
async function update(id, patch) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;

  const existing = await findById(numericId);
  if (!existing) return null;

  const data = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.body !== undefined) data.body = patch.body;
  if (patch.authorId !== undefined) data.authorId = Number(patch.authorId);

  try {
    return await prisma.post.update({
      where: { id: numericId },
      data,
    });
  } catch (error) {
    handlePrismaError(error);
  }
}

/**
 * Remove an existing post by ID.
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
async function remove(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return false;

  const existing = await findById(numericId);
  if (!existing) return false;

  try {
    await prisma.post.delete({
      where: { id: numericId },
    });
    return true;
  } catch (error) {
    handlePrismaError(error);
  }
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
};
