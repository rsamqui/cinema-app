const express = require('express');
const router = express.Router();
const movieController = require('../controller/movieController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/create', authenticate, authorize(['admin']), movieController.createMovie);
router.get('/movies', movieController.getMovies);

module.exports = router;