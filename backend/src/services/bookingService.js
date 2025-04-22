const pool = require('../config/db');

const getBookings = async (filters) => {
    let query = 'SELECT * FROM bookings WHERE 1=1';
    let params = [];

    if (filters.id) {
        query += ' AND id = ?';
        params.push(filters.id);
    }

    if (filters.userId) {
        query += ' AND userId = ?';
        params.push(filters.userId);
    }

    if (filters.movieId) {
        query += ' AND movieId = ?';
        params.push(filters.movieId);
    }

    try {
        const [bookings] = await pool.promise().query(query, params);
        return bookings;
    } catch (error) {
        throw new Error(error.message);
    }
};

const createBooking = async (userId, seatIds) => {
    if (!userId || !Array.isArray(seatIds) || seatIds.length === 0) {
        throw new Error('User ID and at least one seat ID are required');
    }

    try {
        await connection.beginTransaction();

        // Step 1: Insert the reservation
        const [reservationResult] = await connection.query(
            'INSERT INTO bookings (userId) VALUES (?)',
            [userId]
        );
        const reservationId = reservationResult.insertId;

        // Step 2: Insert each seat into bookingseats
        const seatInserts = seatIds.map(seatId => [reservationId, seatId]);
        await connection.query(
            'INSERT INTO bookingseats (bookingId, seatId) VALUES ?',
            [seatInserts]
        );

        // Step 3: Optionally update seat status to "booked"
        await connection.query(
            'UPDATE seats SET status = ? WHERE id IN (?)',
            ['reserved', seatIds]
        );

        await connection.commit();
        connection.release();

        return {
            reservationId,
            seatsBooked: seatIds.length
        };
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error('Booking failed: ' + error.message);
    }
};

module.exports = { getBookings, createBooking };