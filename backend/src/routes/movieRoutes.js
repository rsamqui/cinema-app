const express = require('express');
const router = express.Router();
const movieController = require('../controller/movieController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/movies/new', authenticate, authorize(['admin']), movieController.createMovie);
router.get('/movies', movieController.getMovies);
router.put('/movies/update/:id', authenticate, authorize(['admin']), movieController.updateMovie);
router.delete('/movies/delete/:id', authenticate, authorize(['admin']), movieController.deleteMovie);

module.exports = router;