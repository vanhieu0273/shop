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
          revenue: 0,
          cost: 0
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
            .select('name price importPrice images');
          
          // Tính toán chi phí và lãi
          const cost = product.importPrice * sales.quantity;
          const profit = sales.revenue - cost;
          const profitMargin = sales.revenue > 0 ? (profit / sales.revenue) * 100 : 0;
          
          return {
            product: product,
            quantity: sales.quantity,
            revenue: sales.revenue,
            cost: cost,
            profit: profit,
            profitMargin: profitMargin.toFixed(2) + '%'
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

            // Get order items for the month
            const monthOrderItems = await OrderItem.find({
              order_id: { $in: monthOrders.map(order => order._id) }
            });

            // Calculate product costs for the month
            const monthProductCosts = {};
            monthOrderItems.forEach(item => {
              if (!monthProductCosts[item.product_id]) {
                monthProductCosts[item.product_id] = 0;
              }
              monthProductCosts[item.product_id] += item.quantity;
            });

            // Get products to calculate cost
            const monthProducts = await Product.find({
              _id: { $in: Object.keys(monthProductCosts) }
            }).select('importPrice');

            let monthCost = 0;
            monthProducts.forEach(product => {
              monthCost += product.importPrice * monthProductCosts[product._id.toString()];
            });

            const revenue = monthOrders.reduce((sum, order) => sum + order.total_price, 0);
            const profit = revenue - monthCost;

            return {
              period: monthInfo.label,
              revenue,
              cost: monthCost,
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

            // Get order items for the day
            const dayOrderItems = await OrderItem.find({
              order_id: { $in: dayOrders.map(order => order._id) }
            });

            // Calculate product costs for the day
            const dayProductCosts = {};
            dayOrderItems.forEach(item => {
              if (!dayProductCosts[item.product_id]) {
                dayProductCosts[item.product_id] = 0;
              }
              dayProductCosts[item.product_id] += item.quantity;
            });

            // Get products to calculate cost
            const dayProducts = await Product.find({
              _id: { $in: Object.keys(dayProductCosts) }
            }).select('importPrice');

            let dayCost = 0;
            dayProducts.forEach(product => {
              dayCost += product.importPrice * dayProductCosts[product._id.toString()];
            });

            const revenue = dayOrders.reduce((sum, order) => sum + order.total_price, 0);
            const profit = revenue - dayCost;

            return {
              period: date,
              revenue,
              cost: dayCost,
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

          // Get order items for the day
          const dayOrderItems = await OrderItem.find({
            order_id: { $in: dayOrders.map(order => order._id) }
          });

          // Calculate product costs for the day
          const dayProductCosts = {};
          dayOrderItems.forEach(item => {
            if (!dayProductCosts[item.product_id]) {
              dayProductCosts[item.product_id] = 0;
            }
            dayProductCosts[item.product_id] += item.quantity;
          });

          // Get products to calculate cost
          const dayProducts = await Product.find({
            _id: { $in: Object.keys(dayProductCosts) }
          }).select('importPrice');

          let dayCost = 0;
          dayProducts.forEach(product => {
            dayCost += product.importPrice * dayProductCosts[product._id.toString()];
          });

          const revenue = dayOrders.reduce((sum, order) => sum + order.total_price, 0);
          const profit = revenue - dayCost;

          return {
            period: date,
            revenue,
            cost: dayCost,
            profit
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

    // Calculate total cost based on import price
    const productCosts = {};
    orderItems.forEach(item => {
      if (!productCosts[item.product_id]) {
        productCosts[item.product_id] = 0;
      }
      productCosts[item.product_id] += item.quantity;
    });

    // Get products to calculate total cost
    const products = await Product.find({
      _id: { $in: Object.keys(productCosts) }
    }).select('importPrice');

    let totalCost = 0;
    products.forEach(product => {
      totalCost += product.importPrice * productCosts[product._id.toString()];
    });

    // Calculate profit based on import price
    const profit = totalRevenue - totalCost;

    return res.status(200).json({
      totalRevenue,
      totalCost,
      profit,
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

    // Calculate total cost based on import price
    const productCosts = {};
    orderItems.forEach(item => {
      if (!productCosts[item.product_id]) {
        productCosts[item.product_id] = 0;
      }
      productCosts[item.product_id] += item.quantity;
    });

    // Get products to calculate total cost
    const products = await Product.find({
      _id: { $in: Object.keys(productCosts) }
    }).select('importPrice');

    let totalCost = 0;
    products.forEach(product => {
      totalCost += product.importPrice * productCosts[product._id.toString()];
    });

    // Calculate profit based on import price
    const profit = totalRevenue - totalCost;

    // Get all expenses within date range
    const expenses = await Expense.find({
      ...dateFilter,
      status: 'completed'
    });

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

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

            // Get order items for the month
            const monthOrderItems = await OrderItem.find({
              order_id: { $in: monthOrders.map(order => order._id) }
            });

            // Calculate product costs for the month
            const monthProductCosts = {};
            monthOrderItems.forEach(item => {
              if (!monthProductCosts[item.product_id]) {
                monthProductCosts[item.product_id] = 0;
              }
              monthProductCosts[item.product_id] += item.quantity;
            });

            // Get products to calculate cost
            const monthProducts = await Product.find({
              _id: { $in: Object.keys(monthProductCosts) }
            }).select('importPrice');

            let monthCost = 0;
            monthProducts.forEach(product => {
              monthCost += product.importPrice * monthProductCosts[product._id.toString()];
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
            const profit = revenue - monthCost - expense;

            return {
              period: monthInfo.label,
              revenue,
              cost: monthCost,
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

            // Get order items for the day
            const dayOrderItems = await OrderItem.find({
              order_id: { $in: dayOrders.map(order => order._id) }
            });

            // Calculate product costs for the day
            const dayProductCosts = {};
            dayOrderItems.forEach(item => {
              if (!dayProductCosts[item.product_id]) {
                dayProductCosts[item.product_id] = 0;
              }
              dayProductCosts[item.product_id] += item.quantity;
            });

            // Get products to calculate cost
            const dayProducts = await Product.find({
              _id: { $in: Object.keys(dayProductCosts) }
            }).select('importPrice');

            let dayCost = 0;
            dayProducts.forEach(product => {
              dayCost += product.importPrice * dayProductCosts[product._id.toString()];
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
            const profit = revenue - dayCost - expense;

            return {
              period: date,
              revenue,
              cost: dayCost,
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

          // Get order items for the day
          const dayOrderItems = await OrderItem.find({
            order_id: { $in: dayOrders.map(order => order._id) }
          });

          // Calculate product costs for the day
          const dayProductCosts = {};
          dayOrderItems.forEach(item => {
            if (!dayProductCosts[item.product_id]) {
              dayProductCosts[item.product_id] = 0;
            }
            dayProductCosts[item.product_id] += item.quantity;
          });

          // Get products to calculate cost
          const dayProducts = await Product.find({
            _id: { $in: Object.keys(dayProductCosts) }
          }).select('importPrice');

          let dayCost = 0;
          dayProducts.forEach(product => {
            dayCost += product.importPrice * dayProductCosts[product._id.toString()];
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
          const profit = revenue - dayCost - expense;

          return {
            period: date,
            revenue,
            cost: dayCost,
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
            .select('name price importPrice images');
          
          // Tính toán chi phí và lãi
          const cost = product.importPrice * sales.quantity;
          const profit = sales.revenue - cost;
          const profitMargin = sales.revenue > 0 ? (profit / sales.revenue) * 100 : 0;
          
          return {
            product: product,
            quantity: sales.quantity,
            revenue: sales.revenue,
            cost: cost,
            profit: profit,
            profitMargin: profitMargin.toFixed(2) + '%'
          };
        })
    );

    // Calculate profit margin
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return res.status(200).json({
      summary: {
        totalRevenue,
        totalCost,
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

// Get detailed product profit information
const getProductProfitDetails = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    
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

    // Get order items
    const orderItems = await OrderItem.find({
      order_id: { $in: orders.map(order => order._id) }
    });

    // Group by product
    const productStats = {};
    orderItems.forEach(item => {
      if (!productStats[item.product_id]) {
        productStats[item.product_id] = {
          quantity: 0,
          revenue: 0,
          orders: []
        };
      }
      productStats[item.product_id].quantity += item.quantity;
      productStats[item.product_id].revenue += item.price * item.quantity;
      productStats[item.product_id].orders.push(item.order_id);
    });

    // Get products with import price
    const products = await Product.find({
      _id: { $in: Object.keys(productStats) }
    }).select('name price importPrice images category');

    // Calculate profit for each product
    const productProfitDetails = products.map(product => {
      const stats = productStats[product._id.toString()];
      const cost = product.importPrice * stats.quantity;
      const profit = stats.revenue - cost;
      const profitMargin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;
      
      return {
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          importPrice: product.importPrice,
          images: product.images,
          category: product.category
        },
        quantity: stats.quantity,
        revenue: stats.revenue,
        cost: cost,
        profit: profit,
        profitMargin: profitMargin.toFixed(2) + '%',
        orderCount: new Set(stats.orders).size
      };
    });

    // Sort by profit (descending)
    productProfitDetails.sort((a, b) => b.profit - a.profit);

    // Apply pagination
    const total = productProfitDetails.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedProducts = productProfitDetails.slice(startIndex, endIndex);

    return res.status(200).json({
      products: paginatedProducts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalProducts: total
    });
  } catch (error) {
    console.error("Error getting product profit details:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

module.exports = {
  getSalesStatistics,
  getFinancialStatistics,
  getProductProfitDetails
}; 