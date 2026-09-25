'use strict';

const express = require('express');
const postRoutes = require('./routes/postRoutes');
const { resetData } = require('./data/postStore');
const controller = require('./controllers/postController');
const http = require('./utils/http');

function createApp() {
  const app = express();
  app.use(express.json());

  // Resource routes: /posts collection
  app.use('/posts', postRoutes);

  // Safe internal failure route for testing/demo
  app.get('/explode', controller.explode);

  // 404 Fallback for unmapped routes
  app.use((req, res) => {
    return http.sendError(res, 404, 'NOT_FOUND', 'Route not found');
  });

  // Centralized 500 error handler hiding internals
  app.use((err, req, res, next) => {
    console.error('Unhandled internal error:', err.message, err.stack);
    return http.sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

module.exports = {
  createApp,
  resetData,
};
