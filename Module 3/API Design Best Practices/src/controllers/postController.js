'use strict';

const service = require('../services/postService');
const http = require('../utils/http');

/**
 * GET /posts
 * List posts with pagination and metadata envelope.
 */
function listPosts(req, res) {
  const { items, meta } = service.listPosts(req.query);
  return http.sendList(res, items, meta);
}

/**
 * GET /posts/:id
 * Retrieve a single post wrapped in { data }, or 404 { error }.
 */
function getPost(req, res) {
  const post = service.getPost(req.params.id);
  if (!post) {
    return http.sendError(res, 404, 'NOT_FOUND', 'Post not found');
  }
  return http.sendOk(res, post);
}

/**
 * POST /posts
 * Create a new post. Returns 201 with { data }, or 400 on invalid input.
 */
function createPost(req, res) {
  const { title, author } = req.body || {};
  if (
    !title || typeof title !== 'string' || title.trim().length === 0 ||
    !author || typeof author !== 'string' || author.trim().length === 0
  ) {
    return http.sendError(res, 400, 'VALIDATION_ERROR', 'Title and author are required non-empty strings');
  }

  const post = service.createPost({ title: title.trim(), author: author.trim() });
  return http.sendCreated(res, post);
}

/**
 * POST /posts/:id/likes
 * Relationship resource creation. Increments likes on a post.
 * Returns 200 with { data: post } or 404 if post not found.
 */
function likePost(req, res) {
  const post = service.likePost(req.params.id);
  if (!post) {
    return http.sendError(res, 404, 'NOT_FOUND', 'Post not found');
  }
  return http.sendOk(res, post);
}

/**
 * GET /explode
 * Internal failure demo route. Catches internal error, logs diagnostics to
 * server console, and returns safe 500 without leaking stack trace or SQL text.
 */
function explode(req, res) {
  try {
    service.explode();
  } catch (err) {
    // Log diagnostics internally for developers; never leak to client
    console.error('Internal failure caught (logged safely):', err.message, err.debug || err.stack);
    return http.sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
  }
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  likePost,
  explode,
};
