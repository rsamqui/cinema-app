const pool = require('../config/db');

const getSeats = async (filters) => {
    let query = 'SELECT * FROM seats WHERE 1=1';
    let params = [];

    if (filters.id) {
        query += ' AND roomId = ?';
        params.push(filters.id);
    }

    try {
        const [seats] = await pool.promise().query(query, params);
        return seats;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { getSeats };