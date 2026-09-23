'use strict';

require('dotenv').config();
const express = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code || 'ERROR',
        message: error.message,
      },
    });
  }
  console.error(error.message);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  app.listen(port, () => console.log(`API listening on ${port}`));
}

module.exports = app;
