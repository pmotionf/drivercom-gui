export interface IWebsocketManager {
  connect(ip: string, port: string): Promise<void>;
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

  private _socketCleanUp = (socket: WebSocket | null) => {
    if (!socket) return;
    socket.onclose = null;
    socket.onerror = null;
    socket.onopen = null;
    socket.onmessage = null;
  };

  private _socketCloseHandler = () => {
    this._socketCleanUp(this._socket);

    if (this._socket) {
      this._socket = null;
    }

    if (this._commandPending) {
      this._completeCommand();
    }
  };

  async connect(ip: string, port: string): Promise<void> {
    if (this._socket !== null && this.isOpen()) {
      throw new ConnectError(ErrorKind.Connected);
    }
    // TODO: Connect requires timeout when attempting to connect to
    // wrong endpoint
    let socket = undefined;
    try {
      socket = new WebSocket(`ws://${ip}:${port}`);
      socket.binaryType = "arraybuffer";
    } catch (err) {
      throw new ConnectError(ErrorKind.InvalidEndpoint, { cause: err });
    }

    return await new Promise((resolve, reject) => {
      socket.onerror = () => {
        // No useful information from WebSocket error event
      };
      socket.onclose = (event) => {
        this._socketCloseHandler();
        if (event.wasClean === false) {
          // reject(new ConnectError(event.reason));
          reject(new ConnectError(`Unable to connect to ${ip}:${port}`));
        } else {
          // Unlikely branch, but resolving here is definitely misleading
          // because we expect this event wont be triggered.
          reject(new ConnectError(ErrorKind.Unexpected));
        }
      };
      socket.onopen = () => {
        this._socketOpenHandler(ip, port, socket);
        resolve();
      };
    });
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
        this._socketCloseHandler();
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
        this._socketCloseHandler();
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
