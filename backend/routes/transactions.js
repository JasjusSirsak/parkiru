const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionsController');

// Create transaction (saat exit)
router.post('/', transactionController.createTransaction);

// Get all transactions
router.get('/', transactionController.getAllTransactions);

// Get transaction by ID
router.get('/:id', transactionController.getTransactionById);

// Update payment status
router.put('/:id/payment', transactionController.updatePaymentStatus);

module.exports = router;
