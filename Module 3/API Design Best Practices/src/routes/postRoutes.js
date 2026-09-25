'use strict';

const express = require('express');
const controller = require('../controllers/postController');

const router = express.Router();

// Resource routes on /posts collection
router.get('/', controller.listPosts);
router.post('/', controller.createPost);
router.get('/:id', controller.getPost);
router.post('/:id/likes', controller.likePost);

module.exports = router;
