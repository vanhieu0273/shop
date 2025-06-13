const mongoose = require('mongoose');
const { Schema } = mongoose;

const expenseSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'rent',           // Tiền thuê mặt bằng
      'utilities',      // Tiện ích (điện, nước, internet)
      'salary',         // Lương nhân viên
      'inventory',      // Nhập hàng
      'marketing',      // Marketing, quảng cáo
      'maintenance',    // Bảo trì, sửa chữa
      'tax',           // Thuế
      'other'          // Chi phí khác
    ]
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  payment_method: {
    type: String,
    required: true,
    enum: ['cash', 'bank_transfer', 'credit_card']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  receipt_image: {
    type: String,  // URL của hình ảnh hóa đơn/biên lai
    trim: true
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ created_by: 1 });

module.exports = mongoose.model('Expense', expenseSchema); 