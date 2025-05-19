const express = require('express');
const router = express.Router();
const movieController = require('../controller/movieController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/movies/new', authenticate, authorize(['admin']), movieController.createMovie);
router.get('/movies', movieController.getMovies);
router.get('/movies/available', authenticate, authorize(['admin']), movieController.getAvailableMovies);
router.get('/movies/now-showing', movieController.getNowShowingMovies);
router.get('/movies/details/:id', movieController.getMovies);
router.put('/movies/:id', authenticate, authorize(['admin']), movieController.updateMovie);
router.delete('/movies/:id', authenticate, authorize(['admin']), movieController.deleteMovie);

module.exports = router;