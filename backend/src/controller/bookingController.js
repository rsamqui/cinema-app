const bookingService = require('../services/bookingService');

exports.getBookings = async (req, res) => {
    try {
        const filters = {
            id: req.query.id,
            userId: req.query.userId,
            movieId: req.query.movieId,
            date: req.query.date,
            time: req.query.time
        };

        const bookings = await bookingService.getBookings(filters);
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createBooking = async (req, res) => {
    console.log("Backend Controller: Received req.body for booking:", JSON.stringify(req.body, null, 2));
    try {
        const newBookingTicketDetails = await bookingService.createBooking(req.body);
        res.status(201).json(newBookingTicketDetails);
    } catch (error) {
        console.error("Backend Controller Error in createBooking:", error.message);
        res.status(400).json({ error: error.message });
    }
};

exports.getBookingDetailsForTicket = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const bookingDetails = await bookingService.getBookingDetailsForTicket(bookingId);

        if (!bookingDetails) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        res.json(bookingDetails);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.updateBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const updatedBooking = await bookingService.updateBooking(bookingId, req.body);

        if (!updatedBooking) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        res.json(updatedBooking);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const result = await bookingService.deleteBooking(bookingId);

        res.json({ message: 'Reserva eliminada correctamente', result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

