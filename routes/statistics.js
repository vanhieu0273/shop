const express = require('express');
const router = express.Router();
const statisticsService = require('../services/statistics.service');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');

// Get sales statistics (protected route, only admin and manager can access)
router.get(
  '/sales',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  statisticsService.getSalesStatistics
);

// Get comprehensive financial statistics
router.get(
  '/financial',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  statisticsService.getFinancialStatistics
);

module.exports = router; 