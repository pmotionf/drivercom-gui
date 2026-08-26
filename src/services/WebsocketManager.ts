interface IWebsocketManger {
  connect(ip: string, port: string): Promise<void>;
  disconnect(): Promise<void>;
  send(buffer: ArrayBuffer, timeout: number): Promise<ArrayBuffer>;
  getStatus(): number;
}

type IpAddress = {
  ip: string | null;
  port: string | null;
};

enum WebSocketError {
  NOT_CONNECTED_TO_SERVER = "NOT_CONNECTED_TO_SERVER",
  SEND_FAILED = "SEND_FAILED",
  SOCKET_ERROR = "SOCKET_ERROR",
  RESPONSE_TIME_OUT = "RESPONSE_TIME_OUT",
  DISCONNECT_FAILED = "DISCONNECT_FAILED",
  CONNECT_FAILED = "CONNECT_FAILED",
  COMMAND_CONFLICTED = "COMMAND_CONFLICTED",
}

export class WebsocketManger implements IWebsocketManger {
  // Store IP address
  private _ipAdress: IpAddress = { ip: null, port: null };

  private _socket: WebSocket | null = null

  /* Return Web socket status.
    This Status is provided by websocket interface.
      readonly CONNECTING: 0;
      readonly OPEN: 1;
      readonly CLOSING: 2;
      readonly CLOSED: 3;
  */
  getStatus(): number {
    if(!this._socket) return WebSocket.CLOSED
    return this._socket.readyState;
  }

  private _commandPending: boolean = false;

  private _startCommand() {
    this._commandPending = true;
  }

  private _completeCommand() {
    this._commandPending = false;
  }

  private _socketOpenHandler = (ip: string, port: string, socket : WebSocket) => {
    this._ipAdress.ip = ip;
    this._ipAdress.port = port;
    this._socket = socket
  };

  private _socketCleanUp = (socket: WebSocket) => {
    socket.onclose = null;
    socket.onerror = null;
    socket.onopen = null;
    socket.onmessage = null;
  };

  private _socketCloseHandler = () => {
    this._completeCommand();
    if (this._socket) {
      this._socketCleanUp(this._socket);
    }
  };

  private _socketErrorHandler = () => {
    this._completeCommand();
    if (this._socket) {
      this._socketCleanUp(this._socket);
    }
  };

  async connect(ip: string, port: string): Promise<void> {
    const socket = new WebSocket(`ws://${ip}:${port}`);
    socket.binaryType = "arraybuffer";

    return await new Promise((resolve, reject) => {
      socket.onclose = () => {
        this._socketCloseHandler();
        reject(WebSocketError.NOT_CONNECTED_TO_SERVER);
      };
      socket.onerror = () => {
        this._socketErrorHandler();
        reject(WebSocketError.SOCKET_ERROR);
      };
      socket.onopen = () => {
        this._socketOpenHandler(ip, port, socket);
        resolve();
      };
    });
  }

  async disconnect(): Promise<void> {
    if (this.getStatus() !== WebSocket.OPEN) {
      return Promise.reject(WebSocketError.NOT_CONNECTED_TO_SERVER);
    }
    return await new Promise((resolve, reject) => {
      try {
        if(!this._socket) return reject(WebSocketError.DISCONNECT_FAILED)
        this._socket.onclose = () => {
          this._socketCloseHandler();
          resolve();
        };
        this._socket.onerror = () => {
          this._socketErrorHandler();
          reject(WebSocketError.SOCKET_ERROR);
        };
        this._socket.close();
      } catch {
        reject(WebSocketError.DISCONNECT_FAILED);
      }
    });
  }

  async send(buffer: ArrayBuffer, timeout: number): Promise<ArrayBuffer> {
    if (this.getStatus() !== WebSocket.OPEN)
      return Promise.reject(WebSocketError.NOT_CONNECTED_TO_SERVER);
    if (this._commandPending)
      return Promise.reject(WebSocketError.COMMAND_CONFLICTED);
    this._startCommand();

    return await new Promise((resolve, reject) => {
      if(!this._socket) return reject(WebSocketError.NOT_CONNECTED_TO_SERVER)
      const timeoutId = setTimeout(() => {
        this._completeCommand();
        if (!this._socket) return reject(WebSocketError.NOT_CONNECTED_TO_SERVER);
        this._socketCleanUp(this._socket);
        reject(WebSocketError.RESPONSE_TIME_OUT);
      }, timeout);
      try {
        this._socket.onmessage = ({ data }: MessageEvent) => {
          clearTimeout(timeoutId);
          this._completeCommand();
          resolve(data);
        };
        this._socket.onerror = () => {
          clearTimeout(timeoutId);
          this._socketErrorHandler();
          reject(WebSocketError.SOCKET_ERROR);
        };
        this._socket.send(buffer);
      } catch {
        clearTimeout(timeoutId)
        this._completeCommand()
        reject(WebSocketError.SEND_FAILED);
      }
    });
  }
}
