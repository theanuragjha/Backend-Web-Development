'use strict';

const rateLimit = require('express-rate-limit');

/*
 * ============================================================================
 * REDIS-BACKED STORE FOR MULTI-INSTANCE DEPLOYMENTS:
 *
 * In a production environment running multiple Node.js instances behind a load
 * balancer, the default MemoryStore keeps rate-limiting counters in each
 * process's local RAM.
 *
 * Why MemoryStore fails across multiple instances:
 * 1. Counter Isolation: If an application runs across N instances, an attacker
 *    whose requests are distributed by a load balancer effectively receives
 *    N times the configured limit (e.g. 5 attempts * 3 instances = 15 total
 *    attempts) before any single instance triggers throttling.
 * 2. Inconsistent Throttling: A user could be throttled on Instance A but still
 *    have remaining quota on Instance B and C, rendering brute-force defence
 *    ineffective.
 *
 * The Fix (rate-limit-redis):
 * To enforce a single global rate limit across all server instances, replace
 * MemoryStore with a centralized RedisStore from the `rate-limit-redis` package:
 *
 *   const { RedisStore } = require('rate-limit-redis');
 *   const { createClient } = require('redis');
 *   const redisClient = createClient({ url: process.env.REDIS_URL });
 *   await redisClient.connect();
 *
 *   const authLimiter = rateLimit({
 *     windowMs: 15 * 60 * 1000,
 *     max: 5,
 *     store: new RedisStore({
 *       sendCommand: (...args) => redisClient.sendCommand(args),
 *     }),
 *     ...
 *   });
 *
 * Redis maintains atomic counters (using INCR and PEXPIRE) shared across all
 * instances, ensuring that an IP is capped at exactly 5 attempts cluster-wide.
 * ============================================================================
 */

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 5, // 5 attempts per window per IP
  standardHeaders: true, // draft-6/draft-7 RateLimit-* headers
  legacyHeaders: false, // disable deprecated X-RateLimit-* headers
  skipSuccessfulRequests: true, // only failed attempts count against quota
  handler: (req, res, _next, options) => {
    // Calculate seconds until the current window resets
    const retryAfterSeconds = req.rateLimit && req.rateLimit.resetTime
      ? Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000)
      : Math.ceil(options.windowMs / 1000);

    res.setHeader('Retry-After', Math.max(1, retryAfterSeconds));
    res.status(options.statusCode || 429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later.',
      },
    });
  },
});

module.exports = authLimiter;
