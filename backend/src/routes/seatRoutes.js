const express = require('express');
const router = express.Router();
const seatController = require('../controller/seatController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/newSeat', authenticate, authorize(['admin']), seatController.createSeat);
router.get('/seats', seatController.getSeats);
router.put('/seats/:id', authenticate, authorize(['admin']), seatController.updateSeat);
router.delete('/seats/:id', authenticate, authorize(['admin']), seatController.deleteSeat);

module.exports = router;