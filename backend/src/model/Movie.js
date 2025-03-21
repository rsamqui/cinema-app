class Movie {
    constructor(id, title, synopsis, duration, posterUrl) {
        this.id = id;
        this.title = title;
        this.synopsis = synopsis;
        this.duration = duration;
        this.poster = posterUrl;
    }
}

module.exports = Movie;