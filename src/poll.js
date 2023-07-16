/**
 * @typedef {Object} Vote
 * @property {number} value - vote / voted number
 * @property {String} color - display-color of username in twitch chat (msg.tags.color)
 */

export class Poll {
    /**
     * @param {String[]} options sorted list of all options to vote for
     * @param {number} voteTime in milliseconds
     */
    constructor(options, voteTime = 30_000) {
        this.options = options;
        this.voteTime = voteTime;

        this.votes = new Map();
        this.results = Array.from({ length: options.length }).fill(0);

        this.startTime = null;
    }

    /**
     * @returns {number} the average of all votes
     */
    get average() {
        if (this.votes.size === 0) {
            return 0;
        }
        const sum = Array.from(this.votes.values()).reduce((sum, v) => sum + v.value, 0);
        return sum / this.votes.size;
    }

    /**
     * @returns {number} the maximum number of votes for one option
     */
    get maxVoted() {
        return Math.max(...this.results);
    }

    /**
     * @returns {number} the median of all votes
     */
    get median() {
        if (this.votes.size === 0) {
            return 0;
        }

        const values = Array.from(this.votes.values()).map((v) => v.value);
        values.sort((a, b) => a - b);
        const mid = Math.floor(values.length / 2);
        if (values.length % 2 === 1) {
            return values[mid];
        }
        return (values[mid - 1] + values[mid]) / 2.0;
    }

    start() {
        this.startTime = Date.now();
    }

    getRemainingTime() {
        if (!this.startTime) {
            return this.voteTime;
        }

        return Math.max(this.voteTime - (Date.now() - this.startTime), 0);
    }

    /**
     * @param {String} username
     * @param {Vote} vote - vote to add
     * @returns {Boolean} wether the vote was allowed (in time and allowed value).
     */
    addVote(username, vote) {
        if (this.getRemainingTime() <= 0) {
            return false;
        }
        const valueRounded = Math.round(vote.value);
        if (valueRounded < 1 && valueRounded > this.options.length) {
            return false;
        }
        if (this.votes.has(username)) {
            this.results[Math.round(this.votes.get(username).value) - 1]--;
        }
        this.votes.set(username, vote);
        this.results[valueRounded - 1]++;
        return true;
    }
}
