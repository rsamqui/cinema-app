const express = require('express');
const router = express.Router();
const roomController = require('../controller/roomController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/rooms/newRoom', authenticate, authorize(['admin']), roomController.createRoom);
router.get('/rooms', roomController.getRooms);
router.put('/rooms/:id', authenticate, authorize(['admin']), roomController.updateRoom);
router.delete('/rooms/:id', authenticate, authorize(['admin']), roomController.deleteRoom);

module.exports = router;