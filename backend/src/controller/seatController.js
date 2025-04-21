const seatService = require('../services/seatService');

exports.getSeats = async (req, res) => {
    try {
        const filters = {
            id: req.query.id,
            movieId: req.query.movieId,
            row: req.query.row,
            column: req.query.column,
            status: req.query.status
        };

        const seats = await seatService.getSeats(filters);
        res.json(seats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createSeat = async (req, res) => {
    try {
        const newSeat = await seatService.createSeat(req.body);
        res.status(201).json(newSeat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSeat = async (req, res) => {
    try {
        const seatId = req.params.id;
        const updatedSeat = await seatService.updateSeat(seatId, req.body);

        if (!updatedSeat) {
            return res.status(404).json({ error: 'Asiento no encontrado' });
        }

        res.json(updatedSeat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteSeat = async (req, res) => {
    try {
        const seatId = req.params.id;
        const deletedSeat = await seatService.deleteSeat(seatId);

        if (!deletedSeat) {
            return res.status(404).json({ error: 'Asiento no encontrado' });
        }

        res.json({ message: 'Asiento eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};