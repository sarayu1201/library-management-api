const express = require('express');
const booksRoutes = require('./routes/books');
const membersRoutes = require('./routes/members');
const transactionsRoutes = require('./routes/transactions');
const finesRoutes = require('./routes/fines');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Routes
app.use('/books', booksRoutes);
app.use('/members', membersRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/fines', finesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
