// const User = require('../models/user.model')
// const jwt = require('jsonwebtoken')

// const authMiddleware = async (req, res, next) => {
//     try {

//         //lấy token từ client gửi lên thông qua authorization header
//         const token = req.headers['authorization']?.replace('Bearer ', '');

//         //kiểm tra xem token có tồn tại hay không
//         if (!token) {
//             return res.status(401).json({ msg: "k co quyen truy cap" });
//         }

//         console.log("token", token);
//         //decode kiểm tra thông tin trong token gửi lên server 
//         const decode = jwt.decode(token, process.env.SECRET_KEY);

//         console.log("decode", decode);
        
//         //kiem tra thoi han token
//         if (decode.exp < Date.now() / 1000){
            
//             return res.status(401).json({ msg: "token het han" });
//         }

//         //kiem tra su ton tai cua user
//         const user = await User.findById(decode.userId);

//         //neu khong co user trong database thi huy request
//         if(!user) {
//             return res.status(401).json({ msg: "user không tồn tại!" });
//         }
        
//         req.body.user = user;
//         next();

        
        
//     } catch (error) {
//         return res.status(500).json({ msg: "Lỗi server", ereror });
//     }

// }

// module.exports = {
//     authMiddleware
// };      


const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        return res.status(401).json({ msg: "Không có quyền truy cập!" });
    }

    try {
      // Xác thực token và kiểm tra hết hạn
      const decode = jwt.verify(token, process.env.SECRET_KEY);
      
      // Kiểm tra thời gian hết hạn của token
      if (decode.exp < Date.now() / 1000) {
        return res.status(401).json({ msg: "Token đã hết hạn!" });
      }

      //Tìm user , nếu có thì gắn thêm vào request
      const user = await User.findById(decode.userId);

      if (!user) {
        return res.status(401).json({ msg: "Token không hợp lệ!" });
      }

      req.user = user;
      req.token = token;
      req.role = user.role;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ msg: "Token đã hết hạn!" });
      }
      return res.status(401).json({ msg: "Token không hợp lệ!" });
    }
  } catch (error) {

    console.log('error', error);
    
    return res.status(403).json({
      msg: "Không có quyền truy cập",
    });
  }
};

const managerWebsiteMiddleware = (req, res, next) => {
  const userRoles = req.user.role; // Assuming user roles are stored in req.user.roles


  
  if (req.user.role === "user") {
    return res.status(403).json({ msg: "User không có quyền truy cập!" });
  }

  next();
};

const adminRoleMiddleware = (req, res, next) => {
  console.log('info', req.user);
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Chỉ admin có quyền truy cập!" });
  }

  next();
};


module.exports = { authMiddleware, managerWebsiteMiddleware, adminRoleMiddleware };