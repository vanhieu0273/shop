const Expense = require('../model/expense.model');
const { cloudinary } = require('../config/cloudinary');

// Create a new expense
const createExpense = async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      category,
      date,
      payment_method,
      receipt_image
    } = req.body;

    if (!title || !amount || !category || !payment_method) {
      return res.status(400).json({
        msg: "Thiếu thông tin bắt buộc"
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        msg: "Số tiền phải lớn hơn 0"
      });
    }

    const newExpense = new Expense({
      title,
      description,
      amount,
      category,
      date: date || new Date(),
      payment_method,
      receipt_image,
      created_by: req.user._id
    });

    await newExpense.save();

    return res.status(201).json({
      msg: "Thêm chi phí thành công",
      expense: newExpense
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Get all expenses with filtering and pagination
const getExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      category,
      payment_method,
      status,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Date filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Other filters
    if (category) query.category = category;
    if (payment_method) query.payment_method = payment_method;
    if (status) query.status = status;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const expenses = await Expense.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('created_by', 'firstName lastName');

    const total = await Expense.countDocuments(query);

    return res.status(200).json({
      expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Error getting expenses:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Get expense statistics
const getExpenseStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        dateFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.date.$lte = new Date(endDate);
      }
    }

    // Get all expenses within date range
    const expenses = await Expense.find({
      ...dateFilter,
      status: 'completed'
    });

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Get expenses by category
    const categoryStats = expenses.reduce((stats, expense) => {
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

    // Get expenses by payment method
    const paymentMethodStats = expenses.reduce((stats, expense) => {
      if (!stats[expense.payment_method]) {
        stats[expense.payment_method] = {
          count: 0,
          amount: 0
        };
      }
      stats[expense.payment_method].count++;
      stats[expense.payment_method].amount += expense.amount;
      return stats;
    }, {});

    // Get daily expenses for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyExpenses = await Promise.all(
      last7Days.map(async (date) => {
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setDate(endOfDay.getDate() + 1);

        const dayExpenses = await Expense.find({
          date: {
            $gte: startOfDay,
            $lt: endOfDay
          },
          status: 'completed'
        });

        const amount = dayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

        return {
          date,
          amount
        };
      })
    );

    return res.status(200).json({
      totalExpenses,
      categoryStats,
      paymentMethodStats,
      dailyExpenses
    });
  } catch (error) {
    console.error("Error getting expense statistics:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Update an expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        msg: "Không tìm thấy chi phí"
      });
    }

    // Update expense fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
        expense[key] = updateData[key];
      }
    });

    await expense.save();

    return res.status(200).json({
      msg: "Cập nhật chi phí thành công",
      expense
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Delete an expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({
        msg: "Không tìm thấy chi phí"
      });
    }

    // Delete receipt image from cloudinary if exists
    if (expense.receipt_image) {
      const publicId = expense.receipt_image.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await Expense.findByIdAndDelete(id);

    return res.status(200).json({
      msg: "Xóa chi phí thành công"
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getExpenseStatistics,
  updateExpense,
  deleteExpense
}; 