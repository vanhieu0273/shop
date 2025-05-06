const mongoose = require('mongoose');

const colorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true // tránh trùng tên màu
  },
  code: {
    type: String,
    required: true,
    match: /^#([0-9A-Fa-f]{6})$/, // kiểm tra đúng định dạng mã HEX
    unique: true // tránh trùng mã màu
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Color', colorSchema);