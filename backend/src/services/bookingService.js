const pool = require('../config/db');
const { SEAT_STATUS } = require('../utils/seatConstants');

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

const createBooking = async ({ userId, roomId, movieId, seatDbIds, price, showDate }) => {
    const totalPrice = price; 
    const missingFields = [];

    if (!userId) {
        missingFields.push("User ID (userId)");
    }
    if (!roomId) {
        missingFields.push("Room ID (roomId)");
    }
    if (!movieId) {
        missingFields.push("Movie ID (movieId)");
    }
    if (!showDate) {
        missingFields.push("Show Date (showDate)");
    }
    if (totalPrice === undefined) { 
        missingFields.push("Total Price (totalPrice)");
    }
    if (!Array.isArray(seatDbIds) || seatDbIds.length === 0) {
        missingFields.push("At least one Seat ID (seatDbIds array with content)");
    }
    if (missingFields.length > 0) {
        const errorMessage = `Missing required fields: ${missingFields.join(', ')}.`;
        console.error("Backend validation failed. Payload:", { userId, roomId, movieId, seatDbIds, totalPrice, showDate }, "Missing:", missingFields);
        throw new Error(errorMessage);
    }

    console.log("Backend createBooking - Parameters received after validation:", { userId, roomId, movieId, seatDbIds, totalPrice, showDate });

    const connection = await pool.promise().getConnection();

    try {
        await connection.beginTransaction();
        const formattedShowDateForDB = new Date(showDate).toISOString().slice(0, 10);
        console.log(`Backend createBooking: Received showDate '${showDate}', Formatted for DB query: '${formattedShowDateForDB}'`);

        const placeholders = seatDbIds.map(() => '?').join(',');
        const availabilityQuery = `
            SELECT bs.seatId 
            FROM bookingseats bs
            JOIN bookings b ON bs.bookingId = b.id
            WHERE b.roomId = ? AND b.showDate = ? AND bs.seatId IN (${placeholders})
            AND b.status IN ('confirmed', 'pending')
        `;

        const [alreadyBookedSeats] = await connection.query(
            availabilityQuery,
            [roomId, formattedShowDateForDB, ...seatDbIds]
        );

        if (alreadyBookedSeats.length > 0) {
            const takenIds = alreadyBookedSeats.map(seat => seat.seatId).join(', ');
            throw new Error(`Seat(s) already taken for this date: ${takenIds}. Please select others.`);
        }

        if (seatDbIds.length > 0) {
            const [unavailableAdminSeats] = await connection.query(
                `SELECT id FROM seats WHERE id IN (${placeholders}) AND status = ?`,
                [...seatDbIds, SEAT_STATUS.UNAVAILABLE_ADMIN]
            );
            if (unavailableAdminSeats.length > 0) {
                const unavailableIds = unavailableAdminSeats.map(s => s.id).join(', ');
                throw new Error(`Seat(s) ${unavailableIds} are permanently unavailable.`);
            }
        }

        const initialBookingStatus = 'confirmed';
        const [bookingResult] = await connection.query(
            'INSERT INTO bookings (userId, roomId, movieId, showDate, price, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, roomId, movieId, formattedShowDateForDB, totalPrice, initialBookingStatus]
        );
        const bookingId = bookingResult.insertId;

        const bookingSeatInserts = seatDbIds.map(seatDbId => [bookingId, seatDbId]);
        await connection.query('INSERT INTO bookingseats (bookingId, seatId) VALUES ?', [bookingSeatInserts]);

        if (initialBookingStatus === 'confirmed' && seatDbIds.length > 0) {
            await connection.query(
                'UPDATE seats SET status = ? WHERE id IN (?)',
                [SEAT_STATUS.TAKEN, seatDbIds]
            );
        } else if (initialBookingStatus === 'pending_payment' && seatDbIds.length > 0) {
             await connection.query(
                'UPDATE seats SET status = ? WHERE id IN (?)',
                [SEAT_STATUS.RESERVED, seatDbIds]
            );
        }

        await connection.commit();
        const ticketDetails = await getBookingDetailsForTicket(bookingId, connection);
        return ticketDetails;

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error during rollback:', rollbackError);
            }
        }
        console.error('Booking failed in backend (bookingService.createBooking):', error);
        throw new Error('Booking failed: ' + (error.sqlMessage || error.message));
    } finally {
        if (connection) {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('Error releasing connection in bookingService.createBooking:', releaseError);
            }
        }
    }
};

