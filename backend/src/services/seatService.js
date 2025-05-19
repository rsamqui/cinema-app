const pool = require('../config/db');

const getSeats = async (filters) => {
    let query = 'SELECT * FROM seats WHERE 1=1';
    let params = [];

    if (filters.roomId) {
        query += ' AND roomId = ?';
        params.push(filters.roomId);
    }

    if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }

    try {
        const [seats] = await pool.promise().query(query, params);
        return seats;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { getSeats };