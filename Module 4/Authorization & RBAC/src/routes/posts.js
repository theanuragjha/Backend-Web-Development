const express = require('express');
const requireRole = require('../middleware/requireRole');
const data = require('../data');

const router = express.Router();

// GET /posts — list all posts
router.get('/', (req, res) => {
  return res.status(200).json({ posts: data.posts });
});

// GET /posts/:id — retrieve single post
router.get('/:id', (req, res) => {
  const post = data.posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Post not found',
      },
    });
  }
  return res.status(200).json({ post });
});

// PATCH /posts/:id — edit post with ownership check + privileged role bypass
router.patch('/:id', (req, res) => {
  const post = data.posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Post not found',
      },
    });
  }

  const isOwner = post.authorId === req.user.id;
  const isPrivileged = ['moderator', 'admin'].includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to modify this post',
      },
    });
  }

  if (req.body.title !== undefined) post.title = req.body.title;
  if (req.body.body !== undefined) post.body = req.body.body;

  return res.status(200).json({ post });
});

// DELETE /posts/:id — delete post with ownership check + privileged role bypass
router.delete('/:id', (req, res) => {
  const postIndex = data.posts.findIndex((p) => p.id === req.params.id);
  if (postIndex === -1) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Post not found',
      },
    });
  }

  const post = data.posts[postIndex];
  const isOwner = post.authorId === req.user.id;
  const isPrivileged = ['moderator', 'admin'].includes(req.user.role);

  if (!isOwner && !isPrivileged) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You do not have permission to delete this post',
      },
    });
  }

  data.posts.splice(postIndex, 1);
  return res.status(200).json({ message: 'Post deleted successfully' });
});

// POST /posts/:id/hide — role-gated to moderator and admin
router.post('/:id/hide', requireRole('moderator', 'admin'), (req, res) => {
  const post = data.posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Post not found',
      },
    });
  }

  post.hidden = true;
  return res.status(200).json({ post, message: 'Post hidden successfully' });
});

module.exports = router;
