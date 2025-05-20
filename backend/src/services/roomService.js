const pool = require('../config/db');
const { SEAT_STATUS } = require('../utils/seatConstants');

const getRoomByIdWithLayout = async (roomId, showDate) => {
  try {
    const roomQuery = 'SELECT id, roomNumber, movieId, totalRows, totalColumns, totalColumns FROM rooms WHERE id = ?'
    const [roomRows] = await pool.promise().query(roomQuery, [roomId]);

    if (roomRows.length === 0) {
      const error = new Error('Room not found');
      error.statusCode = 404;
      throw error;
    }
    const roomData = roomRows[0];

    const physicalSeatsQuery = `
      SELECT 
        id AS dbId,
        rowLetter, 
        colNumber, 
        status AS baseStatus
      FROM seats 
      WHERE roomId = ? 
      ORDER BY rowLetter, colNumber;
    `;
    const [physicalSeatRows] = await pool.promise().query(physicalSeatsQuery, [roomId]);

    let bookedOrReservedDbIdsForDate = new Set();
    if (showDate) {
      const formattedShowDateForDB = new Date(showDate).toISOString().slice(0, 10);
      console.log(`Backend getRoomByIdWithLayout: Checking bookings for roomId: ${roomId}, showDate: ${formattedShowDateForDB}`);

      const bookedSeatsQuery = `
        SELECT DISTINCT bs.seatId 
        FROM bookingseats bs
        JOIN bookings b ON bs.bookingId = b.id
        WHERE b.roomId = ? AND b.showDate = ? AND b.status = 'confirmed' 
      `;

      const [bookedRows] = await pool.promise().query(bookedSeatsQuery, [roomId, formattedShowDateForDB]);
      bookedOrReservedDbIdsForDate = new Set(bookedRows.map(s => s.seatId));
      console.log(`Backend getRoomByIdWithLayout: For Room ${roomId} on ${formattedShowDateForDB}, booked/reserved DB IDs:`, Array.from(bookedOrReservedDbIdsForDate));
    }

    const seatLayout = physicalSeatRows.map(physicalSeat => {
      let finalStatusForThisDate = physicalSeat.baseStatus;

      if (physicalSeat.baseStatus === SEAT_STATUS.UNAVAILABLE_ADMIN) {
        finalStatusForThisDate = SEAT_STATUS.UNAVAILABLE_ADMIN;
      }
      else if (physicalSeat.baseStatus === SEAT_STATUS.AVAILABLE) {
        if (showDate && bookedOrReservedDbIdsForDate.has(physicalSeat.dbId)) {
          finalStatusForThisDate = SEAT_STATUS.OCCUPIED;
        }
      }

      return {
        id: `${physicalSeat.rowLetter}${physicalSeat.colNumber}`, // Display ID
        status: finalStatusForThisDate,
        dbId: physicalSeat.dbId,
      };
    });

    console.log(`Backend: Room ${roomId}, Date ${showDate || 'N/A'}, Final seatLayout sample (first 5):`, JSON.stringify(seatLayout.slice(0,5)));

    return {
      ...roomData,
      seatLayout: seatLayout,
    };

  } catch (error) {
    console.error(`Backend Error in getRoomByIdWithLayout for room ID ${roomId}, date ${showDate || 'N/A'}:`, error);
    throw error;
  }
};

