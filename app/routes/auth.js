const express = require('express');
const authController = require('../controllers/auth');
const router = express.Router();
const { verifyToken } = require('../middlewares');

// Routers  
router.get('/', authController.getlogin);
router.get('/login', authController.getlogin)
router.post('/login', authController.login)
router.post('/register', authController.register)
router.get('/auth_google', authController.googleLogin)
router.get('/callback', authController.callbackFunction)

module.exports = router;