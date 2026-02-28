import TcpSocket from 'react-native-tcp-socket';

import { ISocketProvider, ConnectOptions } from './ISocketProvider';
import { ITlsSocket } from './ITlsSocket';

/**
 * React Native specific fallback for SocketProvider.
 *
 * This file is automatically picked up by the Metro bundler instead of
 * `SocketProvider.ts`. It uses `react-native-tcp-socket` to provide
 * true plug-and-play TLS support for React Native users.
 */
export class SocketProvider implements ISocketProvider {
  connect(options: ConnectOptions): Promise<ITlsSocket> {
    return new Promise((resolve, reject) => {
      try {
        const socket = TcpSocket.connectTLS(
          {
            host: options.host,
            port: options.port,
            tlsCheckValidity: options.rejectUnauthorized ?? true,
          },
          () => {
            resolve(socket as unknown as ITlsSocket);
          }
        );

        socket.once('error', reject);
      } catch (err) {
        reject(
          new Error(
            'Failed to create React Native TLS connection. ' +
            'Did you forget to install "react-native-tcp-socket" in your app? ' +
            `Original error: ${err}`
          )
        );
      }
    });
  }
}

