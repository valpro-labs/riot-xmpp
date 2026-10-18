const assert = require('node:assert/strict');
const test = require('node:test');

const { RiotXmpp } = require('../dist/RiotXmpp');
const { XmppClient } = require('../dist/XmppClient');

function makeXmpp(socket) {
  const client = new XmppClient({ connect: async () => socket });
  client.socket = socket;

  const xmpp = new RiotXmpp({ getXmppTokens: async () => ({ rso: '', pas: '' }) });
  xmpp.client = client;

  return { client, xmpp };
}

test('disconnect skips a graceful write when the native socket is destroyed', () => {
  let writes = 0;
  let ends = 0;
  const socket = {
    readyState: 'open',
    destroyed: true,
    write() {
      writes++;
      throw new Error('Socket is closed.');
    },
    end() {
      ends++;
    },
  };
  const { client, xmpp } = makeXmpp(socket);

  assert.doesNotThrow(() => xmpp.disconnect());
  assert.equal(writes, 0);
  assert.equal(ends, 1);
  assert.equal(client.isConnected, false);
});

test('disconnect still tears down when the socket closes between state check and write', () => {
  let ends = 0;
  const socket = {
    readyState: 'open',
    write() {
      throw new Error('Socket is closed.');
    },
    end() {
      ends++;
    },
  };
  const { client, xmpp } = makeXmpp(socket);

  assert.doesNotThrow(() => xmpp.disconnect());
  assert.equal(ends, 1);
  assert.equal(client.isConnected, false);
});

test('disconnect preserves unexpected write errors after tearing down', () => {
  let ends = 0;
  const socket = {
    readyState: 'open',
    write() {
      throw new Error('unexpected transport failure');
    },
    end() {
      ends++;
    },
  };
  const { client, xmpp } = makeXmpp(socket);

  assert.throws(() => xmpp.disconnect(), /unexpected transport failure/);
  assert.equal(ends, 1);
  assert.equal(client.isConnected, false);
});

test('disconnect sends the graceful close stanza for an open socket', () => {
  const writes = [];
  let ends = 0;
  const socket = {
    readyState: 'open',
    write(data) {
      writes.push(data);
    },
    end() {
      ends++;
    },
  };
  const { client, xmpp } = makeXmpp(socket);

  xmpp.disconnect();

  assert.deepEqual(writes, ['</stream:stream>']);
  assert.equal(ends, 1);
  assert.equal(client.isConnected, false);
});

test('disconnect is safe to repeat', () => {
  let ends = 0;
  const socket = {
    readyState: 'open',
    write() {},
    end() {
      ends++;
    },
  };
  const { client, xmpp } = makeXmpp(socket);

  xmpp.disconnect();
  xmpp.disconnect();

  assert.equal(ends, 1);
  assert.equal(client.isConnected, false);
});

test('disconnect cleans up a socket that is no longer open', () => {
  let ends = 0;
  const socket = {
    readyState: 'closed',
    write() {
      assert.fail('closed sockets must not receive a graceful close stanza');
    },
    end() {
      ends++;
    },
  };
  const { client, xmpp } = makeXmpp(socket);

  xmpp.disconnect();

  assert.equal(ends, 1);
  assert.equal(client.isConnected, false);
});
