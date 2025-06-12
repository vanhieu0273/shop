var express = require('express');
var router = express.Router();
const {registerUser, loginUser, updateInfoUser, deleteUser, getAllUser, forgotPassword, resetPassword} = require('../services/user.service')
const {authMiddleware} = require('../middlewares/auth.middleware')

router.post('/register', async (req, res, next) => registerUser(req, res)); 

router.post('/login', async (req, res, next) => loginUser(req, res)); 

router.put("/update/:id", authMiddleware, updateInfoUser);


router.delete("/delete/:id", authMiddleware, deleteUser);

router.get('/list-user' , getAllUser)

// Gửi OTP đến email để đặt lại mật khẩu
router.post('/forgot-password', forgotPassword);

// Nhập mã OTP và mật khẩu mới
router.post('/reset-password', resetPassword);

module.exports = router;
