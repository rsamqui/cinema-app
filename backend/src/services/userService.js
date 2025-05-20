const pool = require('../config/db');
const jwtUtils = require('../utils/jwtUtils');
const passwordUtils = require('../utils/passwordUtils');

const loginUser = async (email, password) => {
    const query = 'SELECT * FROM users WHERE email = ?';

    try {
        const [users] = await pool.promise().query(query, [email]);

        if (users.length === 0) {
            return null;
        }

        const user = users[0];

        const isPasswordValid = await passwordUtils.comparePasswords(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        const token = jwtUtils.generateToken(user);

        return { 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role 
            } 
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

const getUsers = async (filters) => {
    let query = 'SELECT id, name, email, role FROM users WHERE 1=1';
    let params = [];

    if (filters.id) {
        query += ' AND id = ?';
        params.push(filters.id);
    }

    if (filters.name) {
        query += ' AND name = ?';
        params.push(filters.name);
    }

    if (filters.email) {
        query += ' AND email = ?';
        params.push(filters.email);
    }

    if (filters.role) {
        query += ' AND role = ?';
        params.push(filters.role);
    }

    try {
        const [results] = await pool.promise().query(query, params);
        return results;
    } catch (error) {
        throw new Error(error.message);
    }
};

const getUserById = async (id) => {
    const query = 'SELECT id, name, email, role FROM users WHERE id = ?';
    let params = [id];
    try {
        const [results] = await pool.promise().query(query, params);
        return results;
    } catch (error) {
        throw new Error(error.message);
    }
};

const createUser = async (userData) => {
    const { name, email, password, role = 'client' } = userData;

    const hashedPassword = await passwordUtils.hashPassword(password);

    const query = 'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)';
    try {
        const [result] = await pool.promise().query(query, [name, email, hashedPassword, role]);
        
        return { 
            id: result.insertId, 
            name, 
            email, 
            role 
        };
    } catch (error) {
        throw new Error(error.message);
    }
};

const updateUser = async (userId, userData) => {
    const fields = [];
    const params = [];

    const isValid = (value) => value !== undefined && value !== null && value !== '';

    if (isValid(userData.name)) {
        fields.push('name = ?');
        params.push(userData.name);
    }

    if (isValid(userData.email)) {
        fields.push('email = ?');
        params.push(userData.email);
    }

    if (isValid(userData.password)) {
        const hashedPassword = await passwordUtils.hashPassword(userData.password);
        fields.push('password = ?');
        params.push(hashedPassword);
    }

    if (isValid(userData.role)) {
        fields.push('role = ?');
        params.push(userData.role);
    }

    if (fields.length === 0) {
        throw new Error('No hay campos válidos para actualizar');
    }

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    params.push(userId);

    try {
        const [result] = await pool.promise().query(query, params);

        if (result.affectedRows === 0) {
            return new Error('Usuario no encontrado');
        }

        // Retorna solo los datos que se actualizaron
        const updatedUser = { id: userId };
        fields.forEach((field, index) => {
            const key = field.split('=')[0].trim();
            updatedUser[key] = params[index];
        });

        return updatedUser;
    } catch (error) {
        throw new Error(error.message);
    }
};



const deleteUser = async (userId) => {
    const query = 'DELETE FROM users WHERE id = ?';

    try {
        const [result] = await pool.promise().query(query, [userId]);

        if (result.affectedRows === 0) {
            return null;
        }

        return { message: 'Usuario eliminado' };
    } catch (error) {
        throw new Error(error.message);
    }
};

module.exports = { loginUser, getUsers, getUserById, createUser, updateUser, deleteUser };
