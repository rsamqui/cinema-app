const pool = require('../config/db');

const getSeats = async (filters) => {
    let query = 'SELECT * FROM seats WHERE 1=1';
    let params = [];

    if (filters.id) {
        query += ' AND id = ?';
        params.push(filters.id);
    }

    try {
        const [seats] = await pool.promise().query(query, params);
        return seats;
    } catch (error) {
        throw new Error(error.message);
    }
};

const createSeat = async (seat) => {
    const { roomId, rowLetter, colNumber } = seat;
    const query = 'INSERT INTO seats (roomId, rowLetter, colNumber) VALUES (?, ?, ?)';
    const params = [roomId, rowLetter, colNumber];

    try {
        const [result] = await pool.promise().query(query, params);
        return result.insertId;
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateSeat = async (id, seat) => {
    const { roomId, rowLetter, colNumber } = seat;
    const query = 'UPDATE seats SET roomId = ?, rowLetter = ?, colNumber = ? WHERE id = ?';
    const params = [roomId, rowLetter, colNumber, id];

    try {
        const [result] = await pool.promise().query(query, params);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(error.message);
    }
};

const deleteSeat = async (id) => {
    const query = 'DELETE FROM seats WHERE id = ?';
    const params = [id];

    try {
        const [result] = await pool.promise().query(query, params);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(error.message);
    }
};

exports = { getSeats, createSeat, updateSeat, deleteSeat };