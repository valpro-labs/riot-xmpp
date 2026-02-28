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
    return !!this.socket && this.socket.readyState === 'open';
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
            this.emit('closed');
          });

          resolve();
        })
        .catch(reject);
    });
  }

  public send(data: string): void {
    if (this.socket && this.socket.readyState === 'open') {
      this.socket.write(data, 'utf8');
    }
  }

  public sendXml(obj: any): void {
    this.send(xmlBuilder.build(obj));
  }

  public sendAndRead(data: string, timeoutMs = 10_000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== 'open') {
        return reject(new Error('Socket is not open'));
      }

      const timer = setTimeout(() => {
        this.off('stanza', onStanza);
        reject(
          new Error('sendAndRead() timed out waiting for stanza response'),
        );
      }, timeoutMs);

      const onStanza = (stanza: any) => {
        clearTimeout(timer);
        resolve(stanza);
      };

      this.once('stanza', onStanza);
      this.socket.write(data, 'utf8');
    });
  }

  public sendXmlAndRead(obj: any, timeoutMs = 10_000): Promise<any> {
    return this.sendAndRead(xmlBuilder.build(obj), timeoutMs);
  }

  public disconnect() {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
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