const getRooms = async (filters) => {
    if (filters.id) {
        const roomDetail = await getRoomByIdWithLayout(filters.id);
        return roomDetail ? [roomDetail] : []; 
    } else {
        let query = 'SELECT id, roomNumber, movieId, totalRows, totalColumns, totalSeats FROM rooms WHERE 1=1';
        let params = [];
        try {
            const [rooms] = await pool.promise().query(query, params);
            return rooms;
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

const createRoom = async (room) => {  
    const { roomNumber, movieId, totalRows, totalColumns } = room;

    const roomQuery = 'INSERT INTO rooms (roomNumber, movieId, totalRows, totalColumns) VALUES (?, ?, ?, ?)';
    const roomParams = [roomNumber, movieId, totalRows, totalColumns];

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    try {
        const [result] = await pool.promise().query(roomQuery, roomParams);
        const roomId = result.insertId;

        const seatInserts = [];
        for (let i = 0; i < totalRows; i++) {
            const rowLetter = alphabet[i];
            for (let j = 1; j <= totalColumns; j++) {
                seatInserts.push([roomId, rowLetter, j, 'available']);
            }
        }

        const seatQuery = 'INSERT INTO seats (roomId, rowLetter, colNumber, status) VALUES ?';
        await pool.promise().query(seatQuery, [seatInserts]);

        return result.insertId;
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateRoom = async (roomId, roomDataFromFrontend) => {
    const { roomNumber, movieId, totalRows, totalColumns, layout } = roomDataFromFrontend;

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        const fieldsToUpdate = [];
        const paramsForUpdate = [];
        const isValid = (value) => value !== undefined && value !== null && value !== '';

        if (isValid(roomNumber)) { fieldsToUpdate.push('roomNumber = ?'); paramsForUpdate.push(roomNumber); }
        if (isValid(movieId)) { fieldsToUpdate.push('movieId = ?'); paramsForUpdate.push(movieId); }

        let dimensionsChanged = false;
        let oldRows, oldCols;
        let finalRows = null, finalCols = null;

        const [currentRoomState] = await connection.query('SELECT totalRows, totalColumns FROM rooms WHERE id = ?', [roomId]);
        if (currentRoomState.length === 0) {
            await connection.rollback();
            connection.release();
            throw new Error('Room not found for dimension check');
        }
        oldRows = currentRoomState[0].totalRows;
        oldCols = currentRoomState[0].totalColumns;

        finalRows = oldRows;
        finalCols = oldCols;

        if (isValid(totalRows)) {
            const parsedTotalRows = parseInt(totalRows);
            if (parsedTotalRows !== oldRows) {
                fieldsToUpdate.push('totalRows = ?');
                paramsForUpdate.push(parsedTotalRows);
                finalRows = parsedTotalRows;
                dimensionsChanged = true;
            }
        }
        if (isValid(totalColumns)) {
            const parsedTotalColumns = parseInt(totalColumns);
            if (parsedTotalColumns !== oldCols) {
                fieldsToUpdate.push('totalColumns = ?');
                paramsForUpdate.push(parsedTotalColumns);
                finalCols = parsedTotalColumns;
                dimensionsChanged = true;
            }
        }

        if (fieldsToUpdate.length > 0) {
            const updateRoomQuery = `UPDATE rooms SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
            paramsForUpdate.push(roomId);
            const [result] = await connection.query(updateRoomQuery, paramsForUpdate);
            if (result.affectedRows === 0) {
                console.warn('Room metadata update affected 0 rows. Room ID:', roomId);
            }
        }

        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        if (dimensionsChanged) {
            console.log(`Dimensions changed for room ${roomId}. Recreating seats.`);
            await connection.query('DELETE FROM seats WHERE roomId = ?', [roomId]);
            const seatInserts = [];
            if (finalRows > 0 && finalCols > 0) {
                for (let i = 0; i < finalRows; i++) {
                    const rowLetter = alphabet[i];
                    for (let j = 1; j <= finalCols; j++) {
                        const seatIdFromLayoutFormat = `${rowLetter}${j}`;
                        const layoutSeatInfo = layout && layout.find(s => s.id === seatIdFromLayout);
                        const status = (layoutSeatInfo && layoutSeatInfo.status === SEAT_STATUS.UNAVAILABLE_ADMIN) // Use your admin-set unavailable status
                                     ? SEAT_STATUS.UNAVAILABLE_ADMIN
                                     : SEAT_STATUS.AVAILABLE;
                        seatInserts.push([roomId, rowLetter, j, status]);
                    }
                }
            }
            if (seatInserts.length > 0) {
                const seatQuery = 'INSERT INTO seats (roomId, rowLetter, colNumber, status) VALUES ?';
                await connection.query(seatQuery, [seatInserts]);
            }
        } else if (layout) {
            console.log(`Updating seat statuses for room ${roomId} based on provided layout.`);

            await connection.query(
                "UPDATE seats SET status = ? WHERE roomId = ? AND status = ?",
                [SEAT_STATUS.AVAILABLE, roomId, SEAT_STATUS.UNAVAILABLE_ADMIN]
            );
        }

        await connection.commit();
        const updatedRoomFullData = await getRoomByIdWithLayout(roomId); 
        return updatedRoomFullData;

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(`Error updating room ${roomId}:`, error);
        throw error; 
    } finally {
        if (connection) connection.release();
    }
};

const deleteRoom = async (id) => {
    const seatDeleteQuery = 'DELETE FROM seats WHERE roomId = ?';
    const roomDeleteQuery = 'DELETE FROM rooms WHERE id = ?';

    const connection = await pool.promise().getConnection();

    try {
        await connection.beginTransaction();

        await connection.query(seatDeleteQuery, [id]);

        const [result] = await connection.query(roomDeleteQuery, [id]);

        await connection.commit();
        connection.release();

        return result.affectedRows > 0;
    } catch (error) {
        await connection.rollback();
        connection.release();
        throw new Error(error.message);
    }
};


module.exports = { getRooms, createRoom, updateRoom, deleteRoom };