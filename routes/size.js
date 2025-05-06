var express = require('express');
var router = express.Router();

const {getAllSize, createSize, updateSize, deleteSize} = require('../services/size.service')


router.get('/list-size', async (req, res, next) => getAllSize(req, res));
router.post('/create-size', async (req, res, next) => createSize(req, res));
router.put('/update-size/:id', async (req, res, next) => updateSize(req, res));
router.delete('/delete-size/:id', async (req, res, next) => deleteSize(req, res));

module.exports = router;