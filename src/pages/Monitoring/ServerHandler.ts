import { toBinary } from "@bufbuild/protobuf";
import { Blob } from "buffer";
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
  Response,
  ResponseSchema,
} from "~/components/proto/mmc_pb";
import { fromBinary } from "@bufbuild/protobuf";

export type LineType = Omit<
  Response_TrackConfig_Line,
  "$typeName" | "$unknown"
>;
export type TrackType = Omit<Response_Track, "$typeName" | "$unknown">;

interface IServerHandler {
  connect(ip: string, port: string): void;
  disconnect(clientId: string): void;
  clearError(lindId: number, driverId?: number): void;
  getSystemInfo(lineId: number): Promise<TrackType | never>;
  getLineConfig(): Promise<LineType[] | never>;
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

  private serverResponses: Response[] = [];
  private addResponse(res: Response) {
    this.serverResponses.push(res);
  }
  private getResponse() {
    const res = this.serverResponses[0];
    this.serverResponses.shift();
    return res;
  }

  private _clearErrorQueue: number[] = [];

  private _isQueueEmpty: boolean = this._clearErrorQueue.length === 0;

  async connect(ip: string, port: string) {
    if (!this._socket) {
      this._socket = new WebSocket(`ws://${ip}:${port}`);

      this._socket.onopen = () => {
        this._ipAddress.ip = ip;
        this._ipAddress.port = port;
      };

      this._socket.onclose = () => {
        this.serverResponses = [];
        this._clearErrorQueue = [];
        this.unlock();
      };

      this._socket.onerror = () => {
        if (this._socket && this._socket.readyState == WebSocket.CLOSED) {
          this._socket = null;
        }
        this.serverResponses = [];
        this._clearErrorQueue = [];
        this.unlock();
      };

      this._socket.onmessage = async (message) => {
        const msg: Blob = message.data;
        const bytes = await msg.arrayBuffer();
        const buffer = new Uint8Array(bytes);
        const decode: Response = fromBinary(ResponseSchema, buffer);
        this.addResponse(decode);
      };
    }

    let connect = true;
    const timeout = setTimeout(() => {
      connect = false;
    }, 60000);

    while (this._socket.readyState !== WebSocket.OPEN) {
      if (!connect) {
        break;
      }
      await this.delay(1).then((result) => clearTimeout(result));
    }
    clearTimeout(timeout);

    if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
      this._socket = null;
      throw new Error("Invalid Ip address");
    } else {
      return;
    }
  }

  async disconnect(): Promise<void | never> {
    if (this._socket) {
      this._socket.close();
      let disconnect = true;

      const timeout = setTimeout(() => {
        disconnect = false;
      }, 30000);
      while (this._socket.readyState !== WebSocket.CLOSED) {
        if (!disconnect) {
          break;
        }
        await this.delay(1).then((result) => clearTimeout(result));
      }
      if (this._socket.readyState !== WebSocket.CLOSED) {
        this._socket = null;
        clearTimeout(timeout);
        throw new Error("Failed to disconenct");
      }
      this._socket = null;
      clearTimeout(timeout);
    } else {
      throw new Error("Server is already disconnected.");
    }
    return;
  }

  async clearError(lineId: number): Promise<void | never> {
    if (this._isQueueEmpty) {
      try {
        this._clearErrorQueue.push(lineId);
        const commandId = await this.requestClearError(lineId);
        if (!commandId) throw new Error("The response is invalid");
        await this.getCommandInfo(commandId);

        const clearedId = await this.requestRemoveCommand(commandId);
        if (clearedId === commandId) {
          this._clearErrorQueue = [];
          return;
        } else {
          this._clearErrorQueue = [];
          throw new Error("Command `Remove command` error");
        }
      } catch (e) {
        this._clearErrorQueue = [];
        throw new Error(e as string);
      }
    }
  }

  private async requestClearError(lineId: number): Promise<number | never> {
    if (!this._isQueueEmpty) throw new Error("Error queue is not empty");
    const payload: Request = {
      body: {
        case: "command",
        value: {
          body: {
            case: "clearErrors",
            value: {
              line: lineId,
              $typeName: "mmc.command.Request.ClearErrors",
            },
          },
          $typeName: "mmc.command.Request",
        },
      },
      $typeName: "mmc.Request",
    };

    await this.sendRequest(payload);
    await this.waitResponse();

    if (this.serverResponses.length > 0) {
      const response = this.getResponse();

      if (response.body.case === "command") {
        const command = response.body.value;
        if (command.body.case === "id") {
          const commandId = command.body.value;
          return commandId;
        }
      }
      throw new Error("Command Error");
    }
    throw new Error("No response.");
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
      this.delay(1);
      return await this.getCommandInfo(commandId);
    } else {
      throw new Error("Fail to request command info");
    }
  }

  private async requestCommandInfo(commandId: number) {
    if (!this._isQueueEmpty) throw new Error("Error queue is not empty");
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

    if (this.serverResponses.length > 0) {
      const response = this.getResponse();
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
    if (!this._isQueueEmpty) throw new Error("Error queue is not empty");
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

    if (this.serverResponses.length > 0) {
      const response = this.getResponse();
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

  async getLineConfig(): Promise<LineType[] | never> {
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
    await this.sendRequest(payload);
    await this.waitResponse();

    if (this.serverResponses.length > 0) {
      const serverResponse = this.getResponse();
      if (serverResponse.body.case === "core") {
        const core = serverResponse.body.value;
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
            return lines;
          }
        }
      }
      throw new Error("Invalid Response");
    } else {
      throw new Error("No Response");
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

    try {
      await this.sendRequest(payload);
      await this.waitResponse();

      if (this.serverResponses.length > 0) {
        const response = this.getResponse();
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
              return systemInfo;
            }
          }
        }
        throw new Error("Invalid Response");
      }
      throw new Error("Invalid Response");
    } catch (e) {
      throw new Error(e as string);
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

    await this.sendRequest(payload);
    await this.waitResponse();

    if (this.serverResponses.length > 0) {
      const response = this.getResponse();
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

  private async sendRequest(payload: Request): Promise<void | never> {
    if (this._lockRequest) {
      throw new Error("locked");
    }

    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
      const buffer: Uint8Array = toBinary(RequestSchema, payload);
      if (this._socket.readyState !== WebSocket.OPEN)
        throw new Error("Websocket is not open");
      this._socket.send(buffer);
      this.lock();
    } else {
      throw new Error("Invalid websocket");
    }
  }

  private async waitResponse() {
    const timeout = setTimeout(() => {
      this.unlock();
    }, 500);

    while (this.serverResponses.length <= 0) {
      if (
        !this._socket ||
        (this._socket && this._socket.readyState !== WebSocket.OPEN)
      ) {
        throw new Error("Invalid websocket");
      }
      if (!this._lockRequest) {
        throw new Error("Command lock");
      }
      await this.delay(1).then((result) => {
        clearTimeout(result);
      });
    }
    clearTimeout(timeout);
    this.unlock();

    return;
  }

  private delay = (ms: number) =>
    new Promise<NodeJS.Timeout>((resolve) => {
      setTimeout(resolve, ms);
    });
}
