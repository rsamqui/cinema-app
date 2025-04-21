const userService = require('../services/userService');

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const loginResult = await userService.loginUser(email, password);

        if (!loginResult) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        res.status(200).json(loginResult);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const filters = {
            id: req.query.id,
            name: req.query.nombre,
            email: req.query.email,
            role: req.query.rol
        };

        const users = await userService.getUsers(filters);
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const newUser = await userService.createUser(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const updatedUser = await userService.updateUser(userId, req.body);

        if (!updatedUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const deletedUser = await userService.deleteUser(userId);

        if (!deletedUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};