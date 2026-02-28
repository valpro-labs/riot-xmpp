import EventEmitter from 'eventemitter3';

import { XmppClient } from './XmppClient';
import { XmppRegions } from './regions';
import {
  clientName,
  mechanism,
  rxep,
  setupSession,
  xmlDeclaration,
  presence,
  fetchFriends,
} from './stanzas';
import { ISocketProvider, SocketProvider } from './socket';

import { parsePASToken } from './helpers';
import { IXmppAuthProvider } from './types';

import { formatRoster, RosterOutput } from './friends';
import { formatPresence, PresenceOutput } from './presence';

interface XmppEvents {
  error: (err: Error | unknown) => void;
  ready: () => void;
  closed: () => void;
  presence: (data: PresenceOutput) => void;
  message: (data: any) => void;
  friends: (data: RosterOutput) => void;
}

interface XmppRegionObject {
  affinity: string;
  domain: string;
  lookupName?: string;
}

export class RiotXmpp extends EventEmitter<XmppEvents> {
  private client: XmppClient;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private authProvider: IXmppAuthProvider;

  private rsoToken = '';
  private pasToken = '';
  private regionData: XmppRegionObject | null = null;
  private manualDisconnect = false;
  private currentConnectionId = 0;

  constructor(authProvider: IXmppAuthProvider, socketProvider?: ISocketProvider) {
    super();
    this.authProvider = authProvider;
    this.client = new XmppClient(socketProvider ?? new SocketProvider());

    this.client.on('error', (err) => {
      this.emit('error', err);
    });
    this.client.on('closed', async () => {
      this.stopHeartbeat();
      this.emit('closed');
      if (this.manualDisconnect) return;
      try {
        await this.connect();
      } catch (e) {
        this.emit('error', e);
      }
    });

  }

  public async connect() {
    this.manualDisconnect = false;
    const connectionId = ++this.currentConnectionId;

    const { rso, pas } = await this.authProvider.getXmppTokens();

    if (connectionId !== this.currentConnectionId) return;

    const pasData = parsePASToken(pas);
    const lookupName = pasData.affinity;
    const region = XmppRegions.findByLookupName(lookupName);

    if (!region) {
      throw new Error(`Unsupported region lookup name: ${lookupName}`);
    }

    this.rsoToken = rso;
    this.pasToken = pas;
    this.regionData = region;

    const host = XmppRegions.getHost(region);
    await this.client.connect({ port: 5223, host });
    console.log(`Connected to ${lookupName} (${host})`);

    await this.performHandshake(connectionId);

    if (connectionId !== this.currentConnectionId) return;

    this.client.removeAllListeners('stanza');
    this.client.on('stanza', (stanza: any) => {
      this.handleStanza(stanza);
    });
    this.resetHeartbeat();
    this.emit('ready');
  }

  private async performHandshake(connectionId: number) {
    const check = () => connectionId === this.currentConnectionId;

    await this.client.sendAndRead(xmlDeclaration(this.regionData!));
    if (!check()) return;

    await this.client.sendXmlAndRead(mechanism(this.rsoToken, this.pasToken));
    if (!check()) return;

    await this.client.sendAndRead(xmlDeclaration(this.regionData!));
    if (!check()) return;

    await this.client.sendXmlAndRead(clientName());
    if (!check()) return;

    await this.client.sendXmlAndRead(rxep());
    if (!check()) return;

    await this.client.sendXmlAndRead(setupSession());
    if (!check()) return;

    console.log('Handshake finished');
  }

  private resetHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => this.client.send(' '), 150_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleStanza(parsed: any) {
    const responses = Object.entries(parsed);

    for (const response of responses) {
      const [type, data] = response;
      if (Array.isArray(data)) {
        for (const xmlObj of data) {
          this._handleData(type, xmlObj);
        }
      } else {
        this._handleData(type, data);
      }
    }
  }

  private _handleData(type: string, data: any) {
    switch (type) {
      case 'presence':
        const presence = formatPresence(data);
        this.emit('presence', presence);
        break;
      case 'message':
        this.emit('message', data);
        break;
      case 'iq':
        const roster = formatRoster(data);
        this.emit('friends', roster);
        break;
    }
  }

  public sendPresence() {
    console.log('Sending initial presence...');
    this.client.sendXml(presence());
  }

  public fetchFriends() {
    console.log('Fetching friends...');
    this.client.sendXml(fetchFriends());
  }

  public disconnect() {
    console.log('Disconnecting from XMPP...');
    this.manualDisconnect = true;
    this.currentConnectionId++;
    this.stopHeartbeat();
    if (this.client.isConnected) {
      this.client.send('</stream:stream>');
      this.client.disconnect();
    }
  }
}
