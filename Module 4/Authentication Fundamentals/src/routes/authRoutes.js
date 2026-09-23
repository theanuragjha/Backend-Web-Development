'use strict';

const express = require('express');
const authService = require('../services/authService');

const router = express.Router();

/**
 * POST /auth/register
 * Validates non-empty string fields, delegates registration, and returns safe 201 response.
 */
router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body || {};

  if (
    typeof name !== 'string' || name.trim().length === 0 ||
    typeof email !== 'string' || email.trim().length === 0 ||
    typeof password !== 'string' || password.length === 0
  ) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Name, email, and password are required non-empty strings',
      },
    });
  }

  try {
    const user = await authService.register({ name, email, password });
    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login
 * Validates non-empty string fields, delegates authentication, and returns safe 200 response.
 */
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string' || email.trim().length === 0 ||
    typeof password !== 'string' || password.length === 0
  ) {
    return res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: 'Email and password are required non-empty strings',
      },
    });
  }

  try {
    const user = await authService.login({ email, password });
    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
