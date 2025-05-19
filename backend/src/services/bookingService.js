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

const createBooking = async ({ userId, seatDbIds, showDate, roomId, price }) => {
    if (!userId || !Array.isArray(seatDbIds) || seatDbIds.length === 0 || !showDate || !roomId || price === undefined) {
        throw new Error('User ID, Room ID, Show Date, Total Price, and at least one Seat DB ID are required');
    }

    const connection = await pool.promise().getConnection();

    try {
        await connection.beginTransaction();

        const [roomRows] = await connection.query('SELECT movieId FROM rooms WHERE id = ?', [roomId]);
        if (roomRows.length === 0) {
            throw new Error('Room not found.');
        }
        const movieId = roomRows[0].movieId;

        const placeholders = seatDbIds.map(() => '?').join(',');
        const availabilityQuery = `
            SELECT bs.seatId 
            FROM bookingseats bs
            JOIN bookings b ON bs.bookingId = b.id
            WHERE b.roomId = ? AND b.showDate = ? AND bs.seatId IN (${placeholders})
        `;

        const [alreadyBookedSeats] = await connection.query(availabilityQuery, [roomId, showDate, ...seatDbIds]);

        if (alreadyBookedSeats.length > 0) {
            const takenIds = alreadyBookedSeats.map(seat => seat.seatId).join(', ');
            throw new Error(`Seat(s) already taken for this date: ${takenIds}. Please select others.`);
        }
        const formattedShowDate = new Date(showDate).toISOString().slice(0, 10);

        const [bookingResult] = await connection.query(
            'INSERT INTO bookings (userId, roomId, movieId, showDate, price) VALUES (?, ?, ?, ?, ?)',
            [userId, roomId, movieId, formattedShowDate, price ]
        );
        const bookingId = bookingResult.insertId;

        const bookingSeatInserts = seatDbIds.map(seatDbId => [bookingId, seatDbId]);
        await connection.query(
            'INSERT INTO bookingseats (bookingId, seatId) VALUES ?',
            [bookingSeatInserts]
        );

        await connection.commit();
        
        const ticketDetails = await getBookingDetailsForTicket(bookingId, connection);
        
        connection.release();
        return ticketDetails;

    } catch (error) {
        if (connection) await connection.rollback(); 
        console.error('Booking failed in backend:', error);
        throw new Error('Booking failed: ' + error.message);
    } finally {
        if (connection) connection.release();
    }
};


const getBookingDetailsForTicket = async (bookingId, dbConnection) => {
    const conn = dbConnection || await pool.promise(); // Use passed connection or get new one
    const query = `
        SELECT
            b.id AS bookingId,
            b.showDate AS showDate, 
            b.price AS totalPrice,
            u.name AS userName,
            u.email AS userEmail,
            m.title AS movieTitle,
            m.duration AS movieDuration,
            r.roomNumber,
            r.name AS roomName, 
            GROUP_CONCAT(CONCAT(s.rowLetter, s.colNumber) ORDER BY s.rowLetter, s.colNumber SEPARATOR ', ') AS bookedSeatsString
        FROM bookings b
        JOIN users u ON b.userId = u.id
        JOIN rooms r ON b.roomId = r.id
        JOIN movies m ON r.movieId = m.id
        JOIN bookingseats bs ON b.id = bs.bookingId
        JOIN seats s ON bs.seatId = s.id
        WHERE b.id = ?
        GROUP BY b.id, u.name, u.email, m.title, m.duration, m.posterUrl, r.roomNumber, r.name, b.show_date, b.total_price, b.booking_transaction_time;
    `;
    try {
        const [rows] = await conn.query(query, [bookingId]);
        if (rows.length === 0) {
            throw new Error("Booking not found for ticket generation.");
        }
        const bookingDetail = rows[0];
        const qrCodeData = `BOOKING_ID:${bookingDetail.bookingId};MOVIE:${bookingDetail.movieTitle};DATE:${bookingDetail.showDate};SEATS:${bookingDetail.bookedSeatsString}`;

        return {
            ...bookingDetail,
            seats: bookingDetail.bookedSeatsString ? bookingDetail.bookedSeatsString.split(', ').map(s => ({ id: s })) : [],
            qrCodeData: qrCodeData,
        };
    } catch (error) {
        console.error("Error fetching booking details for ticket:", error);
        throw error;
    } finally {
        if (!dbConnection && conn) await conn.release(); // Release only if we got a new connection
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