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

const createBooking = async ({ userId, seatIds, bookDate }) => {
    if (!userId || !Array.isArray(seatIds) || seatIds.length === 0) {
        throw new Error('User ID and at least one seat ID are required');
    }

    const connection = await pool.promise().getConnection();

    try {
        await connection.beginTransaction();

        const [takenSeats] = await connection.query(
            `SELECT id FROM seats WHERE id IN (?) AND status IN ('reserved', 'booked')`,
            [seatIds]
        );

        if (takenSeats.length > 0) {
            const takenIds = takenSeats.map(seat => seat.id).join(', ');
            throw new Error(`Seat(s) already taken: ${takenIds}. Please select another.`);
        }

        const formattedBookDate = new Date(bookDate).toISOString().slice(0, 19).replace('T', ' ');

        const [reservationResult] = await connection.query(
            'INSERT INTO bookings (userId, bookDate) VALUES (?, ?)',
            [userId, formattedBookDate]
        );

        const reservationId = reservationResult.insertId;

        const seatInserts = seatIds.map(seatId => [reservationId, seatId]);
        await connection.query(
            'INSERT INTO bookingseats (bookingId, seatId) VALUES ?',
            [seatInserts]
        );

        await connection.query(
            'UPDATE seats SET status = ? WHERE id IN (?)',
            ['reserved', seatIds]
        );

        await connection.commit();
        return {
            reservationId,
            seatsBooked: seatIds.length,
            bookDate: formattedBookDate
        };
    } catch (error) {
        await connection.rollback();
        throw new Error('Booking failed: ' + error.message);
    } finally {
        connection.release();
    }
};

const deleteBooking = async (bookingId) => {
    if (!bookingId) {
        throw new Error('Booking ID is required');
    }

    const connection = await pool.promise().getConnection();

    try {
        await connection.beginTransaction();

        const [booking] = await connection.query(
            'SELECT * FROM bookings WHERE id = ?',
            [bookingId]
        );

        if (booking.length === 0) {
            throw new Error('Booking not found');
        }

        const [bookingSeats] = await connection.query(
            'SELECT seatId FROM bookingseats WHERE bookingId = ?',
            [bookingId]
        );
        const seatIds = bookingSeats.map(seat => seat.seatId);

        await connection.query(
            'DELETE FROM bookingseats WHERE bookingId = ?',
            [bookingId]
        );

        if (seatIds.length > 0) {
            await connection.query(
                'UPDATE seats SET status = ? WHERE id IN (?)',
                ['available', seatIds]
            );
        }

        await connection.query(
            'DELETE FROM bookings WHERE id = ?',
            [bookingId]
        );

        await connection.commit();

        return { deleted: true, bookingId };
    } catch (error) {
        await connection.rollback();
        throw new Error('Deletion failed: ' + error.message);
    } finally {
        connection.release();
    }
};


module.exports = { getBookings, createBooking, deleteBooking };