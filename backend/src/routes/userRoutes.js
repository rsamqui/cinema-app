const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', userController.loginUser);
router.post('/register', authenticate, authorize(['admin']), userController.createUser);
router.get('/users', authenticate, authorize(['admin']), userController.getUsers);

module.exports = router;