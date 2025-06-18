const Order = require("../models/order.model");
const OrderItem = require("../models/orderItem.model");
const Product = require("../models/product.model");
const Color = require("../models/color.model");
const Size = require("../models/size.model");

// Validate cart items before payment
const validateCartItems = async (cartItems) => {
  const validationResults = {
    isValid: true,
    errors: [],
    updatedItems: [],
  };

  for (const item of cartItems) {
    try {
      const product = await Product.findById(item.product_id);

      if (!product) {
        validationResults.isValid = false;
        validationResults.errors.push(`Sản phẩm "${item.name}" không tồn tại`);
        continue;
      }

      // Check if product is active
      if (!product.isActive) {
        validationResults.isValid = false;
        validationResults.errors.push(
          `Sản phẩm "${item.name}" đã ngừng kinh doanh`
        );
        continue;
      }

      // Check price changes
      if (product.price !== item.price) {
        validationResults.isValid = false;
        validationResults.errors.push(
          `Giá sản phẩm "${item.name}" đã thay đổi từ ${item.price} thành ${product.price}`
        );
      }

      // Check stock
      const variant = product.variants.find(
        (v) =>
          v.color.toString() === item.color &&
          v.sizes.some((s) => s.size.toString() === item.size)
      );

      if (!variant) {
        validationResults.isValid = false;
        validationResults.errors.push(
          `Sản phẩm "${item.name}" không còn màu hoặc size này`
        );
        continue;
      }

      const sizeStock = variant.sizes.find(
        (s) => s.size.toString() === item.size
      );
      if (!sizeStock || sizeStock.quantity < item.quantity) {
        validationResults.isValid = false;
        validationResults.errors.push(
          `Sản phẩm "${item.name}" chỉ còn ${sizeStock?.quantity || 0} sản phẩm`
        );
        continue;
      }

      // Add updated item info
      validationResults.updatedItems.push({
        product_id: product._id,
        name: product.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: product.price,
        available_quantity: sizeStock.quantity,
      });
    } catch (error) {
      validationResults.isValid = false;
      validationResults.errors.push(
        `Lỗi khi kiểm tra sản phẩm "${item.name}": ${error.message}`
      );
    }
  }

  return validationResults;
};

// Process complete payment flow
const processPayment = async (paymentData) => {
  try {
    // Validate required data
    if (
      !paymentData.cartItems ||
      !paymentData.shippingInfo ||
      !paymentData.paymentMethod
    ) {
      throw new Error("Missing required payment information");
    }

    const { cartItems, shippingInfo, paymentMethod } = paymentData;

    // Validate payment method
    if (!["cod", "bank_transfer"].includes(paymentMethod)) {
      throw new Error(
        "Invalid payment method. Only COD and bank transfer are supported"
      );
    }

    // Validate shipping info
    if (
      !shippingInfo.province ||
      !shippingInfo.district ||
      !shippingInfo.ward ||
      !shippingInfo.specific_address
    ) {
      throw new Error("Missing required shipping information");
    }

    // Validate cart items
    const validationResults = await validateCartItems(cartItems);
    console.log("validationResults", validationResults);

    if (!validationResults.isValid) {
      return {
        status: "error",
        message: "Có lỗi xảy ra khi kiểm tra giỏ hàng",
        errors: validationResults.errors,
        updatedItems: validationResults.updatedItems,
      };
    }

    // Step 1: Calculate total price with updated prices
    const totalPrice = validationResults.updatedItems.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    // Calculate shipping fee (20k for orders outside Hanoi)
    const shippingFee =
      shippingInfo.province.toLowerCase() !== "hà nội" ? 20000 : 0;

    // Step 2: Create order with initial status
    const orderData = {
      user_id: shippingInfo.user_id,
      full_name: shippingInfo.full_name,
      phone_number: shippingInfo.phone_number,
      address: {
        province: shippingInfo.province,
        district: shippingInfo.district,
        ward: shippingInfo.ward,
        specific_address: shippingInfo.specific_address,
      },
      note: shippingInfo.note,
      total_price: totalPrice + shippingFee,
      shipping_fee: shippingFee,
      payment_method: paymentMethod,
      status: paymentMethod === "cod" ? "pending" : "waiting_payment",
      payment_status: "pending",
    };

    // Add bank transfer info if payment method is bank transfer
    if (paymentMethod === "bank_transfer") {
      orderData.bank_transfer_info = {
        account_number: "666666",
        account_name: "PHUNG VAN HIEU",
        bank_name: "MB Bank",
        transfer_amount: totalPrice + shippingFee,
        transfer_content: `Thanh toan don hang ${Date.now()}`,
      };
    }

    const order = await Order.create(orderData);

    // Create order items with updated prices
    const orderItems = validationResults.updatedItems.map((item) => ({
      order_id: order._id,
      product_id: item.product_id,
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      price: item.price,
    }));

    await OrderItem.insertMany(orderItems);

    // Update product stock and sold count
    for (const item of validationResults.updatedItems) {
      await Product.updateOne(
        {
          _id: item.product_id,
          "variants.color": item.color,
          "variants.sizes.size": item.size,
        },
        {
          $inc: {
            "variants.$[v].sizes.$[s].quantity": -item.quantity,
            sold_count: item.quantity,
          },
        },
        {
          arrayFilters: [{ "v.color": item.color }, { "s.size": item.size }],
        }
      );
    }

    // Step 3: Process payment based on method
    let paymentResult;
    if (paymentMethod === "cod") {
      paymentResult = {
        status: "pending",
        message: "Thanh toán khi nhận hàng",
        orderStatus: "pending",
      };
    } else {
      paymentResult = {
        status: "waiting_payment",
        message: "Vui lòng chuyển khoản theo thông tin sau",
        bankDetails: order.bank_transfer_info,
        orderStatus: "waiting_payment",
      };
    }

    return {
      orderId: order._id,
      status: "success",
      message: "Đơn hàng đã được tạo thành công",
      totalPrice: totalPrice + shippingFee,
      shippingFee,
      payment: paymentResult,
      orderStatus: paymentResult.orderStatus,
    };
  } catch (error) {
    throw new Error("Error processing payment: " + error.message);
  }
};

