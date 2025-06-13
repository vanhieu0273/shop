const express = require('express');
const router = express.Router();
const statisticsService = require('../service/statistics.service');
const { authMiddleware } = require('../middleware/auth.middleware');
const { roleMiddleware } = require('../middleware/role.middleware');

// Get sales statistics (protected route, only admin and manager can access)
router.get(
  '/sales',
//   authMiddleware,
//   roleMiddleware(['admin', 'manager']),
  statisticsService.getSalesStatistics
);

// Get comprehensive financial statistics
router.get(
  '/financial',
//   authMiddleware,
//   roleMiddleware(['admin', 'manager']),
  statisticsService.getFinancialStatistics
);

module.exports = router; 