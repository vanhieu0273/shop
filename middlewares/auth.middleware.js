const User = require('../models/user.model')
const jwt = require('jsonwebtoken')

const authMiddleware = async (req, res, next) => {
    try {

        //lấy token từ client gửi lên thông qua authorization header
        const token = req.headers['authorization']?.replace('Bearer ', '');

        //kiểm tra xem token có tồn tại hay không
        if (!token) {
            return res.status(401).json({ msg: "k co quyen truy cap" });
        }

        console.log("token", token);
        //decode kiểm tra thông tin trong token gửi lên server 
        const decode = jwt.decode(token, process.env.SECRET_KEY);

        console.log("decode", decode);
        
        //kiem tra thoi han token
        if (decode.exp < Date.now() / 1000){
            
            return res.status(401).json({ msg: "token het han" });
        }

        //kiem tra su ton tai cua user
        const user = await User.findById(decode.userId);

        //neu khong co user trong database thi huy request
        if(!user) {
            return res.status(401).json({ msg: "user không tồn tại!" });
        }
        
        req.body.user = user;
        next();

        
        
    } catch (error) {
        return res.status(500).json({ msg: "Lỗi server", ereror });
    }

}

module.exports = {
    authMiddleware
};      