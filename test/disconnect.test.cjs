const assert = require('node:assert/strict');
const EventEmitter = require('eventemitter3');
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

test('send skips sockets that are pending, destroyed, or closed', () => {
  for (const state of [
    { readyState: 'open', pending: true },
    { readyState: 'open', destroyed: true },
    { readyState: 'closed' },
  ]) {
    let writes = 0;
    const socket = {
      ...state,
      write() {
        writes++;
        throw new Error('Socket is closed.');
      },
      end() {},
    };
    const { client } = makeXmpp(socket);

    assert.doesNotThrow(() => client.send('heartbeat'));
    assert.equal(writes, 0);
    assert.equal(client.isConnected, false);
  }
});

test('send preserves writes for a usable socket', () => {
  const writes = [];
  const socket = {
    readyState: 'open',
    pending: false,
    destroyed: false,
    write(data) {
      writes.push(data);
    },
    end() {},
  };
  const { client } = makeXmpp(socket);

  client.send('heartbeat');

  assert.deepEqual(writes, ['heartbeat']);
});

test('send treats a close between the state check and write as a no-op', () => {
  const socket = {
    readyState: 'open',
    write() {
      throw new Error('Socket is closed.');
    },
    end() {},
  };
  const { client } = makeXmpp(socket);

  assert.doesNotThrow(() => client.send('heartbeat'));
});

test('sendAndRead rejects and cleans up when native write reports a closed socket', async () => {
  const socket = {
    readyState: 'open',
    write() {
      throw new Error('Socket is closed.');
    },
    end() {},
  };
  const { client } = makeXmpp(socket);
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;
  let scheduledTimer;
  let timerWasCleared = false;

  global.setTimeout = (callback, delay, ...args) => {
    scheduledTimer = originalSetTimeout(callback, delay, ...args);
    return scheduledTimer;
  };
  global.clearTimeout = (timer) => {
    if (timer === scheduledTimer) timerWasCleared = true;
    return originalClearTimeout(timer);
  };

  try {
    await assert.rejects(client.sendAndRead('<iq/>'), { message: 'Socket is closed.' });
    assert.equal(client.listenerCount('stanza'), 0);
    assert.equal(timerWasCleared, true);
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});

test('sendAndRead rejects unexpected synchronous write failures after cleanup', async () => {
  const socket = {
    readyState: 'open',
    write() {
      throw new Error('unexpected transport failure');
    },
    end() {},
  };
  const { client } = makeXmpp(socket);

  await assert.rejects(client.sendAndRead('<iq/>'), /unexpected transport failure/);
  assert.equal(client.listenerCount('stanza'), 0);
});

test('sendAndRead resolves a response and removes its close listener', async () => {
  const writes = [];
  const { client } = makeXmpp({
    readyState: 'open',
    write(data) { writes.push(data); },
    end() {},
  });
  const response = { iq: { type: 'result' } };
  const pendingRead = client.sendAndRead('<iq/>');

  client.emit('stanza', response);

  assert.deepEqual(await pendingRead, response);
  assert.deepEqual(writes, ['<iq/>']);
  assert.equal(client.listenerCount('stanza'), 0);
  assert.equal(client.listenerCount('closed'), 0);
});

test('sendAndRead removes all waiting listeners on timeout', async () => {
  const { client } = makeXmpp({
    readyState: 'open',
    write() {},
    end() {},
  });

  await assert.rejects(client.sendAndRead('<iq/>', 1), /timed out/);

  assert.equal(client.listenerCount('stanza'), 0);
  assert.equal(client.listenerCount('closed'), 0);
});

test('sendAndRead rejects and removes listeners when the socket closes while waiting', async () => {
  class FakeSocket extends EventEmitter {
    readyState = 'open';
    pending = false;
    destroyed = false;

    write() {}

    end() {}
  }

  const socket = new FakeSocket();
  const client = new XmppClient({ connect: async () => socket });
  await client.connect({ host: 'example.test', port: 5223 });
  const pendingRead = client.sendAndRead('<iq/>', 10_000);

  socket.emit('close');

  await assert.rejects(pendingRead, { message: 'Socket is closed.' });
  assert.equal(client.listenerCount('stanza'), 0);
  assert.equal(client.listenerCount('closed'), 0);
});

test('close alone and paired end/close events trigger one reconnect and stop the heartbeat', async () => {
  class FakeSocket extends EventEmitter {
    readyState = 'open';
    pending = false;
    destroyed = false;

    write() {}

    end() {}
  }

  for (const events of [['close'], ['end', 'close'], ['close', 'end']]) {
    const socket = new FakeSocket();
    const xmpp = new RiotXmpp({ getXmppTokens: async () => ({ rso: '', pas: '' }) }, {
      connect: async () => socket,
    });
    let reconnects = 0;
    let heartbeatTicks = 0;
    xmpp.connect = async () => {
      reconnects++;
    };
    xmpp.heartbeatInterval = setInterval(() => {
      heartbeatTicks++;
    }, 5);

    try {
      await xmpp.client.connect({ host: 'example.test', port: 5223 });
      for (const event of events) socket.emit(event);
      await new Promise((resolve) => setTimeout(resolve, 20));

      assert.equal(reconnects, 1);
      assert.equal(heartbeatTicks, 0);
      assert.equal(xmpp.client.isConnected, false);
    } finally {
      clearInterval(xmpp.heartbeatInterval);
    }
  }
});

test('manual disconnect emits one closed event and ignores later socket events', async () => {
  class FakeSocket extends EventEmitter {
    readyState = 'open';
    pending = false;
    destroyed = false;

    write() {}

    end() {}
  }

  const socket = new FakeSocket();
  const client = new XmppClient({ connect: async () => socket });
  let closedEvents = 0;
  client.on('closed', () => {
    closedEvents++;
  });
  await client.connect({ host: 'example.test', port: 5223 });

  client.disconnect();
  socket.emit('end');
  socket.emit('close');

  assert.equal(closedEvents, 1);
  assert.equal(client.isConnected, false);
});

test('disconnect emits closed even when ending the socket throws', () => {
  const socket = {
    readyState: 'open',
    write() {},
    end() {
      throw new Error('end failed');
    },
  };
  const { client } = makeXmpp(socket);
  let closedEvents = 0;
  client.on('closed', () => {
    closedEvents++;
  });

  assert.throws(() => client.disconnect(), /end failed/);
  assert.equal(closedEvents, 1);
  assert.equal(client.isConnected, false);
});
