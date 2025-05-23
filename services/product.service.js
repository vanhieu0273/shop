const Product = require('../models/product.model');
const Category = require('../models/category.model');
const Color = require('../models/color.model');
const Size = require('../models/size.model');
const { cloudinary } = require('../config/cloudinary');

// Create a new product
const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      discount,
      category,
      variants,
      isActive,
      featured,
      images
    } = req.body;


    if (!name || !description || !price || !category || !variants) {
      return res.status(400).json({
        msg: "Thiếu thông tin bắt buộc"
      });
    }

    if (name.length < 3 || name.length > 100) {
      return res.status(400).json({
        msg: "Tên sản phẩm phải từ 3 đến 100 ký tự"
      });
    }

    if (description.length < 10) {
      return res.status(400).json({
        msg: "Mô tả sản phẩm phải có ít nhất 10 ký tự"
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        msg: "Giá sản phẩm phải là số dương"
      });
    }

    if (discount && (isNaN(discount) || discount < 0 || discount > 100)) {
      return res.status(400).json({
        msg: "Giảm giá phải từ 0 đến 100%"
      });
    }

    if (!images || images.length === 0) {
      return res.status(400).json({
        msg: "Sản phẩm phải có ít nhất một hình ảnh"
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        msg: "Danh mục không tồn tại"
      });
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        msg: "Sản phẩm phải có ít nhất một biến thể"
      });
    }

    for (const variant of variants) {
      if (!variant.color) {
        return res.status(400).json({
          msg: "Mỗi biến thể phải có màu sắc"
        });
      }

      const colorExists = await Color.findById(variant.color);
      if (!colorExists) {
        return res.status(400).json({
          msg: `Màu sắc ${variant.color} không tồn tại`
        });
      }

      // Validate sizes
      if (!Array.isArray(variant.sizes) || variant.sizes.length === 0) {
        return res.status(400).json({
          msg: "Mỗi biến thể phải có ít nhất một kích thước"
        });
      }

      for (const size of variant.sizes) {
        if (!size.size || !size.quantity) {
          return res.status(400).json({
            msg: "Mỗi kích thước phải có size và số lượng"
          });
        }

        const sizeExists = await Size.findById(size.size);
        if (!sizeExists) {
          return res.status(400).json({
            msg: `Kích thước ${size.size} không tồn tại`
          });
        }

        if (isNaN(size.quantity) || size.quantity < 0) {
          return res.status(400).json({
            msg: "Số lượng phải là số không âm"
          });
        }
      }
    }

    // Check for duplicate product name
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        msg: "Tên sản phẩm đã tồn tại"
      });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      discount: discount || 0,
      images,
      category,
      variants,
      isActive: isActive !== undefined ? isActive : true,
      featured: featured || false
    });

    await newProduct.save();

    return res.status(201).json({
      msg: "Tạo sản phẩm thành công",
      product: newProduct
    });
  } catch (error) {
    console.error("Error creating product:", error);
    // If there's an error, delete uploaded images
    if (req.files) {
      for (const file of req.files) {
        await cloudinary.uploader.destroy(file.filename);
      }
    }
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Get all products with filtering and pagination
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      featured,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (featured !== undefined) query.featured = featured === 'true';
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('category')
      .populate('variants.color')
      .populate('variants.sizes.size');

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    console.error("Error getting products:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Get a single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('category')
      .populate('variants.color')
      .populate('variants.sizes.size')
      .populate('reviews.user');

    if (!product) {
      return res.status(404).json({
        msg: "Không tìm thấy sản phẩm"
      });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("Error getting product:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Update a product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        msg: "Không tìm thấy sản phẩm"
      });
    }

    // Update product fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
        product[key] = updateData[key];
      }
    });

    await product.save();

    return res.status(200).json({
      msg: "Cập nhật sản phẩm thành công",
      product
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        msg: "Không tìm thấy sản phẩm"
      });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      msg: "Xóa sản phẩm thành công"
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Add a review to a product
const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        msg: "Đánh giá không hợp lệ"
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        msg: "Không tìm thấy sản phẩm"
      });
    }

    // Check if user has already reviewed this product
    const existingReview = product.reviews.find(review => review.user.toString() === userId.toString());
    if (existingReview) {
      return res.status(400).json({
        msg: "Bạn đã đánh giá sản phẩm này"
      });
    }

    product.reviews.push({
      user: userId,
      rating,
      comment
    });

    // Update average rating
    const totalRating = product.reviews.reduce((sum, review) => sum + review.rating, 0);
    product.rating = totalRating / product.reviews.length;

    await product.save();

    return res.status(201).json({
      msg: "Thêm đánh giá thành công",
      product
    });
  } catch (error) {
    console.error("Error adding review:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Update product stock
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { colorId, sizeId, quantity } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        msg: "Không tìm thấy sản phẩm"
      });
    }

    const variant = product.variants.find(v => v.color.toString() === colorId);
    if (!variant) {
      return res.status(404).json({
        msg: "Không tìm thấy màu sản phẩm"
      });
    }

    const size = variant.sizes.find(s => s.size.toString() === sizeId);
    if (!size) {
      return res.status(404).json({
        msg: "Không tìm thấy kích thước sản phẩm"
      });
    }

    size.quantity = quantity;
    await product.save();

    return res.status(200).json({
      msg: "Cập nhật số lượng thành công",
      product
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addReview,
  updateStock
};