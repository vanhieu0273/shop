const Order = require('../models/order.model');
const OrderItem = require('../models/orderItem.model');
const Product = require('../models/product.model');
const Expense = require('../models/expense.model');

// Get sales statistics
const getSalesStatistics = async (req, res) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;
    console.log('startDate, endDate, period', startDate, endDate, period);
    
    
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

    // Get revenue data based on period
    let revenueData;
    if (startDate && endDate) {
      if (period === 'monthly') {
        // Generate array of months between startDate and endDate
        const start = new Date(startDate);
        const end = new Date(endDate);
        const months = [];
        
        for (let d = new Date(start.getFullYear(), start.getMonth(), 1); 
             d <= end; 
             d.setMonth(d.getMonth() + 1)) {
          months.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          });
        }

        revenueData = await Promise.all(
          months.map(async (monthInfo) => {
            const startOfMonth = new Date(monthInfo.year, monthInfo.month - 1, 1);
            const endOfMonth = new Date(monthInfo.year, monthInfo.month, 0, 23, 59, 59, 999);

            const monthOrders = await Order.find({
              created_at: {
                $gte: startOfMonth,
                $lte: endOfMonth
              },
              status: 'delivered',
              payment_status: 'completed'
            });

            const revenue = monthOrders.reduce((sum, order) => sum + order.total_price, 0);

            return {
              period: monthInfo.label,
              revenue
            };
          })
        );
      } else {
        // Daily calculation (default)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d).toISOString().split('T')[0]);
        }

        revenueData = await Promise.all(
          dates.map(async (date) => {
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
              period: date,
              revenue
            };
          })
        );
      }
    } else {
      // Default to last 7 days if no date range provided
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      revenueData = await Promise.all(
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
            period: date,
            revenue
          };
        })
      );
    }

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
      revenueData,
      period,
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
    const { startDate, endDate, period = 'daily' } = req.query;
    
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

    // Get statistics data based on period
    let statsData;
    if (startDate && endDate) {
      if (period === 'monthly') {
        // Generate array of months between startDate and endDate
        const start = new Date(startDate);
        const end = new Date(endDate);
        const months = [];
        
        for (let d = new Date(start.getFullYear(), start.getMonth(), 1); 
             d <= end; 
             d.setMonth(d.getMonth() + 1)) {
          months.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          });
        }

        statsData = await Promise.all(
          months.map(async (monthInfo) => {
            const startOfMonth = new Date(monthInfo.year, monthInfo.month - 1, 1);
            const endOfMonth = new Date(monthInfo.year, monthInfo.month, 0, 23, 59, 59, 999);

            // Get orders for the month
            const monthOrders = await Order.find({
              created_at: {
                $gte: startOfMonth,
                $lte: endOfMonth
              },
              status: 'delivered',
              payment_status: 'completed'
            });

            // Get expenses for the month
            const monthExpenses = await Expense.find({
              date: {
                $gte: startOfMonth,
                $lte: endOfMonth
              },
              status: 'completed'
            });

            const revenue = monthOrders.reduce((sum, order) => sum + order.total_price, 0);
            const expense = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const profit = revenue - expense;

            return {
              period: monthInfo.label,
              revenue,
              expense,
              profit
            };
          })
        );
      } else {
        // Daily calculation (default)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d).toISOString().split('T')[0]);
        }

        statsData = await Promise.all(
          dates.map(async (date) => {
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
              period: date,
              revenue,
              expense,
              profit
            };
          })
        );
      }
    } else {
      // Default to last 7 days if no date range provided
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      statsData = await Promise.all(
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
            period: date,
            revenue,
            expense,
            profit
          };
        })
      );
    }

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
      statsData,
      period,
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