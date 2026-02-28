/**
 * Platform-agnostic interface representing a connected TLS socket.
 * Modelled after the public API of Node.js `tls.TLSSocket`.
 */
export interface ITlsSocket {
  readonly readyState: string;
  write(data: string, encoding?: BufferEncoding): void;
  end(): void;
  on(event: "data", listener: (data: Buffer | string) => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "end", listener: () => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  off(event: string, listener: (...args: any[]) => void): this;
}
