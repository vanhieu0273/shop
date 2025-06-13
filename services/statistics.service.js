const Order = require('../model/Order');
const OrderItem = require('../model/OrderItem');
const Product = require('../model/Product.model');
const Expense = require('../model/expense.model');

// Get sales statistics
const getSalesStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.created_at = {};
      if (startDate) {
        dateFilter.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.created_at.$lte = new Date(endDate);
      }
    }

    // Get all completed orders within date range
    const orders = await Order.find({
      ...dateFilter,
      status: 'delivered',
      payment_status: 'completed'
    });

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_price, 0);

    // Get total number of orders
    const totalOrders = orders.length;

    // Get total number of products sold
    const orderItems = await OrderItem.find({
      order_id: { $in: orders.map(order => order._id) }
    });

    const totalProductsSold = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    // Get top selling products
    const productSales = {};
    orderItems.forEach(item => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = {
          quantity: 0,
          revenue: 0
        };
      }
      productSales[item.product_id].quantity += item.quantity;
      productSales[item.product_id].revenue += item.price * item.quantity;
    });

    // Convert to array and sort by revenue
    const topSellingProducts = await Promise.all(
      Object.entries(productSales)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(async ([productId, sales]) => {
          const product = await Product.findById(productId)
            .select('name price images');
          return {
            product: product,
            quantity: sales.quantity,
            revenue: sales.revenue
          };
        })
    );

    // Get daily revenue for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyRevenue = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const dayOrders = await Order.find({
          created_at: {
            $gte: startOfDay,
            $lt: endOfDay
          },
          status: 'delivered',
          payment_status: 'completed'
        });

        const revenue = dayOrders.reduce((sum, order) => sum + order.total_price, 0);

        return {
          date,
          revenue
        };
      })
    );

    // Get payment method statistics
    const paymentMethodStats = orders.reduce((stats, order) => {
      if (!stats[order.payment_method]) {
        stats[order.payment_method] = {
          count: 0,
          revenue: 0
        };
      }
      stats[order.payment_method].count++;
      stats[order.payment_method].revenue += order.total_price;
      return stats;
    }, {});

    return res.status(200).json({
      totalRevenue,
      totalOrders,
      totalProductsSold,
      topSellingProducts,
      dailyRevenue,
      paymentMethodStats
    });
  } catch (error) {
    console.error("Error getting sales statistics:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Get comprehensive financial statistics
const getFinancialStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.created_at = {};
      if (startDate) {
        dateFilter.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.created_at.$lte = new Date(endDate);
      }
    }

    // Get all completed orders within date range
    const orders = await Order.find({
      ...dateFilter,
      status: 'delivered',
      payment_status: 'completed'
    });

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_price, 0);

    // Get total number of orders
    const totalOrders = orders.length;

    // Get total number of products sold
    const orderItems = await OrderItem.find({
      order_id: { $in: orders.map(order => order._id) }
    });

    const totalProductsSold = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    // Get all expenses within date range
    const expenses = await Expense.find({
      ...dateFilter,
      status: 'completed'
    });

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate profit
    const profit = totalRevenue - totalExpenses;

    // Get expenses by category
    const expenseByCategory = expenses.reduce((stats, expense) => {
      if (!stats[expense.category]) {
        stats[expense.category] = {
          count: 0,
          amount: 0
        };
      }
      stats[expense.category].count++;
      stats[expense.category].amount += expense.amount;
      return stats;
    }, {});

    // Get daily statistics for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyStats = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);

        // Get orders for the day
        const dayOrders = await Order.find({
          created_at: {
            $gte: startOfDay,
            $lt: endOfDay
          },
          status: 'delivered',
          payment_status: 'completed'
        });

        // Get expenses for the day
        const dayExpenses = await Expense.find({
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          },
          status: 'completed'
        });

        const revenue = dayOrders.reduce((sum, order) => sum + order.total_price, 0);
        const expense = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const profit = revenue - expense;

        return {
          date,
          revenue,
          expense,
          profit
        };
      })
    );

    // Get top selling products with profit calculation
    const productSales = {};
    orderItems.forEach(item => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = {
          quantity: 0,
          revenue: 0
        };
      }
      productSales[item.product_id].quantity += item.quantity;
      productSales[item.product_id].revenue += item.price * item.quantity;
    });

    const topSellingProducts = await Promise.all(
      Object.entries(productSales)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(async ([productId, sales]) => {
          const product = await Product.findById(productId)
            .select('name price images');
          return {
            product: product,
            quantity: sales.quantity,
            revenue: sales.revenue
          };
        })
    );

    // Calculate profit margin
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return res.status(200).json({
      summary: {
        totalRevenue,
        totalExpenses,
        profit,
        profitMargin: profitMargin.toFixed(2) + '%',
        totalOrders,
        totalProductsSold
      },
      expenses: {
        byCategory: expenseByCategory,
        total: totalExpenses
      },
      dailyStats,
      topSellingProducts
    });
  } catch (error) {
    console.error("Error getting financial statistics:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

module.exports = {
  getSalesStatistics,
  getFinancialStatistics
}; 