import { toBinary } from "@bufbuild/protobuf";
import { Request_Kind, Response_TrackConfig_Line } from "~/proto/mmc/core_pb";
import { Response_Command_Status, Response_Line } from "~/proto/mmc/info_pb";
import {
  Request,
  RequestSchema,
  Response,
  ResponseSchema,
} from "~/proto/mmc_pb";
import { fromBinary } from "@bufbuild/protobuf";
import {
  Request_Calibrate,
  Request_Deinitialize,
  Request_Direction,
  Request_Initialize,
  Request_SetZero,
} from "~/proto/mmc/command_pb";

export type LineType = Omit<
  Response_TrackConfig_Line,
  "$typeName" | "$unknown"
>;
export type TrackType = Omit<Response_Line, "$typeName" | "$unknown">;

interface IServerHandler {
  getStatus(): number;
  connect(ip: string, port: string): Promise<void>;
  disconnect(): Promise<void>;
  clearError(lindId: number, driverId?: number): Promise<void>;
  initalize(
    line: number,
    axis: number,
    carrier: number,
    direction: Request_Direction,
    linkAxis?: Request_Direction,
  ): Promise<void>;
  deinitailize(line: number, axisId: number): Promise<void>;
  calibrate(line: number): Promise<void>;
  setZero(line: number): Promise<void>;
  getSystemInfo(lineIds: number[]): Promise<TrackType[]>;
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

  private _response: ArrayBuffer | null = null;

  private _decodeResponse(data: ArrayBuffer) {
    const uint8array = new Uint8Array(data);
    const response: Response = fromBinary(ResponseSchema, uint8array);
    this._response = null;
    return response;
  }

  getStatus(): number {
    if (!this._socket) {
      return WebSocket.CLOSED;
    }
    return this._socket.readyState;
  }

  private _closeHandler = () => {
    this._response = null;
  };

  private _errorHandler = () => {
    this._response = null;
  };

