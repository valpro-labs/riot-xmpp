import * as tls from 'tls';

import { ISocketProvider, ConnectOptions } from './ISocketProvider';
import { ITlsSocket } from './ITlsSocket';

/**
 * Node.js implementation of ISocketProvider using the built-in `tls` module.
 * This is the default provider for Node.js environments.
 */
export class SocketProvider implements ISocketProvider {
  connect(options: ConnectOptions): Promise<ITlsSocket> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: options.host,
          port: options.port,
          rejectUnauthorized: options.rejectUnauthorized ?? true,
        },
        () => {
          resolve(socket as unknown as ITlsSocket);
        },
      );

      socket.once("error", reject);
    });
  }
}
