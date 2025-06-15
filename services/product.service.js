const Product = require("../models/product.model");
const Category = require("../models/category.model");
const Color = require("../models/color.model");
const Size = require("../models/size.model");
const { cloudinary } = require("../config/cloudinary");
const OrderItem = require("../models/orderItem.model");
const Order = require("../models/order.model");
const User = require("../models/user.model");

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
      images,
    } = req.body;

    if (!name || !description || !price || !category || !variants) {
      return res.status(400).json({
        msg: "Thiếu thông tin bắt buộc",
      });
    }

    if (name.length < 3 || name.length > 100) {
      return res.status(400).json({
        msg: "Tên sản phẩm phải từ 3 đến 100 ký tự",
      });
    }

    if (description.length < 10) {
      return res.status(400).json({
        msg: "Mô tả sản phẩm phải có ít nhất 10 ký tự",
      });
    }

    if (isNaN(price) || price <= 0) {
      return res.status(400).json({
        msg: "Giá sản phẩm phải là số dương",
      });
    }

    if (discount && (isNaN(discount) || discount < 0 || discount > 100)) {
      return res.status(400).json({
        msg: "Giảm giá phải từ 0 đến 100%",
      });
    }

    if (!images || images.length === 0) {
      return res.status(400).json({
        msg: "Sản phẩm phải có ít nhất một hình ảnh",
      });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        msg: "Danh mục không tồn tại",
      });
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        msg: "Sản phẩm phải có ít nhất một biến thể",
      });
    }

    for (const variant of variants) {
      if (!variant.color) {
        return res.status(400).json({
          msg: "Mỗi biến thể phải có màu sắc",
        });
      }

      const colorExists = await Color.findById(variant.color);
      if (!colorExists) {
        return res.status(400).json({
          msg: `Màu sắc ${variant.color} không tồn tại`,
        });
      }

      // Validate sizes
      if (!Array.isArray(variant.sizes) || variant.sizes.length === 0) {
        return res.status(400).json({
          msg: "Mỗi biến thể phải có ít nhất một kích thước",
        });
      }

      for (const size of variant.sizes) {
        if (!size.size || !size.quantity) {
          return res.status(400).json({
            msg: "Mỗi kích thước phải có size và số lượng",
          });
        }

        const sizeExists = await Size.findById(size.size);
        if (!sizeExists) {
          return res.status(400).json({
            msg: `Kích thước ${size.size} không tồn tại`,
          });
        }

        if (isNaN(size.quantity) || size.quantity < 0) {
          return res.status(400).json({
            msg: "Số lượng phải là số không âm",
          });
        }
      }
    }

    // Check for duplicate product name
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return res.status(400).json({
        msg: "Tên sản phẩm đã tồn tại",
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
      featured: featured || false,
    });

    await newProduct.save();

    return res.status(201).json({
      msg: "Tạo sản phẩm thành công",
      product: newProduct,
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
      msg: "Lỗi server",
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
      color,
      sizes,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (featured !== undefined) query.featured = featured === "true";
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (search) {
      query.$text = { $search: search };
    }

    if (color) {
      query["variants.color"] = color;
    }

    if (sizes) {
      console.log("size", sizes);

      const sizeArray = Array.isArray(sizes) ? sizes : [sizes];
      query["variants.sizes.size"] = { $in: sizeArray };
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .populate("variants.color")
      .populate("variants.sizes.size");

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error getting products:", error);
    return res.status(500).json({
      msg: "Lỗi server",
    });
  }
};

// Get a single product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id; // Get user ID if authenticated

    const product = await Product.findById(id)
      .populate("category")
      .populate("variants.color")
      .populate("variants.sizes.size")
      .populate("reviews.user");

    if (!product) {
      return res.status(404).json({
        msg: "Không tìm thấy sản phẩm",
      });
    }
    ///////////////////////////////////////////////////

    // Check if user can review the productAdd commentMore actions
    let canReview = false;
    if (userId) {
      // Check if user has already reviewed
      const hasReviewed = product.reviews.some(
        (review) => review.user._id.toString() === userId.toString()
      );

      if (!hasReviewed) {
        // Check if user has purchased and received the product
        const orderItem = await OrderItem.findOne({
          product_id: id,
          order_id: {
            $in: await Order.find({
              user_id: userId,
              status: "delivered",
              payment_status: "completed",
            }).distinct("_id"),
          },
        });
        canReview = !!orderItem;
      }
    }


const relatedProducts = await Product.find({
  category: product.category._id,
  _id: { $ne: id } 
})
  .limit(5) 
  .populate("category") 
  .populate("variants.color")
  .populate("variants.sizes.size"); 

    const productResponse = product.toObject();
    productResponse.canReview = canReview;
    productResponse.relatedProducts = relatedProducts;

    return res.status(200).json(productResponse);

  } catch (error) {
    console.error("Error getting product:", error);
    return res.status(500).json({
      msg: "Lỗi server",
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
        msg: "Không tìm thấy sản phẩm",
      });
    }

    // Update product fields
    Object.keys(updateData).forEach((key) => {
      if (key !== "_id" && key !== "createdAt" && key !== "updatedAt") {
        product[key] = updateData[key];
      }
    });

    await product.save();

    return res.status(200).json({
      msg: "Cập nhật sản phẩm thành công",
      product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      msg: "Lỗi server",
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
        msg: "Không tìm thấy sản phẩm",
      });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      msg: "Xóa sản phẩm thành công",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      msg: "Lỗi server",
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
        msg: "Đánh giá không hợp lệ",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        msg: "Không tìm thấy sản phẩm",
      });
    }

    // Check if user has purchased the productAdd commentMore actions
    const orderItem = await OrderItem.findOne({
      product_id: id,
      order_id: {
        $in: await Order.find({
          user_id: userId,
          status: 'delivered',
          payment_status: 'completed'
        }).distinct('_id')
      }
    });

    if (!orderItem) {
      return res.status(403).json({
        msg: "Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua và nhận được hàng"
      });
    }

    // Check if user has already reviewed this product
    const existingReview = product.reviews.find(
      (review) => review.user.toString() === userId.toString()
    );
    if (existingReview) {
      return res.status(400).json({
        msg: "Bạn đã đánh giá sản phẩm này",
      });
    }

    product.reviews.push({
      user: userId,
      rating,
      comment,
    });

    // Update average rating
    const totalRating = product.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    product.rating = totalRating / product.reviews.length;

    await product.save();

    return res.status(201).json({
      msg: "Thêm đánh giá thành công",
      product,
    });
  } catch (error) {
    console.error("Error adding review:", error);
    return res.status(500).json({
      msg: "Lỗi server",
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
        msg: "Không tìm thấy sản phẩm",
      });
    }

    const variant = product.variants.find(
      (v) => v.color.toString() === colorId
    );
    if (!variant) {
      return res.status(404).json({
        msg: "Không tìm thấy màu sản phẩm",
      });
    }

    const size = variant.sizes.find((s) => s.size.toString() === sizeId);
    if (!size) {
      return res.status(404).json({
        msg: "Không tìm thấy kích thước sản phẩm",
      });
    }

    size.quantity = quantity;
    await product.save();

    return res.status(200).json({
      msg: "Cập nhật số lượng thành công",
      product,
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    return res.status(500).json({
      msg: "Lỗi server",
    });
  }
};

