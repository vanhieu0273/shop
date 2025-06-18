const express = require('express');
const router = express.Router();
const productService = require('../services/product.service');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { roleMiddleware } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createProductValidation, updateProductValidation, productIdValidation } = require('../validators/product.validator');
const { upload } = require('../config/cloudinary');

// danh sách sản phẩm bán chạy nhâts
router.get('/top-selling', productService.getTopSellingProducts);
router.get('/category/:categoryId', productService.getProductsByCategory);

// Public routes
router.get('/', productService.getProducts);
router.get('/:id',  validate(productIdValidation), productService.getProductById);
router.get('/:id/reviews', validate(productIdValidation), productService.getProductReviews);
// Protected routes (require authentication)
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  validate(createProductValidation),
  productService.createProduct
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  upload.array('images', 5), // Allow up to 5 images
  validate(updateProductValidation),
  productService.updateProduct
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  validate(productIdValidation),
  productService.deleteProduct
);

// Protected routes for reviews and stock
router.post(
  '/:id/reviews',
  authMiddleware,
  validate(productIdValidation),
  productService.addReview
);

router.put(
  '/:id/stock',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  validate(productIdValidation),
  productService.updateStock
);

router.put(
  '/:id/import-price',
  authMiddleware,
  roleMiddleware(['admin', 'manager']),
  validate(productIdValidation),
  productService.updateImportPrice
);

module.exports = router;