const assert = require('node:assert/strict');
const EventEmitter = require('eventemitter3');
const test = require('node:test');

const { RiotXmpp } = require('../dist/RiotXmpp');

// A PAS token only needs a decodable payload with an `affinity` that maps to a region.
function makePasToken(affinity) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ affinity })}.sig`;
}

// A socket that accepts writes and never answers, so the handshake stays pending.
function makeSilentSocket() {
  const socket = new EventEmitter();
  socket.readyState = 'open';
  socket.pending = false;
  socket.destroyed = false;
  socket.write = () => {};
  socket.end = () => {
    socket.readyState = 'closed';
  };
  return socket;
}

function makeXmpp(socket) {
  return new RiotXmpp(
    { getXmppTokens: async () => ({ rso: 'rso', pas: makePasToken('euw1') }) },
    { connect: async () => socket }
  );
}

test('connect resolves quietly when disconnect() aborts it during the handshake', async () => {
  const xmpp = makeXmpp(makeSilentSocket());
  let ready = false;
  xmpp.on('ready', () => {
    ready = true;
  });

  const connecting = xmpp.connect();
  // Let the token fetch and the socket connect settle so the handshake is waiting on a reply.
  await new Promise((resolve) => setTimeout(resolve, 20));
  xmpp.disconnect();

  await assert.doesNotReject(connecting);
  assert.equal(ready, false);
});

test('connect resolves quietly when a newer connect() replaces it during the handshake', async () => {
  const sockets = [makeSilentSocket(), makeSilentSocket()];
  let next = 0;
  const xmpp = new RiotXmpp(
    { getXmppTokens: async () => ({ rso: 'rso', pas: makePasToken('euw1') }) },
    { connect: async () => sockets[next++] }
  );

  const first = xmpp.connect();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const second = xmpp.connect();
  // Closing the first socket is what a reconnect does to the attempt it replaces.
  sockets[0].emit('close');

  await assert.doesNotReject(first);

  xmpp.disconnect();
  await assert.doesNotReject(second);
});

test('connect still rejects when the handshake fails and nothing replaced it', async () => {
  const socket = makeSilentSocket();
  const xmpp = makeXmpp(socket);

  const connecting = xmpp.connect();
  await new Promise((resolve) => setTimeout(resolve, 20));
  // The server drops the connection on its own: no disconnect() and no newer connect().
  xmpp.manualDisconnect = true;
  socket.emit('close');

  await assert.rejects(connecting, /Socket is closed/);
  xmpp.disconnect();
});
