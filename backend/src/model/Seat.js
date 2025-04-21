class Seat {
    constructor(id, roomId, rowLetter, colNumber) {
        this.id = id;
        this.roomId = roomId;
        this.rowLetter = rowLetter;
        this.colNumber = colNumber;
    }
}

module.exports = Seat;