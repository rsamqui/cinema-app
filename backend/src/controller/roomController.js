const roomService = require('../services/roomService');

exports.getRooms = async (req, res) => {
    try {
        const filters = {
            id: req.query.id,
            name: req.query.name,
            capacity: req.query.capacity,
            type: req.query.type
        };

        const rooms = await roomService.getRooms(filters);
        res.json(rooms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createRoom = async (req, res) => {
    try {
        const newRoom = await roomService.createRoom(req.body);
        res.status(201).json(newRoom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateRoom = async (req, res) => {
    try {
        const updatedRoom = await roomService.updateRoom(req.params.id, req.body);
        res.json(updatedRoom);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        await roomService.deleteRoom(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
