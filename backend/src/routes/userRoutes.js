const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', userController.loginUser);
router.post('/register', userController.createUser);
router.get('/users/:id', authenticate, authorize(['admin']), userController.getUsers);
router.get('/users/details/:id', authenticate, authorize(['admin','client']), userController.getUserById);
router.put('/users/edit/:id', authenticate, authorize(['admin','client']), userController.updateUser);
router.delete('/users/:id', authenticate, authorize(['admin']), userController.deleteUser);

module.exports = router;