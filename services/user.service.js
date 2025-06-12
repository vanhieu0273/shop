var mongoose = require('mongoose');
var User = require('../models/user.model');
var bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const registerUser = async (req, res) => {
    console.log("registerUser");

    try {

        const { p_userName, p_fullName, p_email, p_phoneNumber, p_password } = req.body;

        console.log(res.body);


        if (!p_userName || !p_fullName || !p_email || !p_password) {
            return res.status(400).json({ msg: "Chưa đúng định dạng" });
        }

        const checkExitUser = await User.findOne({
            $or: [
                { userName: p_userName },
                { email: p_email },
                { phoneNumber: p_phoneNumber }
            ]
        });

        if (checkExitUser) {
            return res.status(400).json({ msg: "Thông tin đã được tồn tại" });
        }

        const hashedPassword = await bcrypt.hash(p_password, 10);

        const newUser = new User({
            userName: p_userName,
            fullName: p_fullName,
            email: p_email,
            phoneNumber: p_phoneNumber,
            password: hashedPassword
        })

        await newUser.save();

        return res.status(200).json({ msg: "Đăng ký thành công!" });

    } catch (error) {
        return res.status(500).json({ msg: "Lỗi server" });
    }
}


const loginUser = async (req, res) => {
    try {
        const { p_userName, p_password } = req.body;
        console.log(p_userName, p_password);
        
        // const user = await User.findOne({ userName: p_userName });

        const user = await User.findOne({
            $or: [
                { userName: p_userName },
                { email: p_userName }
            ]
        });

        if (!user) {
            return res.status(400).json({ msg: "Tài khoản không tồn tại" });
        }

        const verifyPassword = await bcrypt.compare(p_password, user.password);

        if (!verifyPassword) {
            return res.status(400).json({ msg: "Tài khoản hoặc mật khẩu sai" });
        }

        //tao token thong qua viec ma hoa 1 vai thong tin user
        const token = jwt.sign({
            userId: user._id,
            fullName: user.fullName,
        },
            //luu thong tin file .env, bao mat tranh lo thong tin nguoi dung
            process.env.SECRET_KEY, {
            expiresIn: "1y"
        }
        );

        //result = tat ca thong tin tru password
        const { password, ...result } = user?._doc;

        return res.status(200).json({
            msg: "Đăng nhập thành công",
            token,
            user: result
        });

    } catch (error) {
        return res.status(500).json({ msg: "Lỗi server" });
    }
}


const updateInfoUser = async (req, res) => {
    try {
        // lấy id từ param "/update/:id"
        const id = req.params.id;
        //Nếu không có id thì sẽ trả về
        if (!id) {
            return res.status(403).json({
                msg: "Không đúng định dạng !",
            });
        }
        //kiểm tra id từ database có bằng id truyền lên hay k
        if (req.body.user._id.toString() !== id) {
            return res.status(403).json({
                msg: "Bạn không có quyền chỉnh sửa!",
            });
        }
        //lấy thông tin mà user muốn sửa
        const { p_fullName, p_emai } = req.body;
        //kiểm tra user
        const user = await User.findById(id);
        if (p_fullName) {
            user.fullName = p_fullName;
        }
        if (p_emai) {
            user.email = p_emai;
        }
        //lưu thông tin vào database
        await user.save();
        return res.status(200).json({
            msg: "Đã cập nhật thông tin!",
        });
    } catch (error) {
        return res.status(500).json({
            msg: "Internal server error",
            error,
        });
    }
};


const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;

        //kiểm tra id từ database có bằng id truyền lên hay k
        if (req.body.user._id.toString() !== id) {
            return res.status(403).json({
                msg: "Bạn không có quyền chỉnh sửa!",
            });
        }

        await User.findByIdAndDelete(id);

        return res.status(200).json({
            msg: "Đã xoá tài khoản thành công!",
        });
    } catch (error) {
        return res.status(500).json({
            msg: "Internal server error",
            error,
        });
    }
};

const getAllUser = async (req, res) => {
    try {

        // const id = req.params.id;

        // const data = await User.findById(id)

        const listUsers = await User.find().sort({ username: 1 });

        return res.status(200).json({
            data: listUsers,
            msg: 'Success!'
        })

    } catch (error) {
        console.log('error', error);

        return res.status(500).json({
            msg: "Internal server error",
            error,
        });
    }
}

// Gửi OTP đến email người dùng
const forgotPassword = async (req, res) => {
    try {
        console.log('req.body:', req.body);
        const { p_email } = req.body;

        if (!p_email) return res.status(400).json({ msg: "Vui lòng nhập email!" });

        const user = await User.findOne({ email: p_email });
        if (!user) return res.status(400).json({ msg: "Email không tồn tại!" });

        // Tạo OTP ngẫu nhiên 6 số
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Cập nhật OTP và thời gian hết hạn (5 phút)
        user.resetOTP = otp;
        user.otpExpires = new Date(Date.now() + 5 * 60 * 1000);
        await user.save();

        // Gửi email (sử dụng nodemailer - cấu hình tạm)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: p_email,
            subject: 'Mã OTP khôi phục mật khẩu',
            text: `Mã OTP của bạn là: ${otp}. Có hiệu lực trong 5 phút.`
        };

        await transporter.sendMail(mailOptions);

        return res.status(200).json({ msg: "Đã gửi OTP đến email!" });

    } catch (error) {
        console.error('Forgot password error:', error); 
        return res.status(500).json({ msg: "Lỗi server!" });
    }
};

// Đặt lại mật khẩu mới bằng OTP
const resetPassword = async (req, res) => {
    try {
        const { p_email, otp, newPassword } = req.body;

        if (!p_email || !otp || !newPassword) {
            return res.status(400).json({ msg: "Thiếu thông tin!" });
        }

        const user = await User.findOne({ email: p_email });
        if (!user || user.resetOTP !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: "OTP không hợp lệ hoặc đã hết hạn!" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        // Xóa OTP sau khi dùng
        user.resetOTP = null;
        user.otpExpires = null;

        await user.save();

        return res.status(200).json({ msg: "Đổi mật khẩu thành công!" });

    } catch (error) {
        return res.status(500).json({ msg: "Lỗi server!" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    updateInfoUser,
    deleteUser,
    getAllUser,
    forgotPassword,
    resetPassword
};