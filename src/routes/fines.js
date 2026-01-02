const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all fines
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT f.*, m.name FROM fines f INNER JOIN members m ON f.member_id = m.id ORDER BY f.id');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET unpaid fines
router.get('/unpaid', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT f.*, m.name FROM fines f INNER JOIN members m ON f.member_id = m.id WHERE f.paid_at IS NULL ORDER BY f.id'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET single fine
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM fines WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Mark fine as paid
router.post('/:id/pay', async (req, res, next) => {
  try {
    const result = await pool.query(
      'UPDATE fines SET paid_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fine not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET member's fines
router.get('/member/:member_id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fines WHERE member_id = $1 ORDER BY id',
      [req.params.member_id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
