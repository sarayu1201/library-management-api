const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all members
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM members ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET single member
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM members WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET books borrowed by member
router.get('/:id/borrowed', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT b.*, t.id as transaction_id, t.borrowed_at, t.due_date, t.status FROM books b INNER JOIN transactions t ON b.id = t.book_id WHERE t.member_id = $1 AND t.status = $2 ORDER BY t.borrowed_at DESC',
      [req.params.id, 'active']
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// CREATE member
router.post('/', async (req, res, next) => {
  try {
    const { name, email, membership_number } = req.body;
    
    if (!name || !email || !membership_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      'INSERT INTO members (name, email, membership_number) VALUES ($1, $2, $3) RETURNING *',
      [name, email, membership_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// UPDATE member
router.put('/:id', async (req, res, next) => {
  try {
    const { name, email, status } = req.body;
    
    const result = await pool.query(
      'UPDATE members SET name = COALESCE($1, name), email = COALESCE($2, email), status = COALESCE($3, status), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, email, status, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE member
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM members WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