const getBookingDetailsForTicket = async (bookingId, dbConnection) => {
    const conn = dbConnection || await pool.promise().getConnection();
    const query = `
        SELECT
            b.id AS bookingId,
            b.showDate AS showDate, 
            b.price AS totalPrice,
            b.status AS bookingStatus,
            u.name AS userName,
            u.email AS userEmail,
            m.title AS movieTitle,
            m.duration AS movieDuration,
            m.posterUrl AS moviePosterUrl,
            r.roomNumber,
            GROUP_CONCAT(DISTINCT CONCAT(s.rowLetter, s.colNumber) ORDER BY s.rowLetter, s.colNumber SEPARATOR ', ') AS bookedSeatsString
        FROM bookings b
        JOIN users u ON b.userId = u.id
        JOIN rooms r ON b.roomId = r.id
        JOIN movies m ON r.movieId = m.id
        JOIN bookingseats bs ON b.id = bs.bookingId
        JOIN seats s ON bs.seatId = s.id
        WHERE b.id = ?
        GROUP BY 
            b.id, b.showDate, b.price, b.status,
            u.name, u.email, 
            m.title, m.duration, m.posterUrl,
            r.roomNumber;
    `;
    try {
        const [rows] = await conn.query(query, [bookingId]);
        if (rows.length === 0) throw Error("Booking not found for ticket generation.");
        const bookingDetail = rows[0];
        const qrCodeData = `BOOKING_ID:${bookingDetail.bookingId};STATUS:${bookingDetail.bookingStatus}`; // Added status to QR
        return {
            ...bookingDetail,
            seats: bookingDetail.bookedSeatsString ? bookingDetail.bookedSeatsString.split(', ').map(s => ({ id: s })) : [],
            qrCodeData: qrCodeData,
        };
    } catch (error) {
        console.error("Error fetching booking details for ticket:", error);
        throw error;
    } finally {
        if (!dbConnection && conn) {
            try { await conn.release(); } catch (relError) { console.error("Error releasing connection:", relError); }
        }
    }
};

const getBookingsByUserId = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required to fetch bookings.');
  }

  const query = `
    SELECT
        b.id AS bookingId,
        b.showDate AS showDate,
        b.price AS totalPrice,
        b.status AS bookingStatus,
        u.name AS userName,
        u.email AS userEmail,
        m.title AS movieTitle,
        m.duration AS movieDuration,
        m.posterUrl AS moviePosterUrl,
        r.roomNumber,
        GROUP_CONCAT(DISTINCT CONCAT(s.rowLetter, s.colNumber) ORDER BY s.rowLetter, s.colNumber SEPARATOR ', ') AS bookedSeatsString
    FROM bookings b
    JOIN users u ON b.userId = u.id
    JOIN rooms r ON b.roomId = r.id
    JOIN movies m ON r.movieId = m.id
    LEFT JOIN bookingseats bs ON b.id = bs.bookingId
    LEFT JOIN seats s ON bs.seatId = s.id
    WHERE b.userId = ?
    GROUP BY 
        b.id, b.showDate, b.price, b.status,
        u.name, u.email, 
        m.title, m.duration, m.posterUrl,
        r.roomNumber
    ORDER BY b.showDate DESC;
  `;

  try {
    const [rows] = await pool.promise().query(query, [userId]);
    
    const bookingsWithParsedSeats = rows.map(booking => ({
        ...booking,
        seats: booking.bookedSeatsString ? booking.bookedSeatsString.split(', ').map(seatStr => ({ id: seatStr })) : []
    }));

    return bookingsWithParsedSeats;
  } catch (error) {
    console.error(`Error fetching bookings for user ID ${userId}:`, error);
    throw new Error('Failed to retrieve your bookings: ' + error.message);
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


module.exports = { getBookings, getBookingsByUserId, createBooking, getBookingDetailsForTicket, deleteBooking };