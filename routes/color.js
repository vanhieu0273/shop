var express = require('express');
var router = express.Router();

const {getAllColor, createColor, updateColor, deleteColor} = require('../services/color.service')


router.get('/list-color', async (req, res, next) => getAllColor(req, res));
router.post('/create-color', async (req, res, next) => createColor(req, res));
router.put('/update-color/:id', async (req, res, next) => updateColor(req, res));
router.delete('/delete-color/:id', async (req, res, next) => deleteColor(req, res));


module.exports = router;


  // [
  //   { "name": "Đen", "code": "#000000" },
  //   { "name": "Trắng", "code": "#FFFFFF" },
  //   { "name": "Xám sáng", "code": "#C0C0C0" },
  //   { "name": "Xám đậm", "code": "#4B4B4B" },
  //   { "name": "Đỏ tươi", "code": "#FF0000" },
  //   { "name": "Đỏ đô", "code": "#800000" },
  //   { "name": "Xanh dương", "code": "#0000FF" },
  //   { "name": "Xanh navy", "code": "#1A237E" },
  //   { "name": "Xanh rêu", "code": "#4B5320" },
  //   { "name": "Xanh ngọc", "code": "#00CED1" },
  //   { "name": "Vàng chanh", "code": "#F5E050" },
  //   { "name": "Vàng", "code": "#FFFF00" },
  //   { "name": "Vàng cam", "code": "#FFA500" },
  //   { "name": "Cam", "code": "#FF4500" },
  //   { "name": "Hồng", "code": "#FF69B4" },
  //   { "name": "Hồng nhạt", "code": "#FFB6C1" },
  //   { "name": "Tím", "code": "#800080" },
  //   { "name": "Tím nhạt", "code": "#E6E6FA" },
  //   { "name": "Nâu", "code": "#8B4513" },
  //   { "name": "Be", "code": "#F5F5DC" }
  // ]