// Update order status
const updateOrderStatus = async (orderId, status) => {
  try {
    const validStatuses = [
      "pending",
      "waiting_payment",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid order status");
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      {
        status,
        // Update payment status if order is delivered
        ...(status === "delivered" && { payment_status: "completed" }),
      },
      { new: true }
    );

    if (!order) {
      throw new Error("Order not found");
    }

    return {
      orderId: order._id,
      status: order.status,
      payment_status: order.payment_status,
      message: "Order status updated successfully",
    };
  } catch (error) {
    throw new Error("Error updating order status: " + error.message);
  }
};

// Update payment status
const updatePaymentStatus = async (
  orderId,
  paymentStatus,
  bankTransferInfo = null
) => {
  try {
    const validPaymentStatuses = ["pending", "completed", "failed"];
    if (!validPaymentStatuses.includes(paymentStatus)) {
      throw new Error("Invalid payment status");
    }

    const updateData = { payment_status: paymentStatus };
    if (bankTransferInfo) {
      updateData.bank_transfer_info = {
        ...bankTransferInfo,
        transfer_date: new Date(),
      };
    }

    const order = await Order.findByIdAndUpdate(orderId, updateData, {
      new: true,
    });

    if (!order) {
      throw new Error("Order not found");
    }

    return {
      orderId: order._id,
      status: order.status,
      payment_status: order.payment_status,
      message: "Payment status updated successfully",
    };
  } catch (error) {
    throw new Error("Error updating payment status: " + error.message);
  }
};

// Get user's previous addresses
const getUserAddresses = async (userId) => {
  try {
    const orders = await Order.find({
      user_id: userId,
      address: { $ne: null },
    })
      .select("address")
      .distinct("address")
      .limit(5);

    return orders;
  } catch (error) {
    throw new Error("Error fetching user addresses: " + error.message);
  }
};

