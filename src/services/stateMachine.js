// State Machine for Book Status
const BOOK_STATES = {
  AVAILABLE: 'available',
  BORROWED: 'borrowed',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance'
};

const TRANSACTION_STATES = {
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue'
};

// Define valid state transitions for books
const VALID_TRANSITIONS = {
  [BOOK_STATES.AVAILABLE]: [BOOK_STATES.BORROWED, BOOK_STATES.RESERVED, BOOK_STATES.MAINTENANCE],
  [BOOK_STATES.BORROWED]: [BOOK_STATES.AVAILABLE, BOOK_STATES.MAINTENANCE],
  [BOOK_STATES.RESERVED]: [BOOK_STATES.BORROWED, BOOK_STATES.AVAILABLE, BOOK_STATES.MAINTENANCE],
  [BOOK_STATES.MAINTENANCE]: [BOOK_STATES.AVAILABLE]
};

// Check if state transition is valid
function isValidTransition(fromState, toState) {
  return VALID_TRANSITIONS[fromState]?.includes(toState) || false;
}

// Transition book to new state
function transitionBookState(currentState, targetState) {
  if (!VALID_TRANSITIONS[currentState]) {
    throw new Error(`Invalid current state: ${currentState}`);
  }
  
  if (!isValidTransition(currentState, targetState)) {
    throw new Error(`Cannot transition from ${currentState} to ${targetState}`);
  }
  
  return targetState;
}

// Get next state for book based on action
function getNextBookState(currentState, action) {
  const transitions = {
    'borrow': BOOK_STATES.BORROWED,
    'return': BOOK_STATES.AVAILABLE,
    'reserve': BOOK_STATES.RESERVED,
    'maintenance': BOOK_STATES.MAINTENANCE,
    'restore': BOOK_STATES.AVAILABLE
  };
  
  return transitions[action] || null;
}

// Get next transaction state
function getNextTransactionState(currentState, action) {
  if (currentState === TRANSACTION_STATES.ACTIVE) {
    if (action === 'return') return TRANSACTION_STATES.RETURNED;
    if (action === 'markOverdue') return TRANSACTION_STATES.OVERDUE;
  } else if (currentState === TRANSACTION_STATES.OVERDUE) {
    if (action === 'return') return TRANSACTION_STATES.RETURNED;
  }
  return currentState;
}

module.exports = {
  BOOK_STATES,
  TRANSACTION_STATES,
  isValidTransition,
  transitionBookState,
  getNextBookState,
  getNextTransactionState,
  VALID_TRANSITIONS
};
