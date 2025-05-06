var mongoose = require('mongoose');
var size = require('../models/size.model');

const getAllSize = async (req, res) => {
    try {
        const sizes = await size.find();
        return res.status(200).json({
            data: sizes,
            msg: 'Lấy danh sách size thành công!'
        });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi lấy danh sách size',
            error
        });
    }
}

const createSize = async (req, res) => {
    try {
        const { name, description } = req.body;
        const checkSize = await size.findOne({ name });
        
        if (checkSize) {
            return res.status(400).json({ msg: 'Size đã tồn tại' });
        }
        if (!name || !description) {
            return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin' });
        }

        const newSize = new size({ name, description });
        await newSize.save();

        return res.status(201).json({
            msg: 'Thêm size thành công!',
            data: newSize
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            msg: 'Lỗi server khi thêm size',
            error
        });
    }
}

const updateSize = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({ msg: 'Vui lòng điền đầy đủ thông tin' });
        }

        const updatedSize = await size.findByIdAndUpdate(id, { name, description }, { new: true });

        if (!updatedSize) {
            return res.status(404).json({ msg: 'Không tìm thấy size' });
        }

        return res.status(200).json({
            msg: 'Cập nhật size thành công!',
            data: updatedSize
        });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi cập nhật size',
            error
        });
    }
}

const deleteSize = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedSize = await size.findByIdAndDelete(id);

        if (!deletedSize) {
            return res.status(404).json({ msg: 'Không tìm thấy size' });
        }

        return res.status(200).json({
            msg: 'Xoá size thành công!',
            data: deletedSize
        });
    } catch (error) {
        return res.status(500).json({
            msg: 'Lỗi server khi xoá size',
            error
        });
    }
}





module.exports = {
    getAllSize,
    createSize,
    updateSize,
    deleteSize
};