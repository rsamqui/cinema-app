const express = require('express');
const router = express.Router();
const seatController = require('../controller/seatController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/seats', authenticate, authorize(['admin']), seatController.getSeats);

module.exports = router;