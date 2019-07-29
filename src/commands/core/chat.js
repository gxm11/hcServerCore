/*
  Description: Rebroadcasts any `text` to all clients in a `channel`
*/

// module support functions
const parseText = (text) => {
  // verifies user input is text
  if (typeof text !== 'string') {
    return false;
  }

  // strip newlines from beginning and end
  text = text.replace(/^\s*\n|^\s+$|\n\s*$/g, '');
  // replace 3+ newlines with just 2 newlines
  text = text.replace(/\n{3,}/g, "\n\n");

  return text;
};

// module main
exports.run = async (core, server, socket, data) => {
  // check user input
  let text = parseText(data.text);

  if (!text) {
    // lets not send objects or empty text, yea?
    return server.police.frisk(socket.remoteAddress, 13);
  }

  // check for spam
  let score = text.length / 83 / 4;
  if (server.police.frisk(socket.remoteAddress, score)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.'
    }, socket);
  }

  // build chat payload
  let payload = {
    cmd: 'chat',
    nick: socket.nick,
    text: text
  };

  if (socket.uType == 'admin') {
    payload.admin = true;
  } else if (socket.uType == 'mod') {
    payload.mod = true;
  }

  if (socket.trip) {
    payload.trip = socket.trip;
  }

  // broadcast to channel peers
  server.broadcast( payload, { channel: socket.channel});

  // stats are fun
  core.stats.increment('messages-sent');
};

// module hook functions
exports.initHooks = (server) => {
  server.registerHook('in', 'chat', this.commandCheckIn, 20);
  server.registerHook('in', 'chat', this.finalCmdCheck, 254);
};

// checks for miscellaneous '/' based commands
exports.commandCheckIn = (core, server, socket, payload) => {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/myhash')) {
    server.reply({
      cmd: 'info',
      text: `Your hash: ${socket.hash}`
    }, socket);

    return false;
  }

  return payload;
};

exports.finalCmdCheck = (core, server, socket, payload) => {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (!payload.text.startsWith('/')) {
    return payload;
  }

  if (payload.text.startsWith('//')) {
    payload.text = payload.text.substr(1);

    return payload;
  } else {
    server.reply({
      cmd: 'warn',
      text: `Unknown command: ${payload.text}`
    }, socket);

    return false;
  }

  return payload;
};

// module meta
exports.requiredData = ['text'];
exports.info = {
  name: 'chat',
  description: 'Broadcasts passed `text` field to the calling users channel',
  usage: `
    API: { cmd: 'chat', text: '<text to send>' }
    Text: Uuuuhm. Just kind type in that little box at the bottom and hit enter.\n
    Bonus super secret hidden commands:
    /myhash`
};
