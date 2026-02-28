import { ITlsSocket } from './ITlsSocket';

export interface ConnectOptions {
  host: string;
  port: number;
  rejectUnauthorized?: boolean;
}

/**
 * Platform-agnostic factory for creating TLS socket connections.
 * Implement this interface to provide a platform-specific transport
 * (e.g. Node.js `tls`, `react-native-tcp-socket`, etc.).
 */
export interface ISocketProvider {
  connect(options: ConnectOptions): Promise<ITlsSocket>;
}
