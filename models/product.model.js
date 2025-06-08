// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const productSchema = new Schema({
//   name: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   description: {
//     type: String,
//     required: true
//   },
//   price: {
//     type: Number,
//     required: true,
//     min: 0
//   },
//   discount: {
//     type: Number,
//     default: 0,
//     min: 0,
//     max: 100
//   },
//   images: [{
//     type: String,
//     required: true
//   }],
//   category: {
//     type: Schema.Types.ObjectId,
//     ref: 'Category',
//     required: true
//   },
//   variants: [{
//     color: {
//       type: Schema.Types.ObjectId,
//       ref: 'Color',
//       required: true
//     },
//     sizes: [{
//       size: {
//         type: Schema.Types.ObjectId,
//         ref: 'Size',
//         required: true
//       },
//       quantity: {
//         type: Number,
//         required: true,
//         min: 0
//       }
//     }]
//   }],
//   isActive: {
//     type: Boolean,
//     default: true
//   },
//   featured: {
//     type: Boolean,
//     default: false
//   },
//   rating: {
//     type: Number,
//     default: 0,
//     min: 0,
//     max: 5
//   },
//   reviews: [{
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true
//     },
//     rating: {
//       type: Number,
//       required: true,
//       min: 1,
//       max: 5
//     },
//     comment: String,
//     createdAt: {
//       type: Date,
//       default: Date.now
//     }
//   }]
// }, {
//   timestamps: true
// });

// // Tạo các index để tối ưu hiệu suất truy vấn
// productSchema.index({ name: 'text', description: 'text' }); // Index cho tìm kiếm text
// productSchema.index({ category: 1 }); // Index cho tìm kiếm theo danh mục
// productSchema.index({ isActive: 1 }); // Index cho lọc sản phẩm đang hoạt động
// productSchema.index({ featured: 1 }); // Index cho lọc sản phẩm nổi bật

// module.exports = mongoose.model('Product', productSchema);

const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  images: [{
    type: String,
    required: true
  }],
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  variants: [{
    color: {
      type: Schema.Types.ObjectId,
      ref: 'Color',
      required: true
    },
    sizes: [{
      size: {
        type: Schema.Types.ObjectId,
        ref: 'Size',
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 0
      }
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  sold_count: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviews: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Tạo các index để tối ưu hiệu suất truy vấn
productSchema.index({ name: 'text', description: 'text' }); // Index cho tìm kiếm text
productSchema.index({ category: 1 }); // Index cho tìm kiếm theo danh mục
productSchema.index({ isActive: 1 }); // Index cho lọc sản phẩm đang hoạt động
productSchema.index({ featured: 1 }); // Index cho lọc sản phẩm nổi bật
productSchema.index({ sold_count: -1 }); // Index cho việc sắp xếp theo số lượng bán

module.exports = mongoose.model('Product', productSchema);