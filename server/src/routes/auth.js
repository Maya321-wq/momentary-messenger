const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { login } = require('../controllers/authController');

router.post('/login', verifyToken, login);

module.exports = router;