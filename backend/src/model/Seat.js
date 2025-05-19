class Seat {
    constructor(id, roomId, rowLetter, colNumber, status) {
        this.id = id;
        this.roomId = roomId;
        this.rowLetter = rowLetter;
        this.colNumber = colNumber;
        this.status = status;
    }
}

module.exports = Seat;