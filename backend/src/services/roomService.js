const pool = require('../config/db');

const getRoomByIdWithLayout = async (roomId) => {
  try {
    // 1. Fetch room metadata
    const roomQuery = 'SELECT id, roomNumber, movieId, totalRows, totalColumns, totalSeats FROM rooms WHERE id = ?';
    const [roomRows] = await pool.promise().query(roomQuery, [roomId]);

    if (roomRows.length === 0) {
      throw new Error('Room not found');
    }
    const roomData = roomRows[0];

    // 2. Fetch associated seats
    const seatsQuery = 'SELECT rowLetter, colNumber, status FROM seats WHERE roomId = ?';
    const [seatRows] = await pool.promise().query(seatsQuery, [roomId]);

    // 3. Format seatLayout for the frontend
    const seatLayout = seatRows.map(seat => ({
      id: `${seat.rowLetter}${seat.colNumber}`,
      status: seat.status,
    }));

    // 4. Combine and return
    return {
      ...roomData,
      seatLayout: seatLayout,
    };
  } catch (error) {
    console.error(`Error fetching room details for ID ${roomId}:`, error);
    throw error;
  }
};

// Your existing getRooms might be for fetching a list of rooms without detailed seats
const getRooms = async (filters) => {
    let query = 'SELECT id, roomNumber, movieId, totalRows, totalColumns, totalSeats FROM rooms WHERE 1=1'; // Added 'totalSeats'
    let params = [];

    if (filters.id) {
        query += ' AND id = ?';
        params.push(filters.id);
    }

    try {
        const [rooms] = await pool.promise().query(query, params);
        return rooms;
    } catch (error) {
        throw new Error(error.message);
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
    const { roomNumber, movieId, totalRows, totalColumns, name, layout } = roomDataFromFrontend;

    const connection = await pool.promise().getConnection();
    try {
        await connection.beginTransaction();

        // --- Part 1: Update Room Metadata ---
        const fieldsToUpdate = [];
        const paramsForUpdate = [];
        const isValid = (value) => value !== undefined && value !== null && value !== '';

        if (isValid(roomNumber)) { fieldsToUpdate.push('roomNumber = ?'); paramsForUpdate.push(roomNumber); }
        if (isValid(movieId)) { fieldsToUpdate.push('movieId = ?'); paramsForUpdate.push(movieId); }

        let dimensionsChanged = false;
        let oldRows, oldCols;

        // Fetch current dimensions if rows/cols are part of the update, to see if they changed
        if (isValid(totalRows) || isValid(totalColumns)) {
            const [currentRoomState] = await connection.query('SELECT totalRows, totalColumns FROM rooms WHERE id = ?', [roomId]);
            if (currentRoomState.length === 0) throw new Error('Room not found for dimension check');
            oldRows = currentRoomState[0].totalRows;
            oldCols = currentRoomState[0].totalColumns;

            if (isValid(totalRows) && parseInt(totalRows) !== oldRows) {
                fieldsToUpdate.push('totalRows = ?');
                paramsForUpdate.push(totalRows);
                dimensionsChanged = true;
            }
            if (isValid(totalColumns) && parseInt(totalColumns) !== oldCols) {
                fieldsToUpdate.push('totalColumns = ?');
                paramsForUpdate.push(totalColumns);
                dimensionsChanged = true;
            }
        }

        if (fieldsToUpdate.length > 0) {
            const updateRoomQuery = `UPDATE rooms SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
            paramsForUpdate.push(roomId);
            const [result] = await connection.query(updateRoomQuery, paramsForUpdate);
            if (result.affectedRows === 0) {
                // This might happen if no actual values changed, or room not found
                // Consider if this should be an error or just a "no update needed"
                console.warn('Room metadata update affected 0 rows. Room ID:', roomId);
            }
        }

        // --- Part 2: Update/Recreate Seat Layout ---
        const finalRows = dimensionsChanged && isValid(totalRows) ? parseInt(totalRows) : oldRows;
        const finalCols = dimensionsChanged && isValid(totalColumns) ? parseInt(totalColumns) : oldCols;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

        if (dimensionsChanged) {
            // If dimensions change, it's usually easiest to delete and recreate all seats
            await connection.query('DELETE FROM seats WHERE roomId = ?', [roomId]);
            const seatInserts = [];
            for (let i = 0; i < finalRows; i++) {
                const rowLetter = alphabet[i];
                for (let j = 1; j <= finalCols; j++) {
                    const seatIdFromLayout = `${rowLetter}${j}`;
                    seatInserts.push([roomId, rowLetter, j, layoutInfo ? 'blocked' : 'available']);
                }
            }
            if (seatInserts.length > 0) {
                const seatQuery = 'INSERT INTO seats (roomId, rowLetter, colNumber, status) VALUES ?';
                await connection.query(seatQuery, [seatInserts]);
            }
        } else if (layout) {
            await connection.query(
                "UPDATE seats SET status = 'available' WHERE roomId = ? AND status = 'blocked'", // Only unblock previously 'blocked' seats
                [roomId]
            );
            for (const seat of layout) {
                if (seat.status === 'blocked') { // Only process 'blocked' statuses from frontend for this update
                    const rowLetter = seat.id.charAt(0);
                    const colNumber = parseInt(seat.id.substring(1));
                    // Update to blocked, but be careful not to override a 'taken' or 'reserved' seat
                    // (though admin UI should prevent this).
                    await connection.query(
                        "UPDATE seats SET status = 'blocked' WHERE roomId = ? AND rowLetter = ? AND colNumber = ? AND status = 'available'",
                        [roomId, rowLetter, colNumber]
                    );
                }
            }
        }

        await connection.commit();
        const updatedRoomFullData = await getRoomByIdWithLayout(roomId);
        return updatedRoomFullData;

    } catch (error) {
        await connection.rollback();
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