const express = require('express');
const router = express.Router();
const bookingController = require('../controller/bookingController');
const { authenticate, authorize } = require('../middleware/auth');


router.get('/bookings', authenticate, bookingController.getBookings);
router.post('/bookings/bookSeats', authenticate, bookingController.createBooking);
router.put('/bookings/update/:id', authenticate, authorize(['admin']), bookingController.updateBooking);
router.delete('/bookings/delete/:id', authenticate, authorize(['admin']), bookingController.deleteBooking);

module.exports = router;