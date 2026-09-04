const postService = require('../services/postService');

function list(req, res) {
  return res.json({ data: postService.listPosts() });
}

function get(req, res) {
  const post = postService.getPost(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  return res.json({ data: post });
}

function create(req, res) {
  try {
    const post = postService.createPost(req.body);
    return res.status(201).json({ data: post });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

function update(req, res) {
  const post = postService.updatePost(req.params.id, req.body);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  return res.json({ data: post });
}

function remove(req, res) {
  const removed = postService.removePost(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Post not found' });
  return res.status(204).send();
}

module.exports = { list, get, create, update, remove };
