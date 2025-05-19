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

const getAvailableMovies = async (filters) => {
    let query = 'SELECT * FROM movies WHERE id NOT IN (SELECT DISTINCT movieId FROM rooms WHERE movieId IS NOT NULL';
    let params = [];
    
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

const updateMovie = async (id, movie) => {
    const fields = [];
    const params = [];

    const isValid = (value) => value !== undefined && value !== null && value !== '';

    if (isValid(movie.title)) {
        fields.push('title = ?');
        params.push(movie.title);
    }

    if (isValid(movie.synopsis)) {
        fields.push('synopsis = ?');
        params.push(movie.synopsis);
    }

    if (isValid(movie.duration)) {
        fields.push('duration = ?');
        params.push(movie.duration);
    }

    if (isValid(movie.posterUrl)) {
        fields.push('posterUrl = ?');
        params.push(movie.posterUrl);
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    const query = `UPDATE movies SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    try {
        const [result] = await pool.promise().query(query, params);
        
        if (result.affectedRows === 0) {
            throw new Error('Movie not found');
        }

        const updatedMovie = {id: id};
        fields.forEach((field, index) => {
            const key = field.split(' = ')[0].trim();
            updatedMovie[key] = params[index];
        });

        return updatedMovie;
    } catch (error) {
        throw new Error(error.message);
    }
};

const deleteMovie = async (id) => {
    const query = 'DELETE FROM movies WHERE id = ?';

    try {
        const [result] = await pool.promise().query(query, [id]);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { getMovies, getAvailableMovies, createMovie, updateMovie, deleteMovie };