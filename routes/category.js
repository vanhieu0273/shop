const express = require("express");
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../services/category.service");

const { authMiddleware } = require("../middlewares/auth.middleware");

// Lấy toàn bộ category
router.get("/", getAllCategories);

// Lấy category theo ID
router.get("/:id", getCategoryById);

// Thêm category mới (yêu cầu đăng nhập)
router.post("/", authMiddleware, createCategory);

// Cập nhật category (yêu cầu đăng nhập)
router.put("/:id", authMiddleware, updateCategory);

// Xoá category (yêu cầu đăng nhập)
router.delete("/:id", authMiddleware, deleteCategory);

module.exports = router;
