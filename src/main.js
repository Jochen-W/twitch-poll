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
            // TODO: add commands to create, and start a poll via the chat
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
                    parseInt(time ?? '30000'),
                    parseInt(min ?? '1'),
                    parseInt(step ?? '1')
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
let currentPoll = new Poll( // showcase poll
    'Use the command\n' +
        '`!poll header="&lt;header&gt;" options="&lt;option1|option2|...&gt;" time="&lt;voteTimeInMs&gt;" min="&lt;min&gt;" step="&lt;step&gt;"`\n' +
        'to create a poll!\n\n' +
        'Example: `!poll header="Hat dir der Clip gefallen?\\nStimme jetzt ab!" options="YES|NO" time="30000"`',
    [
        'header     - is the text above, use `\\n` for line-breaks',
        'options    - are all options to vote for, separated by `|`',
        'time       - optional, is the time to vote in milliseconds, defaults to 30000ms',
        'min        - optional, smallest allowed number, defaults to 1',
        'step       - optional, increment between two options, defaults to 1',
        'further commands:',
        '`!startpoll` - used to start the current poll',
        '`!restartpoll` - used to restart the current poll',
    ]
);
currentPoll.start();
for (let i = 0; i <= 7; i++) {
    currentPoll.addVote(`1-${i}`, { value: 1 });
}
for (let i = 0; i <= 7; i++) {
    currentPoll.addVote(`2-${i}`, { value: 2 });
}
for (let i = 0; i <= 10; i++) {
    currentPoll.addVote(`3-${i}`, { value: 3 });
}
for (let i = 0; i <= 8; i++) {
    currentPoll.addVote(`4-${i}`, { value: 4 });
}
for (let i = 0; i <= 9; i++) {
    currentPoll.addVote(`5-${i}`, { value: 5 });
}
for (let i = 0; i <= 20; i++) {
    currentPoll.addVote(`6-${i}`, { value: 6 });
}
for (let i = 0; i <= 2; i++) {
    currentPoll.addVote(`7-${i}`, { value: 7 });
}
for (let i = 0; i <= 3; i++) {
    currentPoll.addVote(`8-${i}`, { value: 8 });
}
currentPoll.rerender();

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

    // Test:
    // /*
    const msgTemplate = {
        event: 'PRIVMSG',
        tags: {
            isModerator: true,
            badges: {
                broadcaster: true,
            },
            color: '#FF00FF',
        },
        username: 'user',
        message: 'msg',
    };
    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // check if nothing happens when not started
    console.log('Not allowed vote');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '1',
        },
        currentPoll
    );
    await sleep(1_000);
    // try create new
    console.log('Wrong new poll');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '!poll header="NICE HEADER" time="0"',
        },
        currentPoll
    );
    await sleep(1_000);
    // create new
    console.log('New poll');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '!poll options="1|2|3|TEST" header="NICE HEADER"',
        },
        currentPoll
    );
    await sleep(1_000);
    // start current
    console.log('Start poll');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '!startpoll',
        },
        currentPoll
    );
    await sleep(1_000);
    console.log('Votes...');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '3',
            username: 'user1',
        },
        currentPoll
    );
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: 'ich nehm auch 3, du hund',
            username: 'user2',
        },
        currentPoll
    );
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '2 für mich',
            username: 'user3',
        },
        currentPoll
    );
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: 'ich bin dumm und nehme die 0, -0 oder vlt doch die 4xD !!!!1!',
            username: 'dumbUser',
        },
        currentPoll
    );
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '1.01',
            username: 'user4',
        },
        currentPoll
    );
    await sleep(2_000);
    console.log('PEEKMODE');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '!peek',
        },
        currentPoll
    );
    await sleep(5_000);
    console.log('poke :(');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '!poke',
        },
        currentPoll
    );
    await sleep(3_000);
    // overwrite
    console.log('New poll');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message:
                '!poll options="1,2,3|4|4|5|x|y" header="NEW HEADER\nLINE BREAK" time="5000" min="0" step="10" max="70"',
        },
        currentPoll
    );
    await sleep(2_000);
    console.log('Start poll');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '!startpoll',
        },
        currentPoll
    );
    await sleep(6_000);
    console.log('Out of time vote');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '3',
            username: 'user1',
        },
        currentPoll
    );
    console.log('New poll');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message: '!restartpoll',
        },
        currentPoll
    );
    await sleep(3_000);
    console.log('New poll');
    currentPoll = handleMessage(
        {
            ...msgTemplate,
            message:
                '!poll options="never|trust|user|input" header="HACKER-MAN <script> alert(\'you got hacked!\'); </script>" time="5000" min="0" step="10" max="70"',
        },
        currentPoll
    );
    // */
})();
