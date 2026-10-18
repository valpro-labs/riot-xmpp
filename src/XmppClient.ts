import EventEmitter from 'eventemitter3';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

import { ITlsSocket, ISocketProvider, ConnectOptions } from './socket';

export interface XmppClientEvents {
  error: (err: Error) => void;
  data: (data: string) => void;
  stanza: (stanza: any) => void;
  closed: () => void;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  suppressBooleanAttributes: false,
  suppressEmptyNode: true,
  suppressUnpairedNode: true,
});

export class XmppClient extends EventEmitter<XmppClientEvents> {
  protected socket: ITlsSocket | null = null;
  private bufferedMessage = '';
  private readonly provider: ISocketProvider;

  constructor(provider: ISocketProvider) {
    super();
    this.provider = provider;
  }

  public get isConnected(): boolean {
    return this.isSocketWritable(this.socket);
  }

  public connect(options: ConnectOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.provider
        .connect(options)
        .then((socket) => {
          this.socket = socket;

          socket.on('data', (data) => {
            this.handleData(data.toString());
          });

          socket.on('error', (err) => {
            this.emit('error', err);
          });

          socket.on('end', () => {
            this.handleSocketClosed(socket);
          });

          socket.on('close', () => {
            this.handleSocketClosed(socket);
          });

          resolve();
        })
        .catch(reject);
    });
  }

  public send(data: string): void {
    this.write(data);
  }

  public sendXml(obj: any): void {
    this.send(xmlBuilder.build(obj));
  }

  public sendAndRead(data: string, timeoutMs = 10_000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.isSocketWritable(this.socket)) {
        return reject(new Error('Socket is not open'));
      }

      let timer: ReturnType<typeof setTimeout> | undefined;

      const cleanup = () => {
        if (timer !== undefined) clearTimeout(timer);
        this.off('stanza', onStanza);
        this.off('closed', onClosed);
      };

      const onStanza = (stanza: any) => {
        cleanup();
        resolve(stanza);
      };

      const onClosed = () => {
        cleanup();
        reject(new Error('Socket is closed.'));
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error('sendAndRead() timed out waiting for stanza response'));
      }, timeoutMs);

      this.once('stanza', onStanza);
      this.once('closed', onClosed);

      try {
        if (!this.write(data)) {
          cleanup();
          reject(new Error('Socket is closed.'));
        }
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  public sendXmlAndRead(obj: any, timeoutMs = 10_000): Promise<any> {
    return this.sendAndRead(xmlBuilder.build(obj), timeoutMs);
  }

  public disconnect() {
    const socket = this.socket;
    this.socket = null;
    // Clear the buffer to prevent stale data from the previous connection
    // bleeding into the next account's connection stream.
    this.bufferedMessage = '';

    if (socket) {
      try {
        socket.end();
      } finally {
        this.emit('closed');
      }
    }
  }

  private isSocketWritable(socket: ITlsSocket | null): socket is ITlsSocket {
    return !!socket && socket.readyState === 'open' && !socket.pending && !socket.destroyed;
  }

  private write(data: string): boolean {
    const socket = this.socket;
    if (!this.isSocketWritable(socket)) return false;

    try {
      socket.write(data, 'utf8');
    } catch (error) {
      if (error instanceof Error && error.message === 'Socket is closed.') return false;
      throw error;
    }

    return true;
  }

  private handleSocketClosed(socket: ITlsSocket) {
    if (this.socket !== socket) return;

    this.socket = null;
    this.bufferedMessage = '';
    this.emit('closed');
  }

  private handleData(data: string) {
    this.emit('data', data);
    this.processIncomingBuffer(data);
  }

  private processIncomingBuffer(data: string) {
    this.bufferedMessage += data;

    while (true) {
      const startIdx = this.bufferedMessage.indexOf('<');
      if (startIdx === -1) {
        this.bufferedMessage = '';
        break;
      }
      if (startIdx > 0) {
        this.bufferedMessage = this.bufferedMessage.substring(startIdx);
      }

      if (
        this.bufferedMessage.startsWith('<?xml') ||
        this.bufferedMessage.startsWith('<stream:stream')
      ) {
        const endIdx = this.bufferedMessage.indexOf('>');
        if (endIdx === -1) break;
        const stanza = this.bufferedMessage.substring(0, endIdx + 1);
        this.onStanza(stanza);
        this.bufferedMessage = this.bufferedMessage.substring(endIdx + 1);
        continue;
      }

      const spaceIdx = this.bufferedMessage.indexOf(' ');
      const closeBracketIdx = this.bufferedMessage.indexOf('>');
      if (closeBracketIdx === -1) break;

      let tagName = '';
      if (spaceIdx !== -1 && spaceIdx < closeBracketIdx) {
        tagName = this.bufferedMessage.substring(1, spaceIdx);
      } else {
        tagName = this.bufferedMessage.substring(1, closeBracketIdx);
      }

      if (
        this.bufferedMessage.substring(0, closeBracketIdx + 1).endsWith('/>')
      ) {
        const stanza = this.bufferedMessage.substring(0, closeBracketIdx + 1);
        this.onStanza(stanza);
        this.bufferedMessage = this.bufferedMessage.substring(
          closeBracketIdx + 1,
        );
        continue;
      }

      const closingTag = `</${tagName}>`;
      const closingIdx = this.bufferedMessage.indexOf(closingTag);
      if (closingIdx === -1) break;

      const stanza = this.bufferedMessage.substring(
        0,
        closingIdx + closingTag.length,
      );
      this.onStanza(stanza);
      this.bufferedMessage = this.bufferedMessage.substring(
        closingIdx + closingTag.length,
      );
    }
  }

  private onStanza(xml: string) {
    if (xml.startsWith('<?xml') || xml.startsWith('<stream:stream')) {
      return;
    }

    try {
      const parsed = xmlParser.parse(xml);
      this.emit('stanza', parsed);
    } catch (e) {
      console.error('Failed to parse stanza:', e, xml);
    }
  }

  public parseXml(xml: string) {
    return xmlParser.parse(xml);
  }

  public buildXml(obj: any) {
    return xmlBuilder.build(obj);
  }
}
