const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', userController.loginUser);
router.post('/register', authenticate, authorize(['administrador']), userController.createUser);
router.get('/users', authenticate, authorize(['administrador']), userController.getUsers);

module.exports = router;
