const pool = require('../config/db');

const getMovies = async (filters) => {
    let query = 'SELECT * FROM movies WHERE 1=1';
    let params = [];

    if (filters.id) {
        query += ' AND id = ?';
        params.push(filters.id);
    }

    if (filters.title) {
        query += ' AND title = ?';
        params.push(filters.title);
    }

    try {
        const [movies] = await pool.promise().query(query, params);
        return movies;
    } catch (error) {
        throw new Error(error.message);
    }
};

const createMovie = async (movie) => {
    const { title, synopsis, duration, posterUrl } = movie;
    
    if (!title || !synopsis || !duration || !posterUrl) {
        throw new Error('All fields are required');
    }

    const query = 'INSERT INTO movies (title, synopsis, duration, posterUrl) VALUES (?, ?, ?, ?)';

    try {
        const [result] = await pool.promise().query(query, [movie.title, movie.synopsis, movie.duration, movie.posterUrl]);
        return {
            id:result.insertId,
            title,
            synopsis,
            duration,
            posterUrl
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { getMovies, createMovie };