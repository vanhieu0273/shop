var express = require('express');
var router = express.Router();
const {registerUser, loginUser, updateInfoUser, deleteUser, getAllUser} = require('../services/user.service')
const {authMiddleware} = require('../middlewares/auth.middleware')

router.post('/register', async (req, res, next) => registerUser(req, res)); 

router.post('/login', async (req, res, next) => loginUser(req, res)); 

router.put("/update/:id", authMiddleware, updateInfoUser);


router.delete("/delete/:id", authMiddleware, deleteUser);

router.get('/list-user' , getAllUser)

module.exports = router;