  private _messageHandler = async ({ data }: MessageEvent) => {
    this._response = data;
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
    try {
      this._socket = new WebSocket(`ws://${ip}:${port}`);
      this._socket.binaryType = "arraybuffer";
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
        await this._delay(1);
      }
      clearTimeout(timeout);
      if (this._lockRequest) {
        this.unlock();
      }

      if (this._socket.readyState !== WebSocket.OPEN) {
        this._socket.close();
        return Promise.reject("Invalid Ip address");
      } else {
        this._ipAddress.ip = ip;
        this._ipAddress.port = port;
        return Promise.resolve();
      }
    } catch (e) {
      // Catching error when connecting websocket.
      return Promise.reject(e);
    }
  }

  async disconnect(): Promise<void | never> {
    while (this._lockRequest) {
      await this._delay(1);
    }

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
        await this._delay(1);
      }
      clearTimeout(timeout);

      this._socket = this._removeAllListeners(this._socket);

      if (this._socket.readyState !== WebSocket.CLOSED) {
        this._socket = null;
        clearTimeout(timeout);
        return Promise.reject("Failed to disconnect");
      }
      this._socket = null;
      this.unlock();
      return Promise.resolve();
    } else {
      return Promise.reject("Server is already disconnected.");
    }
  }

  async initalize(
    line: number,
    axis: number,
    carrier: number,
    direction: Request_Direction,
    linkAxis?: Request_Direction,
  ): Promise<void> {
    try {
      const request: Request_Initialize = {
        line: line,
        axis: axis,
        carrier: carrier,
        direction: direction,
        linkAxis: linkAxis,
        $typeName: "mmc.command.Request.Initialize",
      };
      const commandId = await this.requestInitialize(request);
      if (!commandId) {
        return Promise.reject("The response is invalid");
      }
      await this.getCommandInfo(commandId);

      const clearedId = await this.requestRemoveCommand(commandId);
      if (clearedId !== commandId) {
        return Promise.reject("Command `Remove command` error");
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return Promise.resolve();
  }

  async requestInitialize(request: Request_Initialize): Promise<number> {
    const payload: Request = {
      body: {
        case: "command",
        value: {
          body: {
            case: "initialize",
            value: request,
          },
          $typeName: "mmc.command.Request",
        },
      },
      $typeName: "mmc.Request",
    };

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "command") {
          const command = decoded.body.value;
          if (command.body.case === "id") {
            const commandId = command.body.value;
            return Promise.resolve(commandId);
          }
        }
        return Promise.reject("Command Error");
      }
      return Promise.reject("Invalid response.");
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async deinitailize(line: number, axisId: number): Promise<void> {
    try {
      const request: Request_Deinitialize = {
        line: line,
        target: {
          case: "axes",
          value: {
            start: axisId,
            end: axisId,
            $typeName: "Range",
          },
        },
        $typeName: "mmc.command.Request.Deinitialize",
      };
      const commandId = await this.requestDeinitialize(request);
      if (!commandId) {
        return Promise.reject("The response is invalid");
      }
      await this.getCommandInfo(commandId);

      const clearedId = await this.requestRemoveCommand(commandId);
      if (clearedId !== commandId) {
        return Promise.reject("Command `Remove command` error");
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return Promise.resolve();
  }

  async requestDeinitialize(request: Request_Deinitialize): Promise<number> {
    const payload: Request = {
      body: {
        case: "command",
        value: {
          body: {
            case: "deinitialize",
            value: request,
          },
          $typeName: "mmc.command.Request",
        },
      },
      $typeName: "mmc.Request",
    };

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "command") {
          const command = decoded.body.value;
          if (command.body.case === "id") {
            const commandId = command.body.value;
            return Promise.resolve(commandId);
          }
        }
        return Promise.reject("Command Error");
      }
      return Promise.reject("Invalid response.");
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async calibrate(line: number): Promise<void> {
    try {
      const request: Request_Calibrate = {
        line: line,
        $typeName: "mmc.command.Request.Calibrate",
      };
      const commandId = await this.requestCalibrate(request);
      if (!commandId) {
        return Promise.reject("The response is invalid");
      }
      await this.getCommandInfo(commandId);

      const clearedId = await this.requestRemoveCommand(commandId);
      if (clearedId !== commandId) {
        return Promise.reject("Command `Remove command` error");
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return Promise.resolve();
  }

  async requestCalibrate(request: Request_Calibrate): Promise<number> {
    const payload: Request = {
      body: {
        case: "command",
        value: {
          body: {
            case: "calibrate",
            value: request,
          },
          $typeName: "mmc.command.Request",
        },
      },
      $typeName: "mmc.Request",
    };

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "command") {
          const command = decoded.body.value;
          if (command.body.case === "id") {
            const commandId = command.body.value;
            return Promise.resolve(commandId);
          }
        }
        return Promise.reject("Command Error");
      }
      return Promise.reject("Invalid response.");
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async setZero(line: number): Promise<void> {
    try {
      const request: Request_SetZero = {
        line: line,
        $typeName: "mmc.command.Request.SetZero",
      };
      const commandId = await this.requestSetZero(request);
      if (!commandId) {
        return Promise.reject("The response is invalid");
      }
      await this.getCommandInfo(commandId);

      const clearedId = await this.requestRemoveCommand(commandId);
      if (clearedId !== commandId) {
        return Promise.reject("Command `Remove command` error");
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return Promise.resolve();
  }

  async requestSetZero(request: Request_SetZero): Promise<number> {
    const payload: Request = {
      body: {
        case: "command",
        value: {
          body: {
            case: "setZero",
            value: request,
          },
          $typeName: "mmc.command.Request",
        },
      },
      $typeName: "mmc.Request",
    };

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "command") {
          const command = decoded.body.value;
          if (command.body.case === "id") {
            const commandId = command.body.value;
            return Promise.resolve(commandId);
          }
        }
        return Promise.reject("Command Error");
      }
      return Promise.reject("Invalid response.");
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async clearError(lineId: number): Promise<void> {
    try {
      const commandId = await this.requestClearError(lineId);
      if (!commandId) {
        return Promise.reject("The response is invalid");
      }
      await this.getCommandInfo(commandId);

      const clearedId = await this.requestRemoveCommand(commandId);
      if (clearedId !== commandId) {
        return Promise.reject("Command `Remove command` error");
      }
    } catch (e) {
      return Promise.reject(e);
    }

    return Promise.resolve();
  }

  private async requestClearError(lineId: number): Promise<number | never> {
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

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "command") {
          const command = decoded.body.value;
          if (command.body.case === "id") {
            const commandId = command.body.value;
            return Promise.resolve(commandId);
          }
        }
        return Promise.reject("Command Error");
      }
      return Promise.reject("Invalid response.");
    } catch (e) {
      return Promise.reject(e);
    }
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
      await this._delay(1);
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

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "info") {
          const info = decoded.body.value;
          if (info.body.case === "command") {
            const commandInfo = info.body.value;
            return commandInfo.items;
          }
        }
        return Promise.reject("Invalid Response.");
      }
      return Promise.reject("No response");
    } catch (e) {
      return Promise.reject(e);
    }
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

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "command") {
          const command = decoded.body.value;
          if (command.body.case === "removedId") {
            return command.body.value;
          }
        } else {
          if (
            !this._socket ||
            (this._socket && this._socket.readyState === WebSocket.CLOSED)
          )
            return Promise.reject("The server is disconnected.");
        }
        return Promise.reject("Command operation not available");
      }
      return Promise.reject("No response.");
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async getLineConfig(): Promise<LineType[]> {
    if (this._lockRequest) return Promise.reject("Command Locked");
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

    try {
      await this.sendRequest(payload);
      await this.waitResponse();
      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "core") {
          const core = decoded.body.value;
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
      }
      return Promise.reject("The websocket response is empty.");
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async getSystemInfo(lines: number[]): Promise<TrackType[] | never> {
    const payload: Request = {
      body: {
        case: "info",
        value: {
          $typeName: "mmc.info.Request",
          body: {
            case: "track",
            value: {
              $typeName: "mmc.info.Request.Track",
              lines: lines,
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

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "info") {
          const info = decoded.body.value;
          if (info.body.case === "track") {
            const track = decoded.body.value;
            if (track.body.case === "track") {
              const tracked = track.body.value;

              return Promise.resolve(
                tracked.lines.map((line) => line as TrackType),
              );
            }
          }
        }
        return Promise.reject("The websocket response has an invalid type.");
      }
      return Promise.reject("The websocket response is empty.");
    } catch (e) {
      return Promise.reject(e);
    }
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

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this._response) {
        const decoded = this._decodeResponse(this._response);
        if (decoded.body.case === "core") {
          const core = decoded.body.value;
          if (core.body.case === "server") {
            const server = core.body.value;
            return Promise.resolve(server.name);
          }
        }
      }
      return Promise.resolve(null);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private async sendRequest(payload: Request): Promise<void> {
    if (this._lockRequest) {
      return Promise.reject("locked");
    }
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      const buffer: Uint8Array = toBinary(RequestSchema, payload);
      if (this._socket.readyState !== WebSocket.OPEN)
        return Promise.reject("Websocket is not open");
      this._socket.send(buffer);
      this.lock();
      return Promise.resolve();
    } else {
      await this.disconnect();
      return Promise.reject("Invalid websocket");
    }
  }

  private async waitResponse() {
    while (!this._response) {
      if (
        !this._socket ||
        (this._socket && this._socket.readyState !== WebSocket.OPEN)
      ) {
        return Promise.reject("Invalid websocket");
      }
      await this._delay(1);
    }
    this.unlock();
    return Promise.resolve();
  }

  private _timer(ms: number) {
    return new Promise<NodeJS.Timeout>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async _delay(ms: number) {
    const timeout = await this._timer(ms);
    clearTimeout(timeout);
    return Promise.resolve();
  }
}
