export interface IWebsocketManager {
  connect(ip: string, port: string): Promise<void>;
  cancelConnect(): void;
  disconnect(): Promise<void>;
  send(buffer: Uint8Array, timeout: number): Promise<ArrayBuffer>;
}

type IpAddress = {
  ip: string | null;
  port: string | null;
};

export class ConnectError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ConnectError";
  }
}

export class DisconnectError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DisconnectError";
  }
}

export class RequestError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RequestError";
  }
}

export class ResponseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RequestError";
  }
}

export const WebSocketError = {
  ConnectError,
  DisconnectError,
  RequestError,
  ResponseError,
};

export enum ErrorKind {
  Uninitialized = "Server not initialized",
  Connected = "Already connected to a server",
  Connecting = "Attempting to connect to a server",
  Disconnected = "Disconnected from server",
  RequestTimeout = "Request timeout",
  CommandConflicted = "Already sending command",
  InvalidEndpoint = "Invalid endpoint address",
  Unexpected = "Unexpected error occured",
  InvalidResponse = "Invalid response from server",
}

export class WebsocketManager implements IWebsocketManager {
  // Store IP address
  private _ipAdress: IpAddress = { ip: null, port: null };
  private _socket: WebSocket | null = null;
  private _attemptedSocket: WebSocket | null = null;

  /**
   * Checks whether the WebSocket is in `OPEN` state. Caller must ensure the
   * socket is already initialized.
   * @returns `true` if socket is in `OPEN` state, otherwise `false`
   */
  /// Checks whether the socket is in OPEN state
  isOpen(): boolean {
    return this._socket?.readyState === WebSocket.OPEN;
  }

  private _commandPending: boolean = false;

  private _startCommand() {
    this._commandPending = true;
  }

  private _completeCommand() {
    this._commandPending = false;
  }

  private _socketOpenHandler = (
    ip: string,
    port: string,
    socket: WebSocket,
  ) => {
    this._ipAdress.ip = ip;
    this._ipAdress.port = port;
    this._socket = socket;
  };

  private _socketCloseHandler = (socket: WebSocket) => {
    socket.onclose = null;
    socket.onerror = null;
    socket.onopen = null;
    socket.onmessage = null;
    if (this._commandPending) {
      this._completeCommand();
    }
  };

  /**
   * Attempt to connect to a websocket endpoint. Connection attempt is stored
   * in `_attemptedSocket`. Once the attempt is succeeded, move the connected
   * socket to `_socket`.
   * @param ip endpoint's ip address or hostname
   * @param port endpoint's port
   * @returns `Promise<void>`
   */
  async connect(ip: string, port: string): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
      if (this._attemptedSocket) {
        throw new ConnectError(ErrorKind.Connecting);
      }

      if (this._socket && this.isOpen()) {
        throw new ConnectError(ErrorKind.Connected);
      }
      // Connect attempt to websocket endpoint is stored into `_attemptedSocket`,
      // if succeed, stored into `_socket`. This mechanism allows to cancel
      // connect attempt.
      try {
        this._attemptedSocket = new WebSocket(`ws://${ip}:${port}`);
      } catch (err) {
        throw new ConnectError(ErrorKind.InvalidEndpoint, { cause: err });
      }
      this._attemptedSocket.binaryType = "arraybuffer";
      this._attemptedSocket.onerror = () => {
        // No useful information from WebSocket error event
      };
      this._attemptedSocket.onclose = (event) => {
        if (event.wasClean === false) {
          reject(new ConnectError(`Unable to connect to ${ip}:${port}`));
        } else {
          // Unlikely branch, but resolving here is definitely misleading
          // because we expect this event wont be triggered.
          reject(new ConnectError(ErrorKind.Unexpected));
        }
      };
      this._attemptedSocket.onopen = () => {
        // _attemptedSocket is impossible to be null
        this._socketOpenHandler(ip, port, this._attemptedSocket!);
        resolve();
      };
    }).finally(() => {
      this._attemptedSocket = null;
    });
  }

  cancelConnect(): void {
    if (!this._attemptedSocket) {
      console.error("Attempted socket is not initialized");
    }
    this._attemptedSocket?.close();
    return;
  }

  async disconnect(): Promise<void> {
    return await new Promise((resolve, reject) => {
      if (!this._socket) {
        return reject(new DisconnectError(ErrorKind.Uninitialized));
      }
      this._socket.onerror = () => {
        // No useful information from WebSocket error event
      };
      this._socket.onclose = (event) => {
        // It is impossible for socket to be null
        this._socketCloseHandler(this._socket!);
        if (event.wasClean) {
          resolve();
        } else {
          // TODO: Find out if we need to handle specific closing reason to retry
          // the disconnect.
          reject(
            new ConnectError(`${ErrorKind.Disconnected} (code: ${event.code})`),
          );
        }
      };
      this._socket.close();
    });
  }

  async send(buffer: Uint8Array, timeout: number): Promise<ArrayBuffer> {
    if (this._commandPending)
      throw new RequestError(ErrorKind.CommandConflicted);
    this._startCommand();

    return await new Promise((resolve, reject) => {
      if (!this._socket || !this.isOpen()) {
        throw new RequestError(ErrorKind.Disconnected);
      }
      const timeoutId = setTimeout(() => {
        this._completeCommand();
        reject(new RequestError(ErrorKind.RequestTimeout));
      }, timeout);
      this._socket.onmessage = ({ data }: MessageEvent) => {
        clearTimeout(timeoutId);
        this._completeCommand();
        resolve(data);
      };
      this._socket.onerror = () => {
        // No useful information from WebSocket error event
      };
      this._socket.onclose = (event) => {
        clearTimeout(timeoutId);
        this._socketCloseHandler(this._socket!);
        return reject(
          new RequestError(ErrorKind.Disconnected, { cause: event }),
        );
      };

      try {
        this._socket.send(buffer);
      } catch (err) {
        clearTimeout(timeoutId);
        this._completeCommand();
        return reject(
          new RequestError((err as DOMException).message, { cause: err }),
        );
      }
    });
  }
}
