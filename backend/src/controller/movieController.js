const movieService = require('../services/movieService');

exports.getMovies = async (req, res) => {
    try {
        const filters = {
            id: req.query.id,
            title: req.query.title,
            genre: req.query.genre,
            director: req.query.director,
            year: req.query.year
        };

        const movies = await movieService.getMovies(filters);
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createMovie = async (req, res) => {
    try {
        const newMovie = await movieService.createMovie(req.body);
        res.status(201).json(newMovie);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};