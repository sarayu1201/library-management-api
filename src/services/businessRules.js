const pool = require('../config/database');

const MAX_BORROW_LIMIT = 3;  // Max books a member can borrow simultaneously
const LOAN_PERIOD_DAYS = 14;  // Standard loan period
const FINE_PER_DAY = 0.50;    // Fine amount per overdue day
const OVERDUE_THRESHOLD = 3;  // Number of concurrent overdue books to suspend member

// Calculate due date (14 days from borrow date)
function calculateDueDate(borrowedAt) {
  const dueDate = new Date(borrowedAt);
  dueDate.setDate(dueDate.getDate() + LOAN_PERIOD_DAYS);
  return dueDate;
}

// Calculate overdue fine
function calculateOverdueFine(dueDate) {
  const today = new Date();
  if (today <= dueDate) return 0;
  
  const days = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
  return days * FINE_PER_DAY;
}

// Check if member can borrow more books
async function canMemberBorrow(memberId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE member_id = $1 AND status = $2',
      [memberId, 'active']
    );
    
    const activeCount = parseInt(result.rows[0].count);
    if (activeCount >= MAX_BORROW_LIMIT) {
      throw new Error(`Member has reached maximum borrow limit of ${MAX_BORROW_LIMIT}`);
    }
  } catch (err) {
    throw err;
  }
}

// Check if member has unpaid fines
async function hasUnpaidFines(memberId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM fines WHERE member_id = $1 AND paid_at IS NULL',
      [memberId]
    );
    
    const unpaidCount = parseInt(result.rows[0].count);
    return unpaidCount > 0;
  } catch (err) {
    throw err;
  }
}

// Check and update member suspension status
async function updateMemberSuspensionStatus(memberId) {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE member_id = $1 AND status = $2',
      [memberId, 'overdue']
    );
    
    const overdueCount = parseInt(result.rows[0].count);
    const shouldBeSuspended = overdueCount >= OVERDUE_THRESHOLD;
    
    const newStatus = shouldBeSuspended ? 'suspended' : 'active';
    
    await pool.query(
      'UPDATE members SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, memberId]
    );
    
    return { suspended: shouldBeSuspended, reason: `${overdueCount} overdue books` };
  } catch (err) {
    throw err;
  }
}

// Validate book availability
async function validateBookAvailability(bookId) {
  try {
    const result = await pool.query(
      'SELECT available_copies, status FROM books WHERE id = $1',
      [bookId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Book not found');
    }
    
    const { available_copies, status } = result.rows[0];
    
    if (available_copies <= 0) {
      throw new Error('Book is not available for borrowing');
    }
    
    if (status !== 'available') {
      throw new Error(`Book status is ${status}, cannot be borrowed`);
    }
  } catch (err) {
    throw err;
  }
}

// Update book copy count
async function updateBookCopies(bookId, borrowed) {
  try {
    const change = borrowed ? -1 : 1;
    const result = await pool.query(
      'UPDATE books SET available_copies = available_copies + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING available_copies, total_copies',
      [change, bookId]
    );
    
    const { available_copies, total_copies } = result.rows[0];
    const newStatus = available_copies === 0 ? 'borrowed' : available_copies === total_copies ? 'available' : 'available';
    
    await pool.query(
      'UPDATE books SET status = $1 WHERE id = $2',
      [newStatus, bookId]
    );
  } catch (err) {
    throw err;
  }
}

// Create fine for overdue transaction
async function createFineForOverdue(memberId, transactionId) {
  try {
    const transResult = await pool.query(
      'SELECT due_date FROM transactions WHERE id = $1',
      [transactionId]
    );
    
    if (transResult.rows.length === 0) return;
    
    const dueDate = new Date(transResult.rows[0].due_date);
    const fineAmount = calculateOverdueFine(dueDate);
    
    if (fineAmount > 0) {
      await pool.query(
        'INSERT INTO fines (member_id, transaction_id, amount) VALUES ($1, $2, $3)',
        [memberId, transactionId, fineAmount]
      );
    }
  } catch (err) {
    throw err;
  }
}

module.exports = {
  MAX_BORROW_LIMIT,
  LOAN_PERIOD_DAYS,
  FINE_PER_DAY,
  OVERDUE_THRESHOLD,
  calculateDueDate,
  calculateOverdueFine,
  canMemberBorrow,
  hasUnpaidFines,
  updateMemberSuspensionStatus,
  validateBookAvailability,
  updateBookCopies,
  createFineForOverdue
};