// Get products that are on sale (have discount > 0)
const getProductsOnSale = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "discount",
      sortOrder = "desc",
    } = req.query;

    const query = {
      discount: { $gt: 0 },
      isActive: true,
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .populate("variants.color")
      .populate("variants.sizes.size");

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error getting products on sale:", error);
    return res.status(500).json({
      msg: "Lỗi server",
    });
  }
};

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {
      category: categoryId,
      isActive: true,
    };

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const products = await Product.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")
      .populate("variants.color")
      .populate("variants.sizes.size");

    const total = await Product.countDocuments(query);

    return res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("Error getting products by category:", error);
    return res.status(500).json({
      msg: "Lỗi server",
    });
  }
};

// Get product reviews with pagination and filteringAdd commentMore actions
const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        msg: "Không tìm thấy sản phẩm"
      });
    }

    // Build query for reviews
    let reviews = [...product.reviews];

    // Filter by rating if provided
    if (rating) {
      reviews = reviews.filter(review => review.rating === parseInt(rating));
    }

    // Sort reviews
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    reviews.sort((a, b) => {
      if (sortBy === 'rating') {
        return sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating;
      }
      return sortOrder === 'desc' 
        ? new Date(b[sortBy]) - new Date(a[sortBy])
        : new Date(a[sortBy]) - new Date(b[sortBy]);
    });

    // Calculate pagination
    const total = reviews.length;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedReviews = reviews.slice(startIndex, endIndex);

    // Populate user information for reviews
    const populatedReviews = await Promise.all(
      paginatedReviews.map(async (review) => {
        const user = await User.findById(review.user).select('firstName lastName');
        return {
          ...review.toObject(),
          user: user || { firstName: 'Unknown', lastName: 'User' }
        };
      })
    );

    // Calculate rating statistics
    const ratingStats = reviews.reduce((stats, review) => {
      stats[review.rating] = (stats[review.rating] || 0) + 1;
      return stats;
    }, {});

    return res.status(200).json({
      reviews: populatedReviews,
      totalReviews: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      ratingStats,
      averageRating: product.ratingAdd
    });
  } catch (error) {
    console.error("Error getting product reviews:", error);
    return res.status(500).json({
      msg: "Lỗi server"
    });
  }
};

// Get top selling products
const getTopSellingProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5; // Mặc định lấy 5 sản phẩm

    // Tìm sản phẩm bán chạy nhất
    let products = await Product.find({ isActive: true })
      .sort({ sold_count: -1 })
      .limit(limit)
      .populate("category")
      .populate("variants.color")
      .populate("variants.sizes.size");

    // Nếu không có sản phẩm nào được bán (sold_count = 0), lấy 5 sản phẩm mới nhất
    if (products.length === 0 || products.every((p) => p.sold_count === 0)) {
      products = await Product.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("category")
        .populate("variants.color")
        .populate("variants.sizes.size");
    }

    return res.status(200).json({
      products: products.map((product) => ({
        _id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        discount: product.discount,
        images: product.images,
        sold_count: product.sold_count,
        category: product.category,
        variants: product.variants,
        rating: product.rating,
      })),
    });
  } catch (error) {
    console.error("Error getting top selling products:", error);
    return res.status(500).json({
      msg: "Lỗi server",
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
  updateStock,
  getProductsOnSale,
  getProductsByCategory,
  getTopSellingProducts,
  getProductReviews

};
