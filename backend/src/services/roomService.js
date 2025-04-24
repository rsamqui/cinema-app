const pool = require('../config/db');

const getRooms = async (filters) => {
    let query = 'SELECT * FROM rooms WHERE 1=1';
    let params = [];

    if (filters.id) {
        query += ' AND id = ?';
        params.push(filters.id);
    }

    if (filters.name) {
        query += ' AND name = ?';
        params.push(filters.name);
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
  

const updateRoom = async (id, room) => {
    const fields = [];
    const params = [];

    const isValid = (value) => value !== undefined && value !== null && value !== '';

    if (isValid(room.roomNumber)) {
        fields.push('roomNumber = ?');
        params.push(room.roomNumber);
    }

    if (isValid(room.movieId)) {
        fields.push('movieId = ?');
        params.push(room.movieId);
    }

    if (isValid(room.totalRows)) {
        fields.push('totalRows = ?');
        params.push(room.totalRows);
    }

    if (isValid(room.totalColumns)) {
        fields.push('totalColumns = ?');
        params.push(room.totalColumns);
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    const updateQuery = `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    try {
        const connection = await pool.promise().getConnection();
        await connection.beginTransaction();

        const [result] = await connection.query(updateQuery, params);

        if (result.affectedRows === 0) {
            throw new Error('Room not found');
        }

        await connection.query('DELETE FROM seats WHERE roomId = ?', [id]);

        if (isValid(room.totalRows) && isValid(room.totalColumns)) {
            const seatInserts = [];

            for (let i = 0; i < room.totalRows; i++) {
                const rowLetter = alphabet[i];
                for (let j = 1; j <= room.totalColumns; j++) {
                    seatInserts.push([id, rowLetter, j, 'available']);
                }
            }

            const seatQuery = 'INSERT INTO seats (roomId, rowLetter, colNumber, status) VALUES ?';
            await connection.query(seatQuery, [seatInserts]);
        }

        await connection.commit();
        connection.release();

        return { id, ...room };
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        throw new Error(error.message);
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