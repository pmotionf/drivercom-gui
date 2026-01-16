import { toBinary } from "@bufbuild/protobuf";
import {
  Request_Kind,
  Response_TrackConfig_Line,
} from "~/components/proto/mmc/core_pb";
import {
  Response_Command_Status,
  Response_Track,
} from "~/components/proto/mmc/info_pb";
import {
  Request,
  RequestSchema,
  ResponseSchema,
} from "~/components/proto/mmc_pb";
import { fromBinary } from "@bufbuild/protobuf";

export type LineType = Omit<
  Response_TrackConfig_Line,
  "$typeName" | "$unknown"
>;
export type TrackType = Omit<Response_Track, "$typeName" | "$unknown">;

interface IServerHandler {
  getStatus(): number;
  connect(ip: string, port: string): Promise<void>;
  disconnect(): Promise<void>;
  clearError(lindId: number, driverId?: number): Promise<void>;
  getSystemInfo(lineId: number): Promise<TrackType>;
  getLineConfig(): Promise<LineType[]>;
  getServerName(): Promise<string | null>;
}

export class ServerHandler implements IServerHandler {
  private _ipAddress: {
    ip: string;
    port: string;
  } = {
    ip: "",
    port: "",
  };

  private _socket: WebSocket | null = null;

  private _lockRequest: boolean = false;
  private lock() {
    this._lockRequest = true;
  }
  private unlock() {
    this._lockRequest = false;
  }

  private _serverResponse: Blob | null = null;

  private async _decodeResponse(data: Blob) {
    const uint8array = await this._readBuffer(data);
    const response = fromBinary(ResponseSchema, uint8array);
    return response;
  }

  private _reader = new FileReader();
  private _readBuffer(data: Blob) {
    return new Promise<Uint8Array>((resolve) => {
      const load = () => {
        const response = new Uint8Array(this._reader.result as ArrayBufferLike);
        return resolve(response);
      };
      this._reader.onload = load;
      this._reader.readAsArrayBuffer(data);
      this._reader.removeEventListener("load", load);
    });
  }

  getStatus(): number {
    if (!this._socket) {
      return WebSocket.CLOSED;
    }
    return this._socket.readyState;
  }

  private _closeHandler = () => {
    this._serverResponse = null;
  };

  private _errorHandler = () => {
    this._serverResponse = null;
  };

  private _messageHandler = (message: MessageEvent) => {
    message.stopPropagation();
    this._serverResponse = message.data;
  };

  private _removeAllListeners = (websocket: WebSocket) => {
    websocket.removeEventListener("close", this._closeHandler);
    websocket.removeEventListener("error", this._errorHandler);
    websocket.removeEventListener("message", this._messageHandler);

    websocket.onclose = null;
    websocket.onerror = null;
    websocket.onmessage = null;
    return websocket;
  };

