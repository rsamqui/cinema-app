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

const createUser = async (userData) => {
    const { name, email, password, role } = userData;

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

module.exports = { loginUser, getUsers, createUser };
