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
