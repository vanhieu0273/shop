// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//   user_id: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: false
//   },
//   full_name: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   phone_number: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   address: {
//      province: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     district: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     ward: {
//       type: String,
//       required: true,
//       trim: true
//     },
//     specific_address: {
//       type: String,
//       required: true,
//       trim: trueAdd 
//     }
//   },
//   note: {
//     type: String,
//     trim: true
//   },
//   total_price: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   status: {
//     type: String,
//     enum: ['pending', 'waiting_payment', 'confirmed', 'shipped', 'delivered', 'cancelled'],
//     default: 'pending'
//   },
//   payment_method: {
//     type: String,
//     enum: ['cod', 'bank_transfer'],
//     required: true
//   },
//   payment_status: {
//     type: String,
//     enum: ['pending', 'completed', 'failed'],
//     default: 'pending'
//   },
//   bank_transfer_info: {
//     account_number: String,
//     account_name: String,
//     bank_name: String,
//     transfer_amount: Number,
//     transfer_content: String,
//     transfer_date: Date
//   }
// }, {
//   timestamps: {
//     createdAt: 'created_at',
//     updatedAt: 'updated_at'
//   }
// });

// // Indexes
// orderSchema.index({ user_id: 1 });
// orderSchema.index({ status: 1 });
// orderSchema.index({ payment_status: 1 });
// orderSchema.index({ created_at: -1 });

// module.exports = mongoose.model('Order', orderSchema); 
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  full_name: {
    type: String,
    required: true,
    trim: true
  },
  phone_number: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    province: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    ward: {
      type: String,
      required: true,
      trim: true
    },
    specific_address: {
      type: String,
      required: true,
      trim: true
    }
  },
  note: {
    type: String,
    trim: true
  },
  total_price: {
    type: Number,
    required: true,
    min: 0
  },
  shipping_fee: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'waiting_payment', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  payment_method: {
    type: String,
    enum: ['cod', 'bank_transfer'],
    required: true
  },
  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  bank_transfer_info: {
    account_number: String,
    account_name: String,
    bank_name: String,
    transfer_amount: Number,
    transfer_content: String,
    transfer_date: Date
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
orderSchema.index({ user_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payment_status: 1 });
orderSchema.index({ created_at: -1 });

module.exports = mongoose.model('Order', orderSchema); 