  async connect(ip: string, port: string): Promise<void> {
    if (this._socket) throw new Error("Already connected");
    this._socket = new WebSocket(`ws://${ip}:${port}`);
    this._socket.onclose = this._closeHandler;
    this._socket.onerror = this._errorHandler;
    this._socket.onmessage = this._messageHandler;

    this.lock();
    const timeout = setTimeout(() => {
      this.unlock();
    }, 5000);

    while (this._socket && this._socket.readyState === WebSocket.CONNECTING) {
      if (!this._lockRequest) {
        break;
      }
      const wait = await this.delay(1);
      clearTimeout(wait);
    }

    clearTimeout(timeout);
    if (this._lockRequest) {
      this.unlock();
    }

    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
      if (this._socket) {
        this._socket.close();
      }
      this._socket = null;
      return Promise.reject("Invalid Ip address");
    } else {
      this._ipAddress.ip = ip;
      this._ipAddress.port = port;
      return Promise.resolve();
    }
  }

  async disconnect(): Promise<void | never> {
    if (this._lockRequest) {
      while (this._lockRequest) {
        const timeout = await this.delay(1);
        clearTimeout(timeout);
      }
    }

    let error: null | string = null;

    if (this._socket) {
      this._socket.close();
      this.lock();

      const timeout = setTimeout(() => {
        this.unlock();
      }, 5000);
      while (this._socket.readyState !== WebSocket.CLOSED) {
        if (!this._lockRequest) {
          break;
        }
        const wait = await this.delay(1);
        clearTimeout(wait);
      }
      clearTimeout(timeout);

      this._socket = this._removeAllListeners(this._socket);

      if (this._socket.readyState !== WebSocket.CLOSED) {
        this._socket = null;
        clearTimeout(timeout);
        error = "Failed to disconenct";
      }
      this._socket = null;
      this.unlock();
    } else {
      error = "Server is already disconnected.";
    }

    if (error) {
      return Promise.reject(error);
    } else {
      return Promise.resolve();
    }
  }

  async clearError(lineId: number): Promise<void> {
    let error: string | null = null;
    try {
      const commandId = await this.requestClearError(lineId);
      if (!commandId) {
        error = "The response is invalid";
      }
      await this.getCommandInfo(commandId);

      const clearedId = await this.requestRemoveCommand(commandId);
      if (clearedId !== commandId) {
        error = "Command `Remove command` error";
      }
    } catch (e) {
      error = e as string;
    }

    if (error) {
      return Promise.reject(error);
    } else {
      return Promise.resolve();
    }
  }

  private async requestClearError(lineId: number): Promise<number | never> {
    let error: string | null = null;

    if (!error) {
      const payload: Request = {
        body: {
          case: "command",
          value: {
            body: {
              case: "clearErrors",
              value: {
                line: lineId,
                target: { case: undefined },
                $typeName: "mmc.command.Request.ClearErrors",
              },
            },
            $typeName: "mmc.command.Request",
          },
        },
        $typeName: "mmc.Request",
      };

      try {
        await this.sendRequest(payload);
        await this.waitResponse();
      } catch (e) {
        error = e as string;
      }
    }

    if (error) return Promise.reject(error);
    if (this._serverResponse) {
      const response = await this._decodeResponse(this._serverResponse);
      this._serverResponse = null;

      if (response.body.case === "command") {
        const command = response.body.value;
        if (command.body.case === "id") {
          const commandId = command.body.value;
          return Promise.resolve(commandId);
        }
      }
      return Promise.reject("Command Error");
    }
    return Promise.reject("No response.");
  }

  private async getCommandInfo(commandId: number): Promise<void | never> {
    if (this._lockRequest) return;
    const commandInfo = await this.requestCommandInfo(commandId);
    const commandStatus = commandInfo[0].status;
    if (commandStatus === Response_Command_Status.COMMAND_STATUS_COMPLETED) {
      return;
    } else if (
      commandStatus === Response_Command_Status.COMMAND_STATUS_PROGRESSING
    ) {
      const timeout = await this.delay(1);
      clearTimeout(timeout);
      return await this.getCommandInfo(commandId);
    } else {
      throw new Error("Fail to request command info");
    }
  }

  private async requestCommandInfo(commandId: number) {
    const payload: Request = {
      body: {
        case: "info",
        value: {
          $typeName: "mmc.info.Request",
          body: {
            case: "command",
            value: {
              $typeName: "mmc.info.Request.Command",
              id: commandId,
            },
          },
        },
      },
      $typeName: "mmc.Request",
    };
    await this.sendRequest(payload);
    await this.waitResponse();

    if (this._serverResponse) {
      const response = await this._decodeResponse(this._serverResponse);
      this._serverResponse = null;

      if (response.body.case === "info") {
        const info = response.body.value;
        if (info.body.case === "command") {
          const commandInfo = info.body.value;
          return commandInfo.items;
        }
      }
      throw new Error("Invalid Response.");
    }
    if (
      !this._socket ||
      (this._socket && this._socket.readyState === WebSocket.CLOSED)
    )
      throw new Error("The server is disconnected.");
    throw new Error("No response");
  }

  private async requestRemoveCommand(
    commandId: number,
  ): Promise<number | never> {
    const payload: Request = {
      body: {
        case: "command",
        value: {
          body: {
            case: "removeCommand",
            value: {
              $typeName: "mmc.command.Request.RemoveCommand",
              command: commandId,
            },
          },
          $typeName: "mmc.command.Request",
        },
      },
      $typeName: "mmc.Request",
    };
    await this.sendRequest(payload);
    await this.waitResponse();

    if (this._serverResponse) {
      const response = await this._decodeResponse(this._serverResponse);
      this._serverResponse = null;
      if (response) {
        if (response.body.case === "command") {
          const command = response.body.value;
          if (command.body.case === "removedId") {
            return command.body.value;
          }
        }
      } else {
        if (
          !this._socket ||
          (this._socket && this._socket.readyState === WebSocket.CLOSED)
        )
          throw new Error("The server is disconnected.");
      }
      throw new Error("Command operation not available");
    }
    throw new Error("No response.");
  }

  async getLineConfig(): Promise<LineType[]> {
    if (this._lockRequest) throw new Error("Command Locked");
    const payload: Request = {
      body: {
        case: "core",
        value: {
          kind: Request_Kind.CORE_REQUEST_KIND_TRACK_CONFIG,
          $typeName: "mmc.core.Request",
        },
      },
      $typeName: "mmc.Request",
    };

    let error: string | null = null;
    try {
      await this.sendRequest(payload);
      await this.waitResponse();
    } catch (e) {
      error = e as string;
    }

    if (error) {
      return Promise.reject(error);
    }
    if (this._serverResponse) {
      const response = await this._decodeResponse(this._serverResponse);
      this._serverResponse = null;

      if (response.body.case === "core") {
        const core = response.body.value;
        if (core.body.case === "trackConfig") {
          const trackConfig = core.body.value;
          if (trackConfig.lines) {
            const lines = trackConfig.lines.map(
              (line: Response_TrackConfig_Line) => {
                const newLine: LineType = {
                  id: line.id,
                  name: line.name,
                  axes: line.axes,
                  carrierLength: line.carrierLength,
                  axisLength: line.axisLength,
                  drivers: line.drivers,
                };
                return newLine;
              },
            );
            return Promise.resolve(lines);
          }
        }
      }
      return Promise.reject("The websocket response has an invalid type.");
    } else {
      return Promise.reject("The websocket response is empty.");
    }
  }

  async getSystemInfo(lineId: number): Promise<TrackType | never> {
    const payload: Request = {
      body: {
        case: "info",
        value: {
          $typeName: "mmc.info.Request",
          body: {
            case: "track",
            value: {
              $typeName: "mmc.info.Request.Track",
              line: lineId,
              infoAxisErrors: true,
              infoCarrierState: true,
              infoAxisState: true,
              infoDriverErrors: true,
              infoDriverState: true,
              filter: {
                case: undefined,
                value: undefined,
              },
            },
          },
        },
      },
      $typeName: "mmc.Request",
    };

    let error: string | null = null;
    try {
      await this.sendRequest(payload);
      await this.waitResponse();
    } catch (e) {
      error = e as string;
    }

    if (error) {
      return Promise.reject(error);
    }

    if (this._serverResponse) {
      const response = await this._decodeResponse(this._serverResponse);
      this._serverResponse = null;
      if (response.body.case === "info") {
        const info = response.body.value;
        if (info.body.case === "track") {
          const track = response.body.value;
          if (track.body.case === "track") {
            const tracked = track.body.value;
            const systemInfo: TrackType = {
              line: tracked.line,
              driverErrors: tracked.driverErrors,
              driverState: tracked.driverState,
              axisErrors: tracked.axisErrors,
              axisState: tracked.axisState,
              carrierState: tracked.carrierState,
            };
            return Promise.resolve(systemInfo);
          }
        }
      }
      return Promise.reject("The websocket response has an invalid type.");
    }
    return Promise.reject("The websocket response is empty.");
  }

  async getServerName(): Promise<string | null> {
    const payload: Request = {
      body: {
        case: "core",
        value: {
          kind: Request_Kind.CORE_REQUEST_KIND_SERVER_INFO,
          $typeName: "mmc.core.Request",
        },
      },
      $typeName: "mmc.Request",
    };

    await this.sendRequest(payload);
    await this.waitResponse();

    if (this._serverResponse) {
      const response = await this._decodeResponse(this._serverResponse);
      this._serverResponse = null;
      if (response.body.case === "core") {
        const core = response.body.value;
        if (core.body.case === "server") {
          const server = core.body.value;
          return server.name;
        }
      }
    }

    return null;
  }

  private async sendRequest(payload: Request): Promise<void> {
    if (this._lockRequest) {
      throw new Error("locked");
    }
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      const buffer: Uint8Array = toBinary(RequestSchema, payload);
      if (this._socket.readyState !== WebSocket.OPEN)
        throw new Error("Websocket is not open");
      this._socket.send(buffer);
      this.lock();
      return Promise.resolve();
    } else {
      return Promise.reject("Invalid websocket");
    }
  }

  private async waitResponse() {
    while (!this._serverResponse) {
      if (
        !this._socket ||
        (this._socket && this._socket.readyState !== WebSocket.OPEN)
      ) {
        throw new Error("Invalid websocket");
      }
      if (!this._lockRequest) {
        throw new Error("Command lock");
      }
      if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
        throw new Error("Websocket is already disconnected");
      }
      const wait = await this.delay(1);
      clearTimeout(wait);
    }
    this.unlock();

    return;
  }

  private delay = (ms: number) =>
    new Promise<NodeJS.Timeout>((resolve) => {
      setTimeout(resolve, ms);
    });
}
