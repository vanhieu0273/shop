var mongoose = require('mongoose');
var Category = require('../models/category.model');

// Lấy danh sách toàn bộ category
const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        return res.status(200).json({
            data: categories,
            msg: 'Lấy danh sách category thành công!'
        });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi lấy danh sách category',
            error
        });
    }
};

// Tìm category theo ID
const getCategoryById = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ msg: 'Không tìm thấy category' });
        }
        return res.status(200).json({
            data: category,
            msg: 'Lấy thông tin category thành công'
        });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi tìm category',
            error
        });
    }
};

// Tạo mới category
const createCategory = async (req, res) => {
    try {
        const { name, image, description } = req.body;

        if (!name) {
            return res.status(400).json({ msg: 'Vui lòng điền tên' });
        }

        const newCategory = new Category({ name, image, description });
        await newCategory.save();

        return res.status(201).json({
            msg: 'Thêm category thành công!',
            data: newCategory
        });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi thêm category',
            error
        });
    }
};

// Cập nhật category
const updateCategory = async (req, res) => {
    try {
        const id = req.params.id;

        const updated = await Category.findByIdAndUpdate(
            id,
            { $set: req.body },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ msg: 'Không tìm thấy category để cập nhật' });
        }

        return res.status(200).json({
            msg: 'Cập nhật category thành công',
            data: updated
        });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi cập nhật category',
            error
        });
    }
};

// Xoá category
const deleteCategory = async (req, res) => {
    try {
        const id = req.params.id;
        await Category.findByIdAndDelete(id);
        return res.status(200).json({ msg: 'Xoá category thành công' });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi xoá category',
            error
        });
    }
};

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};
