const express = require('express');
const router = express.Router();
const { 
  processPayment, 
  updateOrderStatus, 
  updatePaymentStatus,
  getUserAddresses, 
  getOrderDetails,
  getUserOrders,
  getUserOrdersWithFilters,
  getUserOrderStatistics,
  getAllOrders
} = require('../services/payment.service');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Lấy toàn bộ đơn hàng (admin)
router.get('/orders', authMiddleware, async (req, res) => {
  try {
    // Lấy các tham số phân trang và filter từ query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {};

    if (req.query.status) filters.status = req.query.status;
    if (req.query.payment_status) filters.payment_status = req.query.payment_status;
    if (req.query.startDate && req.query.endDate) {
      filters.startDate = req.query.startDate;
      filters.endDate = req.query.endDate;
    }

    const result = await getAllOrders(page, limit, filters);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Xử lý thanh toán đơn hàng
router.post('/process', async (req, res) => {
  try {
    const result = await processPayment(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Lấy danh sách đơn hàng của người dùng đã đăng nhập
router.get('/user-orders', authMiddleware, async (req, res) => {
  try {
    const orders = await getUserOrders(req.user.id);
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cập nhật trạng thái đơn hàng (chỉ dành cho admin)
router.patch('/orders/:orderId/status', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const result = await updateOrderStatus(orderId, status);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Lấy chi tiết một đơn hàng cụ thể(admin)
router.patch('/orders/:orderId/payment', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { payment_status, bank_transfer_info } = req.body;
    const result = await updatePaymentStatus(orderId, payment_status, bank_transfer_info);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get order details
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await getOrderDetails(orderId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Lấy danh sách địa chỉ mà người dùng đã từng sử dụng (yêu cầu đăng nhập)
router.get('/user-addresses', authMiddleware, async (req, res) => {
  try {
    const addresses = await getUserAddresses(req.user.id);
    res.json(addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


module.exports = router; 