import { Poll } from './poll.js';

// defining constants
const admins = ['jvpeek', 'souseiseki87'];

/**
 * Handles commands an votes.
 * @param msg - the twitch message
 * @param {Poll} poll - the current poll
 * @returns {Poll} either the current poll (if the message doesn't create a new one) or a new poll
 */
function handleMessage(msg, poll) {
    if (msg.event != 'PRIVMSG') return poll;

    const isAdmin =
        msg.tags.isModerator === true || msg.tags.badges.broadcaster === true || admins.includes(msg.username);

    // commands
    if (msg.message.startsWith('!')) {
        if (isAdmin) {
            //mod commands go here
            if (msg.message.startsWith('!peek')) {
                poll.jvpeekmode = true;
                poll.rerender();
                return poll;
            }
            if (msg.message.startsWith('!poke')) {
                poll.jvpeekmode = false;
                poll.rerender();
                return poll;
            }

            if (msg.message.startsWith('!poll')) {
                const header = msg.message.match(/(?<=header=")[^"]*(?=")/);
                const options = msg.message.match(/(?<=options=")[^"]*(?=")/);

                if (!header || !options) {
                    return poll;
                }

                const time = msg.message.match(/(?<=time=")[^"]*(?=")/);
                const min = msg.message.match(/(?<=min=")[^"]*(?=")/);
                const step = msg.message.match(/(?<=step=")[^"]*(?=")/);

                return new Poll(
                    header[0],
                    options[0].split('|'),
                    parseInt(time?.[0] ?? '30') * 1000,
                    parseInt(min?.[0] ?? '1'),
                    parseInt(step?.[0] ?? '1')
                );
            }

            if (msg.message.startsWith('!startpoll')) {
                poll.start();
                return poll;
            }

            if (msg.message.startsWith('!restartpoll')) {
                const newPoll = new Poll(poll.title, poll.options, poll.voteTime, poll.min, poll.step);
                newPoll.start();
                return newPoll;
            }
        }

        //other commands go here.
    }

    // other messages (possibly a vote-message)
    // matches all numbers that are not inside a word (i.e. whitespace or nothing left and right)
    const matches = msg.message.matchAll(/(?<=^|\s)-?(((?<![,.])\d+([,.]\d*)?)|([,.]\d+))(?=$|\s)/g);
    // go through all matches until we find a valid one (-> break after first valid match)
    for (const match of matches) {
        const asFloat = parseFloat(match[0].replace(',', '.'));
        const valid = poll.addVote(msg.username, {
            value: asFloat,
            color: msg.tags.color || '#FF00FF',
        });
        if (valid) {
            poll.rerender();
            return poll;
        }
    }

    return poll;
}

// parse url params
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
// required
const channel = urlParams.get('channel');
if (!channel) {
    document.getElementById('container').classList.add('hide');
    document.getElementById('error').classList.remove('hide');
    document.getElementById('url').innerText = `${window.location}${
        window.location.toString().includes('?') ? '&' : '?'
    }channel=your_channel`;
    throw Error('Missing channel-parameter in URL');
}
// optional
const token = urlParams.get('token');
const username = urlParams.get('username');

/** @type {Poll} */
let currentPoll;

const header = urlParams.get("header");
const options = urlParams.get("options");
if (header && options) {
    // url-param setup
    const time = urlParams.get("time");
    const min = urlParams.get("min");
    const step = urlParams.get("step");
    currentPoll = new Poll(
        header.replaceAll(/\\n/g, '\n'), // since \n is escaped (to \\n)
        options.split('|'),
        parseInt(time ?? '30') * 1000,
        parseInt(min ?? '1'),
        parseInt(step ?? '1')
    );
} else {
    // default setup (with showcase poll)
    currentPoll = new Poll(
        'Use the command\n' +
            '`!poll header="&lt;header&gt;" options="&lt;option1|option2|...&gt;" time="&lt;voteTimeInMs&gt;" min="&lt;min&gt;" step="&lt;step&gt;"`\n' +
            'to create a poll!\n\n' +
            'Example: `!poll header="Hat dir der Clip gefallen?\\nStimme jetzt ab!" options="YES|NO" time="30"`',
        [
            'header     - is the text above, use `\\n` for line-breaks',
            'options    - are all options to vote for, separated by `|`',
            'time       - optional, is the time to vote in seconds, defaults to 30s',
            'min        - optional, smallest allowed number, defaults to 1',
            'step       - optional, increment between two options, defaults to 1',
            'further commands:',
            '`!startpoll` - used to start the current poll',
            '`!restartpoll` - used to restart the current poll',
        ]
    );
    currentPoll.start();
    for (let i = 0; i < currentPoll.options.length; i++) {
        const rand = i === 5 ? 20 : Math.random() * 20;
        for (let j = 0; j <= rand; j++) {
            currentPoll.addVote(`${i+1}|${j}`, { value: i+1 });
        }
    }
    currentPoll.rerender();
}

// main
(async () => {
    const { Chat } = window.TwitchJs;
    let initObj = {
        log: { level: 'warn' },
    };
    if (token && username) {
        initObj = {
            ...initObj,
            token,
            username,
        };
    }
    const chat = new Chat(initObj);

    chat.on('*', (message) => {
        currentPoll = handleMessage(message, currentPoll);
    });

    await chat.connect();
    await chat.join(channel);
    // use this to write something into the chat; only works with username and token
    // chat.say(channel, 'What you wan't the bot to say');
})();
