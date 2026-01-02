const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all books
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET available books
router.get('/available', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM books WHERE status = $1 AND available_copies > 0 ORDER BY id',
      ['available']
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET single book
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// CREATE book
router.post('/', async (req, res, next) => {
  try {
    const { isbn, title, author, category, total_copies } = req.body;
    
    if (!isbn || !title || !author || !category || !total_copies) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      'INSERT INTO books (isbn, title, author, category, total_copies, available_copies) VALUES ($1, $2, $3, $4, $5, $5) RETURNING *',
      [isbn, title, author, category, total_copies]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// UPDATE book
router.put('/:id', async (req, res, next) => {
  try {
    const { title, author, category, total_copies, available_copies } = req.body;
    
    const result = await pool.query(
      'UPDATE books SET title = COALESCE($1, title), author = COALESCE($2, author), category = COALESCE($3, category), total_copies = COALESCE($4, total_copies), available_copies = COALESCE($5, available_copies), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
      [title, author, category, total_copies, available_copies, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE book
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
