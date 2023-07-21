import { Poll } from './poll.js';

// defining constants
const admins = ['jvpeek', 'souseiseki87'];

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
            //mod commands go here
            // TODO: add commands to create, and start a poll via the chat
            if (msg.message.startsWith('!peek')) {
                poll.jvpeekmode = true;
            }
            if (msg.message.startsWith('!poke')) {
                poll.jvpeekmode = false;
            }
        }

        //other commands go here.
    }

    // other messages (possibly a vote-message)
    const matches = msg.message.matchAll(/(?<=^|\s)(((?<![,.])\d+([,.]\d*)?)|([,.]\d+))(?=$|\s)/g);
    // go through all matches until we find a valid one (-> break after first valid match)
    for (const match of matches) {
        const asFloat = parseFloat(match[0].replace(',', '.'));
        return poll.addVote(msg.username, {
            value: asFloat,
            color: msg.tags.color || '#FF00FF',
        });
    }
    return false;
}

// parse url params
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const channel = urlParams.get('channel');
const username = urlParams.get('username');
const token = urlParams.get('token');

/** @type {Poll} */
const currentPoll = new Poll('Hat dir der Clip gefallen?\nStimme jetzt ab!', ['YES', 'NO', 'MAYBE'], 30_000, 0, 0.5);

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
            currentPoll.rerender();
        }
    });

    await chat.connect();
    if (channel) {
        await chat.join(channel);
    }
    currentPoll.start();
    // chatobj.say(channel, 'Start your votes!');
    console.log('Start your votes!');

    // Test:
    // /*
    setTimeout(() => {
        currentPoll.addVote('a', { value: 0, color: '#FF00FF' });
        currentPoll.addVote('b', { value: 0.5, color: '#FF00FF' });
        currentPoll.addVote('c', { value: 1, color: '#FF00FF' });
        currentPoll.addVote('d', { value: -1, color: '#FF00FF' });
        currentPoll.addVote('e', { value: 0.1, color: '#FF00FF' });
        currentPoll.addVote('f', { value: 0.25, color: '#FF00FF' });
        currentPoll.addVote('g', { value: 1.01, color: '#FF00FF' });
        currentPoll.addVote('g', { value: 0.24999999, color: '#FF00FF' });
        setTimeout(() => {
            currentPoll.rerender();
            setTimeout(() => {
                const newPoll = new Poll('TEST TEST TEST', [':)', ':('], 10_000, 1, 1);
                newPoll.jvpeekmode = true;
                setTimeout(() => {
                    newPoll.start();
                    newPoll.addVote('a', { value: 1, color: '#FF00FF' });
                    newPoll.addVote('b', { value: 1, color: '#FF00FF' });
                    newPoll.addVote('c', { value: 2, color: '#FF00FF' });
                    newPoll.rerender();
                }, 2000);
            }, 5000);
        }, 1000);
    }, 1000);
    // */
})();
