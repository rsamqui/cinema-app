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
    const { name, capacity } = room;

    if (!name || !capacity) {
        throw new Error('All fields are required');
    }

    const query = 'INSERT INTO rooms (name, capacity) VALUES (?, ?)';

    try {
        const [result] = await pool.promise().query(query, [room.name, room.capacity]);
        return {
            id: result.insertId,
            name,
            capacity
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateRoom = async (id, room) => {
    const fields = [];
    const params = [];

    const isValid = (value) => value !== undefined && value !== null && value !== '';

    if (isValid(room.name)) {
        fields.push('name = ?');
        params.push(room.name);
    }

    if (isValid(room.capacity)) {
        fields.push('capacity = ?');
        params.push(room.capacity);
    }

    if (fields.length === 0) {
        throw new Error('No fields to update');
    }

    const query = `UPDATE rooms SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    try {
        const [result] = await pool.promise().query(query, params);
        
        if (result.affectedRows === 0) {
            throw new Error('Room not found');
        }

        const updatedRoom = { id: id };
        fields.forEach((field, index) => {
            const key = field.split(' = ')[0].trim();
            updatedRoom[key] = params[index];
        });

        return updatedRoom;
    } catch (error) {
        throw new Error(error.message);
    }
};

const deleteRoom = async (id) => {
    const query = 'DELETE FROM rooms WHERE id = ?';

    try {
        const [result] = await pool.promise().query(query, [id]);
        return result.affectedRows > 0;
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { getRooms, createRoom, updateRoom, deleteRoom };