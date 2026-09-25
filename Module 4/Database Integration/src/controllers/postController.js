'use strict';

const postService = require('../services/postService');

async function list(req, res, next) {
  try {
    return res.json({ data: await postService.listPosts() });
  } catch (error) {
    return next(error);
  }
}

async function get(req, res, next) {
  try {
    const post = await postService.getPost(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ data: post });
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const post = await postService.createPost(req.body);
    return res.status(201).json({ data: post });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const post = await postService.updatePost(req.params.id, req.body);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json({ data: post });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const removed = await postService.removePost(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Post not found' });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { list, get, create, update, remove };
