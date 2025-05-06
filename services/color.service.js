var mongoose = require('mongoose');
var color = require('../models/color.model');



const getAllColor = async (req, res) => {
    try {
        const colors = await color.find();
        return res.status(200).json({
            data: colors,
            msg: 'Lấy danh sách màu sắc thành công!'
        });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi lấy danh sách màu sắc',
            error
        });
    }
}


const createColor = async (req, res) => {
    try {
        const { name, code } = req.body;
        const checkColor = await color.find({ name });
        if (checkColor.length > 0) {
            return res.status(400).json({ msg: 'Màu sắc đã tồn tại' });
        }
        if (!name || !code) {
            return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin' });
        }
        const newColor = new color({ name, code });
        await newColor.save();
        return res.status(201).json({
            msg: 'Thêm màu sắc thành công!',
            data: newColor
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg: 'Lỗi server khi thêm màu sắc',
            error
        });
    }
}


const updateColor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code } = req.body;
        if (!name || !code) {
            return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin' });
        }
        const updatedColor = await color.findByIdAndUpdate(id, { name, code }, { new: true });
        if (!updatedColor) {
            return res.status(404).json({ msg: 'Không tìm thấy màu sắc' });
        }
        return res.status(200).json({
            msg: 'Cập nhật màu sắc thành công!',
            data: updatedColor
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg: 'Lỗi server khi cập nhật màu sắc',
            error
        });
    }
}

const deleteColor = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedColor = await color.findByIdAndDelete(id);
        if (!deletedColor) {
            return res.status(404).json({ msg: 'Không tìm thấy màu sắc' });
        }
        return res.status(200).json({
            msg: 'Xóa màu sắc thành công!',
            data: deletedColor
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg: 'Lỗi server khi xóa màu sắc',
            error
        });
    }
}


module.exports = {
    getAllColor,
    createColor,
    updateColor,
    deleteColor
};