// Get order details
const getOrderDetails = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const orderItems = await OrderItem.find({ order_id: orderId });

    // Get color, size and image information for each order item
    const itemsWithDetails = await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findById(item.product_id);
        if (!product) {
          return item;
        }

        const variant = product.variants.find(
          (v) => v.color.toString() === item.color
        );
        const colorInfo = variant ? await Color.findById(variant.color) : null;
        const sizeInfo = variant ? await Size.findById(item.size) : null;

        return {
          ...item.toObject(),
          color_name: colorInfo ? colorInfo.name : "Unknown",
          color_code: colorInfo ? colorInfo.code : "#000000",
          size_name: sizeInfo ? sizeInfo.name : "Unknown",
          images: product.images || [],
          product_name: product.name,
          product_description: product.description,
          product_price: product.price,
          product_discount: product.discount,
        };
      })
    );

    return {
      order,
      items: itemsWithDetails,
    };
  } catch (error) {
    throw new Error("Error fetching order details: " + error.message);
  }
};
/////////////////////////////////////////////////////////////////////////
const getAllOrders = async (page = 1, limit = 10, filters = {}) => {
  try {
    const query = {};

    // Thêm filter nếu cần
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.payment_status) {
      query.payment_status = filters.payment_status;
    }
    if (filters.startDate && filters.endDate) {
      query.created_at = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("_id full_name created_at total_price status payment_status");

    // Đổi tên trường cho dễ hiểu nếu cần
    const ordersFormatted = orders.map((order) => ({
      order_id: order._id,
      customer: order.full_name,
      created_at: order.created_at,
      total_price: order.total_price,
      status: order.status,
      payment_status: order.payment_status,
    }));

    return {
      orders: ordersFormatted,
      pagination: {
        total: totalOrders,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  } catch (error) {
    throw new Error("Error fetching all orders: " + error.message);
  }
};
////////////////////////////////////////////////////////////////////////////////////
// Get user's order history
const getUserOrders = async (userId) => {
  try {
    const orders = await Order.find({ user_id: userId }).sort({
      created_at: -1,
    }); // Sắp xếp theo thời gian tạo mới nhất
    // .populate({
    //   path: 'items',
    //   populate: {
    //     path: 'product_id',
    //     select: 'name images price discount'
    //   }
    // });

    // Lấy chi tiết sản phẩm cho mỗi đơn hàng
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await OrderItem.find({ order_id: order._id });

        // Lấy thông tin chi tiết sản phẩm cho mỗi item
        const itemsWithDetails = await Promise.all(
          orderItems.map(async (item) => {
            const product = await Product.findById(item.product_id);
            if (!product) {
              return item;
            }

            const variant = product.variants.find(
              (v) => v.color.toString() === item.color
            );
            const colorInfo = variant
              ? await Color.findById(variant.color)
              : null;
            const sizeInfo = variant ? await Size.findById(item.size) : null;

            return {
              ...item.toObject(),
              color_name: colorInfo ? colorInfo.name : "Unknown",
              color_code: colorInfo ? colorInfo.code : "#000000",
              size_name: sizeInfo ? sizeInfo.name : "Unknown",
              product_name: product.name,
              product_images: product.images,
              product_price: product.price,
              product_discount: product.discount,
            };
          })
        );

        return {
          ...order.toObject(),
          items: itemsWithDetails,
        };
      })
    );

    return ordersWithDetails;
  } catch (error) {
    throw new Error("Error fetching user orders: " + error.message);
  }
};

// Get user's order history with pagination and filters
const getUserOrdersWithFilters = async (
  userId,
  filters = {},
  page = 1,
  limit = 10
) => {
  try {
    const query = { user_id: userId };

    // Add status filter if provided
    if (filters.status) {
      query.status = filters.status;
    }

    // Add date range filter if provided
    if (filters.startDate && filters.endDate) {
      query.created_at = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    // Add payment method filter if provided
    if (filters.paymentMethod) {
      query.payment_method = filters.paymentMethod;
    }

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get order items and details
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const orderItems = await OrderItem.find({ order_id: order._id });

        const itemsWithDetails = await Promise.all(
          orderItems.map(async (item) => {
            const product = await Product.findById(item.product_id);
            if (!product) {
              return item;
            }

            const variant = product.variants.find(
              (v) => v.color.toString() === item.color
            );
            const colorInfo = variant
              ? await Color.findById(variant.color)
              : null;
            const sizeInfo = variant ? await Size.findById(item.size) : null;

            return {
              ...item.toObject(),
              color_name: colorInfo ? colorInfo.name : "Unknown",
              color_code: colorInfo ? colorInfo.code : "#000000",
              size_name: sizeInfo ? sizeInfo.name : "Unknown",
              product_name: product.name,
              product_images: product.images,
              product_price: product.price,
              product_discount: product.discount,
            };
          })
        );

        return {
          ...order.toObject(),
          items: itemsWithDetails,
        };
      })
    );

    return {
      orders: ordersWithDetails,
      pagination: {
        total: totalOrders,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  } catch (error) {
    throw new Error(
      "Error fetching user orders with filters: " + error.message
    );
  }
};

// Get order statistics for user
const getUserOrderStatistics = async (userId) => {
  try {
    const totalOrders = await Order.countDocuments({ user_id: userId });
    const totalSpent = await Order.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: null, total: { $sum: "$total_price" } } },
    ]);

    const ordersByStatus = await Order.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const ordersByPaymentMethod = await Order.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: "$payment_method", count: { $sum: 1 } } },
    ]);

    return {
      totalOrders,
      totalSpent: totalSpent[0]?.total || 0,
      ordersByStatus: ordersByStatus.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      ordersByPaymentMethod: ordersByPaymentMethod.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };
  } catch (error) {
    throw new Error("Error fetching user order statistics: " + error.message);
  }
};

module.exports = {
  processPayment,
  updateOrderStatus,
  updatePaymentStatus,
  getUserAddresses,
  getOrderDetails,
  getUserOrders,
  getUserOrdersWithFilters,
  getUserOrderStatistics,
  getAllOrders,
};
