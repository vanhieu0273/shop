const express = require('express');
const router = express.Router();
const expenseService = require('../services/expense.service');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { upload } = require('../config/cloudinary');

// Protected routes (require authentication and admin/manager role)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  upload.single('receipt_image'),
  expenseService.createExpense
);

router.get(
  '/',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  expenseService.getExpenses
);

router.get(
  '/statistics',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  expenseService.getExpenseStatistics
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  upload.single('receipt_image'),
  expenseService.updateExpense
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  expenseService.deleteExpense
);

module.exports = router; 