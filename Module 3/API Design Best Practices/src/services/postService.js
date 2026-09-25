'use strict';

const store = require('../data/postStore');

const DEFAULT_LIMIT = 2;
const MAX_LIMIT = 50;

/**
 * List posts with pagination and metadata.
 * @param {object} query - query params (page, limit)
 * @returns {{ items: Array, meta: { page: number, limit: number, total: number, pages: number } }}
 */
function listPosts(query = {}) {
  const allPosts = store.getAllPosts();
  const total = allPosts.length;

  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) {
    limit = DEFAULT_LIMIT;
  }
  // Server-side limit capping
  limit = Math.min(limit, MAX_LIMIT);

  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const items = allPosts.slice(startIndex, startIndex + limit);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      pages,
    },
  };
}

/**
 * Get a single post by ID.
 * @param {number|string} id
 * @returns {object|null}
 */
function getPost(id) {
  return store.getPostById(id) || null;
}

/**
 * Create a new post.
 * @param {object} body
 * @returns {object}
 */
function createPost(body = {}) {
  return store.createPost({
    title: body.title,
    author: body.author,
  });
}

/**
 * Increment like count on a post.
 * @param {number|string} id
 * @returns {object|null}
 */
function likePost(id) {
  return store.incrementLikes(id);
}

/**
 * Internal error simulation for testing safe 500 error handling.
 */
function explode() {
  const err = new Error('SQLITE_CONSTRAINT in posts table');
  err.statusCode = 500;
  err.debug = 'FakeStack: at postService.js:19:11';
  throw err;
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  likePost,
  explode,
};
