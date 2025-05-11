const { body, param } = require('express-validator');
const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Color = require('../models/color.model');
const Size = require('../models/size.model');

// Validation rules for creating a product
const createProductValidation = [
  // Name validation
  body('name')
    .notEmpty()
    .withMessage('Tên sản phẩm là bắt buộc')
    .isLength({ min: 3, max: 100 })
    .withMessage('Tên sản phẩm phải từ 3 đến 100 ký tự')
    .custom(async (value) => {
      const product = await Product.findOne({ name: value });
      if (product) {
        throw new Error('Tên sản phẩm đã tồn tại');
      }
      return true;
    }),

  // Description validation
  body('description')
    .notEmpty()
    .withMessage('Mô tả sản phẩm là bắt buộc')
    .isLength({ min: 10 })
    .withMessage('Mô tả sản phẩm phải có ít nhất 10 ký tự'),

  // Price validation
  body('price')
    .notEmpty()
    .withMessage('Giá sản phẩm là bắt buộc')
    .isFloat({ min: 0 })
    .withMessage('Giá sản phẩm phải là số dương'),

  // Discount validation
  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Giảm giá phải từ 0 đến 100%'),

  // Images validation
  body('images')
    .isArray({ min: 1 })
    .withMessage('Sản phẩm phải có ít nhất một hình ảnh')
    .custom((value) => {
      // Validate each image URL
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      return value.every(url => urlRegex.test(url));
    })
    .withMessage('URL hình ảnh không hợp lệ'),

  // Category validation
  body('category')
    .notEmpty()
    .withMessage('Danh mục là bắt buộc')
    .isMongoId()
    .withMessage('ID danh mục không hợp lệ')
    .custom(async (value) => {
      const category = await Category.findById(value);
      if (!category) {
        throw new Error('Danh mục không tồn tại');
      }
      return true;
    }),

  // Variants validation
  body('variants')
    .isArray({ min: 1 })
    .withMessage('Sản phẩm phải có ít nhất một biến thể')
    .custom(async (value) => {
      for (const variant of value) {
        // Validate color
        if (!variant.color) {
          throw new Error('Mỗi biến thể phải có màu sắc');
        }

        const color = await Color.findById(variant.color);
        if (!color) {
          throw new Error(`Màu sắc ${variant.color} không tồn tại`);
        }

        // Validate sizes
        if (!Array.isArray(variant.sizes) || variant.sizes.length === 0) {
          throw new Error('Mỗi biến thể phải có ít nhất một kích thước');
        }

        for (const size of variant.sizes) {
          if (!size.size || !size.quantity) {
            throw new Error('Mỗi kích thước phải có size và số lượng');
          }

          const sizeExists = await Size.findById(size.size);
          if (!sizeExists) {
            throw new Error(`Kích thước ${size.size} không tồn tại`);
          }

          if (isNaN(size.quantity) || size.quantity < 0) {
            throw new Error('Số lượng phải là số không âm');
          }
        }
      }
      return true;
    }),

  // Active status validation
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái hoạt động phải là true hoặc false'),

  // Featured status validation
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Trạng thái nổi bật phải là true hoặc false')
];

// Validation rules for updating a product
const updateProductValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID sản phẩm không hợp lệ')
    .custom(async (value) => {
      const product = await Product.findById(value);
      if (!product) {
        throw new Error('Sản phẩm không tồn tại');
      }
      return true;
    }),

  // Optional validations for update
  body('name')
    .optional()
    .isLength({ min: 3, max: 100 })
    .withMessage('Tên sản phẩm phải từ 3 đến 100 ký tự')
    .custom(async (value, { req }) => {
      const product = await Product.findOne({ name: value, _id: { $ne: req.params.id } });
      if (product) {
        throw new Error('Tên sản phẩm đã tồn tại');
      }
      return true;
    }),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá sản phẩm phải là số dương'),

  body('discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Giảm giá phải từ 0 đến 100%'),

  body('images')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Sản phẩm phải có ít nhất một hình ảnh')
    .custom((value) => {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      return value.every(url => urlRegex.test(url));
    })
    .withMessage('URL hình ảnh không hợp lệ'),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('ID danh mục không hợp lệ')
    .custom(async (value) => {
      const category = await Category.findById(value);
      if (!category) {
        throw new Error('Danh mục không tồn tại');
      }
      return true;
    })
];

// Validation rules for product ID
const productIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('ID sản phẩm không hợp lệ')
    .custom(async (value) => {
      const product = await Product.findById(value);
      if (!product) {
        throw new Error('Sản phẩm không tồn tại');
      }
      return true;
    })
];

module.exports = {
  createProductValidation,
  updateProductValidation,
  productIdValidation
}; 