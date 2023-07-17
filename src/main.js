import { Poll } from './poll.js';

// defining constants
const admins = ['jvpeek', 'souseiseki87'];

/**
 * Creates all the DOM-Elements needed for the poll.
 * @param {Poll} poll the current poll
 */
function createPollDOM(poll) {
    const pollbox = document.getElementById('poll');
    if (poll.average) {
        //pollbox.innerHTML = poll.average.toFixed(2);
    }

    for (let i = 0; i < poll.options.length; i++) {
        // label anlegen
        const thisVoteBar = document.createElement('div');
        thisVoteBar.classList.add('voteBar');
        const thisVoteLabel = document.createElement('div');
        thisVoteLabel.classList.add('voteLabel', 'label' + i);
        thisVoteLabel.innerText = `${i + 1} - ${poll.options[i]}`;
        thisVoteBar.appendChild(thisVoteLabel);
        // balken anlegen
        const thisVoteBox = document.createElement('div');
        thisVoteBox.classList.add('voteBox', 'box' + i);

        thisVoteBar.appendChild(thisVoteBox);
        pollbox.appendChild(thisVoteBar);
    }
    const thisStatsBox = document.createElement('div');
    thisStatsBox.classList.add('stats');
    thisStatsBox.id = 'statsBox';

    const thisStatsTime = document.createElement('div');
    thisStatsTime.classList.add('stat', 'time');
    thisStatsTime.id = 'statsTime';
    thisStatsBox.appendChild(thisStatsTime);

    const thisStatsVotes = document.createElement('div');
    thisStatsVotes.classList.add('stat', 'votes');
    thisStatsVotes.id = 'statsVotes';
    thisStatsBox.appendChild(thisStatsVotes);

    const thisStatsAVG = document.createElement('div');
    thisStatsAVG.classList.add('stat', 'avg');
    thisStatsAVG.id = 'statsAVG';
    thisStatsBox.appendChild(thisStatsAVG);

    pollbox.appendChild(thisStatsBox);
}

/**
 * Renders the poll in the DOM. Assumes that the createPollDOM was used before.
 * @param {Poll} poll the current poll
 * @param {Boolean} isJvpeekmode
 */
function renderPoll(poll, isJvpeekmode = false) {
    for (let i = 0; i < poll.options.length; i++) {
        const thisVoteBox = document.querySelector(`.box${i}`);
        const width = poll.results[i] / (poll.maxVoted || 1);
        if (isJvpeekmode) {
            thisVoteBox.classList.add('peekmode');
        } else {
            thisVoteBox.classList.remove('peekmode');
        }
        if (poll.results[i] === poll.maxVoted) {
            thisVoteBox.classList.add('winning');
        } else {
            thisVoteBox.classList.remove('winning');
        }
        thisVoteBox.style.width = `${width * 100}%`;
    }

    document.getElementById('statsVotes').innerText = `Votes: ${poll.votes.size}`;
    document.getElementById('statsAVG').innerHTML = `Average: ${poll.average.toFixed(
        2
    )}<br />Median: ${poll.median.toFixed(2)}`;

    if (isJvpeekmode) {
        document.getElementById('statsAVG').innerHTML = 'JvPeek always wins';
    }
}

/**
 * Handles commands an votes.
 * @param msg - the twitch message
 * @param {Poll} poll - the current poll
 * @returns {Boolean} wether the message was a vote
 */
function handleMessage(msg, poll) {
    if (msg.event != 'PRIVMSG') return;

    const isAdmin =
        msg.tags.isModerator === true || msg.tags.badges.broadcaster === true || admins.includes(msg.username);

    // commands
    if (msg.message.startsWith('!')) {
        if (isAdmin) {
            if (msg.message.startsWith('!peek')) {
                jvpeekmode = 1;
            }
            if (msg.message.startsWith('!poke')) {
                jvpeekmode = 0;
            }

            //mod commands go here
        }

        //other commands go here.
    }

    // other messages (possibly a vote-message)
    const matches = msg.message.matchAll(/(?<=^|\s)(((?<![,.])\d+([,.]\d*)?)|([,.]\d+))(?=$|\s)/g);
    // go through all matches until we find a valid one (-> break after first valid match)
    for (const match of matches) {
        const asFloat = parseFloat(match[0].replace(',', '.'));
        const asVote = Math.round(asFloat);
        if (1 <= asVote && asVote <= poll.options.length) {
            return poll.addVote(msg.username, {
                value: asFloat,
                color: msg.tags.color || '#FF00FF',
            });
        }
    }
    return false;
}

// parse url params
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const channel = urlParams.get('channel');
const username = urlParams.get('username');
const token = urlParams.get('token');
const isJvpeekmode = urlParams.has('jvpeekmode');

const options = urlParams.get('options')?.split('|') ?? ['YES', 'NO'];
const voteTime = urlParams.get('voteTime') ?? undefined;

/** @type {Poll} */
const currentPoll = new Poll(options, voteTime);
createPollDOM(currentPoll);
renderPoll(currentPoll);

// main
(async () => {
    const { Chat } = window.TwitchJs;

    const chat = new Chat({
        token: token ?? undefined,
        username: username ?? undefined,
        log: { level: 'warn' },
    });

    chat.on('*', (message) => {
        const isVote = handleMessage(message, currentPoll);
        if (isVote) {
            renderPoll(currentPoll, isJvpeekmode);
        }
    });

    await chat.connect();
    // await chat.join(channel);

    currentPoll.start();
    // chatobj.say(channel, 'Start your votes!');
    console.log('Start your votes!');

    setTimeout(() => {
        // chatobj.say(channel, 'Vote end!');
        console.log('Vote end!');
    }, currentPoll.getRemainingTime());
})();
