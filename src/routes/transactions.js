const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const businessRules = require('../services/businessRules');
const { calculateDueDate } = require('../services/businessRules');

// GET all transactions
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET overdue transactions
router.get('/overdue', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT t.*, b.title, m.name FROM transactions t INNER JOIN books b ON t.book_id = b.id INNER JOIN members m ON t.member_id = m.id WHERE t.status = $1 ORDER BY t.due_date ASC',
      ['overdue']
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// BORROW book
router.post('/borrow', async (req, res, next) => {
  try {
    const { book_id, member_id } = req.body;
    
    if (!book_id || !member_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check business rules
    await businessRules.validateBookAvailability(book_id);
    await businessRules.canMemberBorrow(member_id);
    const hasFines = await businessRules.hasUnpaidFines(member_id);
    if (hasFines) {
      return res.status(400).json({ error: 'Member has unpaid fines' });
    }
    
    const dueDate = calculateDueDate(new Date());
    
    const result = await pool.query(
      'INSERT INTO transactions (book_id, member_id, due_date) VALUES ($1, $2, $3) RETURNING *',
      [book_id, member_id, dueDate]
    );
    
    // Update book copies
    await businessRules.updateBookCopies(book_id, true);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// RETURN book
router.post('/:id/return', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const transResult = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    
    if (transResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const transaction = transResult.rows[0];
    
    // Update book copies
    await businessRules.updateBookCopies(transaction.book_id, false);
    
    // Update transaction status
    const result = await pool.query(
      'UPDATE transactions SET returned_at = CURRENT_TIMESTAMP, status = $1 WHERE id = $2 RETURNING *',
      ['returned', id]
    );
    
    // Check for overdue and create fine
    const dueDate = new Date(transaction.due_date);
    if (new Date() > dueDate) {
      await businessRules.createFineForOverdue(transaction.member_id, id);
    }
    
    // Update member suspension status
    await businessRules.updateMemberSuspensionStatus(transaction.member_id);
    
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
