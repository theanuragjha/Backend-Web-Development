require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const requireAuth = require('./middleware/requireAuth');
const requireRole = require('./middleware/requireRole');
const postsRouter = require('./routes/posts');
const data = require('./data');

const app = express();
app.use(express.json());

// POST /auth/login — signs a test token for a given user and role
app.post('/auth/login', (req, res) => {
  const { id, sub, role } = req.body ?? {};
  const userId = id || sub || 'u-A';
  const userRole = role || 'member';

  const token = jwt.sign(
    { sub: userId, role: userRole },
    process.env.ACCESS_SECRET || 'test-access-secret-32-chars-long-or-more',
    { expiresIn: '1h' }
  );

  return res.status(200).json({
    token,
    user: { id: userId, role: userRole },
  });
});

// Protected posts routes
app.use('/posts', requireAuth, postsRouter);

// Gated admin route: DELETE /users/:id (requireAuth + requireRole('admin'))
app.delete('/users/:id', requireAuth, requireRole('admin'), (req, res) => {
  const userIndex = data.users.findIndex((u) => u.id === req.params.id);
  if (userIndex !== -1) {
    data.users.splice(userIndex, 1);
  }
  return res.status(200).json({ message: 'User deleted successfully' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
});

const PORT = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}

module.exports = app;
