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
  connect(ip: string, port: string): Promise<void>;
  disconnect(clientId: string): Promise<void>;
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

  private serverResponses: Response[] = [];
  private addResponse(res: Response) {
    this.serverResponses.push(res);
  }
  private getResponse() {
    const res = this.serverResponses[0];
    this.serverResponses.shift();
    return res;
  }

  async connect(ip: string, port: string): Promise<void> {
    if (!this._socket) {
      this._socket = new WebSocket(`ws://${ip}:${port}`);

      this._socket.onopen = () => {
        this._ipAddress.ip = ip;
        this._ipAddress.port = port;
      };

      this._socket.onclose = () => {
        this.serverResponses = [];
      };

      this._socket.onerror = () => {
        if (this._socket && this._socket.readyState == WebSocket.CLOSED) {
          this._socket = null;
        }
        this.serverResponses = [];
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

    this.lock();
    const timeout = setTimeout(() => {
      this.unlock();
    }, 5000);

    while (this._socket.readyState !== WebSocket.OPEN) {
      if (!this._lockRequest) {
        break;
      }
      const wait = await this.delay(1);
      clearTimeout(wait);
    }
    clearTimeout(timeout);
    this.unlock();

    return new Promise((resolve, reject) => {
      if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
        this._socket = null;
        return reject("Invalid Ip address");
      } else {
        return resolve();
      }
    });
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

    return new Promise((resolve, reject) => {
      if (error) {
        return reject(error);
      } else {
        return resolve();
      }
    });
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

    return new Promise((resolve, reject) => {
      if (error) {
        return reject(error);
      } else {
        return resolve();
      }
    });
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

    return new Promise((resolve, reject) => {
      if (error) return reject(error);
      if (this.serverResponses.length > 0) {
        const response = this.getResponse();

        if (response.body.case === "command") {
          const command = response.body.value;
          if (command.body.case === "id") {
            const commandId = command.body.value;
            return resolve(commandId);
          }
        }
        return reject("Command Error");
      }
      return reject("No response.");
    });
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

    return new Promise((resolve, reject) => {
      if (error) {
        return reject(error);
      }
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
              return resolve(lines);
            }
          }
        }
        return reject("The websocket response has an invalid type.");
      } else {
        return reject("The websocket response is empty.");
      }
    });
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

    return new Promise((resolve, reject) => {
      if (error) {
        return reject(error);
      }

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
              return resolve(systemInfo);
            }
          }
        }
        return reject("The websocket response has an invalid type.");
      }
      return reject("The websocket response is empty.");
    });
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

  private async sendRequest(payload: Request): Promise<void> {
    if (this._lockRequest) {
      throw new Error("locked");
    }

    return new Promise((resolve, reject) => {
      if (this._socket && this._socket.readyState === WebSocket.OPEN) {
        const buffer: Uint8Array = toBinary(RequestSchema, payload);
        if (this._socket.readyState !== WebSocket.OPEN)
          throw new Error("Websocket is not open");
        this._socket.send(buffer);
        this.lock();
        return resolve();
      } else {
        return reject("Invalid websocket");
      }
    });
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
      const wait = await this.delay(1);
      clearTimeout(wait);
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
