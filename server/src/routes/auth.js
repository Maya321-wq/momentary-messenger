const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { login, savePhone, verifyMfa } = require('../controllers/authController');

router.post('/login', verifyToken, login);
router.post('/save-phone', verifyToken, savePhone);
router.post('/mfa/verify', verifyToken, verifyMfa);

module.exports = router;