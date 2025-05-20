const movieService = require('../services/movieService');

exports.getMovies = async (req, res) => {
    try {
        const filters = {
            id: req.query.id,
            title: req.query.title
        };

        const movies = await movieService.getMovies(filters);
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getMovieById = async (req, res) => {
    try {
        const movieId = req.params.id;
        const movie = await movieService.getMovieById(movieId);

        if (!movie) {
            return res.status(404).json({ error: 'Pelicula no encontrada' });
        }

        res.json(movie);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getNowShowingById = async (req, res) => {
    try {
        const movieId = req.params.id;
        const movie = await movieService.getNowShowingById(movieId);

        if (!movie) {
            return res.status(404).json({ error: 'Pelicula no encontrada' });
        }

        res.json(movie);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getNowShowingMovies = async (req, res) => {
    try {
        const filters = {
            id: req.query.id,
            title: req.query.title
        };

        const movies = await movieService.getNowShowingMovies(filters);
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getAvailableMovies = async (req, res) => {
    try {
        const filters = {
            id: req.query.id,
            title: req.query.title
        };

        const movies = await movieService.getAvailableMovies(filters);
        res.json(movies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.createMovie = async (req, res) => {
    try {
        const newMovie = await movieService.createMovie(req.body);
        res.status(201).json(newMovie);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateMovie = async (req, res) => {
    try {
        const movieId = req.params.id;
        const updatedMovie = await movieService.updateMovie(movieId, req.body);

        if (!updatedMovie) {
            return res.status(404).json({ error: 'Pelicula no encontrada' });
        }

        res.json(updatedMovie);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteMovie = async (req, res) => {
    try {
        const movieId = req.params.id;
        const deletedMovie = await movieService.deleteMovie(movieId);

        if (!deletedMovie) {
            return res.status(404).json({ error: 'Pelicula no encontrada' });
        }

        res.json({ message: 'Pelicula eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};