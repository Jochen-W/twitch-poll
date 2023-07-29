/**
 * @typedef {Object} Vote
 * @property {number} value - vote / voted number
 * @property {String} color - display-color of username in twitch chat (msg.tags.color)
 */

function durationAsString(duration) {
    const deciSecond = Math.floor((duration / 100) % 10);
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (60 * 1000)) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${deciSecond}`;
}

function escape(htmlStr) {
    // escapes `<`, `>` and `&`
    return htmlStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class Poll {
    /**
     * @param {String} title title of the poll
     * @param {String[]} options sorted list of all options to vote for
     * @param {number} voteTime in milliseconds
     * @param {number} min minimum vote number
     * @param {number} step number distance between two numbers
     */
    constructor(title, options, voteTime = 30_000, min = 1, step = 1) {
        this.title = escape(title);
        this.options = options;
        this.voteTime = voteTime;
        this.min = min;
        this.step = step;
        this.jvpeekmode = false;

        this.votes = new Map();
        this.results = Array.from({ length: options.length }).fill(0);

        this.startTime = null;
        this.createDOM();
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
        const timeDiv = document.getElementById('time');
        timeDiv.style.opacity = 1.0;
        const timeCircle = document.getElementById('circle');
        const intervalID = setInterval(() => {
            if (timeDiv.getAttribute('activeIntervalID') == intervalID) {
                const remainingTime = this.getRemainingTime();
                timeDiv.innerText = remainingTime === 0 ? 'Ende' : durationAsString(remainingTime);
                const percentage = remainingTime / this.voteTime;
                timeCircle.style.setProperty('--percent', percentage);
                if (remainingTime !== 0 && (percentage < 0.1 || (remainingTime < 10_000 && percentage < 0.5))) {
                    timeDiv.classList.add('critical');
                } else {
                    timeDiv.classList.remove('critical');
                }
            } else {
                clearInterval(intervalID);
            }
        }, 100);
        timeDiv.setAttribute('activeIntervalID', intervalID);
        setTimeout(() => {
            if (timeDiv.getAttribute('activeIntervalID') == intervalID) {
                clearInterval(intervalID);
            }
        }, this.voteTime);
    }

    getRemainingTime() {
        if (!this.startTime) {
            return this.voteTime;
        }

        return Math.max(this.voteTime - (Date.now() - this.startTime), 0);
    }

    /**
     * @param {number} voteValue
     * @returns {number} index (used in results-array)
     */
    voteValueToIndex(voteValue) {
        return Math.round((voteValue - this.min) / this.step);
    }

    /**
     * @param {number} voteValue
     * @returns {Boolean} index (used in results-array)
     */
    isVoteValueValid(voteValue) {
        // TODO: maybe don't allow values exactly in between two values?
        return voteValue >= this.min && voteValue <= this.min + (this.options.length - 1) * this.step;
    }

    /**
     * @param {String} username
     * @param {Vote} vote - vote to add
     * @returns {Boolean} wether the vote was allowed (in time and allowed value).
     */
    addVote(username, vote) {
        if (this.getRemainingTime() <= 0 || !this.startTime) {
            return false;
        }
        if (!this.isVoteValueValid(vote.value)) {
            return false;
        }
        if (this.votes.has(username)) {
            this.results[this.voteValueToIndex(this.votes.get(username).value)]--;
        }
        this.votes.set(username, vote);
        this.results[this.voteValueToIndex(vote.value)]++;
        return true;
    }

    createDOM() {
        const barTemplate = document.getElementById('voteBarTemplate');
        const pollDiv = document.getElementById('poll');
        // clear old poll
        pollDiv.innerHTML = '';
        document.getElementById('votes').innerText = 0;
        document.getElementById('average').innerText = '0.0';
        document.getElementById('median').innerText = '0.0';
        const timeDiv = document.getElementById('time');
        timeDiv.setAttribute('activeIntervalID', -1); // remove last interval
        timeDiv.innerText = durationAsString(this.getRemainingTime());
        timeDiv.style.opacity = 0.5;
        document.getElementById('circle').style.setProperty('--percent', 0);
        // and or change to new states
        document.getElementById('header').innerHTML = this.title.replaceAll('\n', '<br>');

        for (let i = 0; i < this.options.length; i++) {
            const bar = barTemplate.content.cloneNode(true);
            const numberLabel = bar.getElementById('voteNumberX');
            numberLabel.id = `voteNumber${i}`;
            numberLabel.innerText = i * this.step + this.min;
            const line = bar.getElementById('voteLineX');
            line.id = `voteLine${i}`;
            line.style.width = '0%';
            const label = bar.getElementById('voteLabelX');
            label.id = `voteLabel${i}`;
            label.innerText = this.options[i];
            bar.getElementById('votePercentageX').id = `votePercentage${i}`;
            pollDiv.appendChild(bar);
        }
    }

    rerender() {
        document.getElementById('votes').innerText = this.votes.size;
        document.getElementById('median').innerText = this.jvpeekmode ? '-' : this.median.toFixed(2);
        const avgSpan = document.getElementById('average');
        avgSpan.innerText = this.jvpeekmode ? 'JvPeek always wins' : this.average.toFixed(2);
        if (this.jvpeekmode) {
            avgSpan.classList.add('peekmode');
        } else {
            avgSpan.classList.remove('peekmode');
        }

        for (let i = 0; i < this.options.length; i++) {
            const width = this.results[i] / (this.maxVoted || 1);
            const percentage = this.results[i] / (this.votes.size || 1);

            const line = document.getElementById(`voteLine${i}`);
            line.style.width = `${width * 100}%`;
            const textLabel = document.getElementById(`voteLabel${i}`);
            const percentageLabel = document.getElementById(`votePercentage${i}`);
            percentageLabel.innerText = `${(percentage * 100).toFixed(2)}%`;

            if (this.jvpeekmode) {
                line.classList.add('peekmode');
            } else {
                line.classList.remove('peekmode');
            }

            if (this.results[i] === this.maxVoted) {
                line.classList.add('winning');
                textLabel.classList.add('winning');
                percentageLabel.classList.add('winning');
            } else {
                line.classList.remove('winning');
                textLabel.classList.remove('winning');
                percentageLabel.classList.remove('winning');
            }
        }
    }
}
