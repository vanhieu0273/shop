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