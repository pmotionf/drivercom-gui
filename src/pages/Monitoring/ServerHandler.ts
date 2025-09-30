import { toBinary } from "@bufbuild/protobuf";
import { listen, send, connect, disconnect } from "@kuyoonjo/tauri-plugin-tcp";
import { UnlistenFn } from "@tauri-apps/api/event";
import { Buffer } from "buffer";
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

enum ConnectionState {
  Connect = "Connect",
  Disconnect = "Disconnect",
}

export type LineType = Omit<
  Response_TrackConfig_Line,
  "$typeName" | "$unknown"
>;
export type TrackType = Omit<Response_Track, "$typeName" | "$unknown">;

interface IServerHandler {
  connect(ip: string, port: string): Promise<void | never>;
  disconnect(clientId: string): void;
  clearError(lindId: number, driverId?: number): void;
  getSystemInfo(lineId: number, axesLength: number): Promise<TrackType | never>;
  getLineConfig(): Promise<LineType[] | never>;
  getServerName(): Promise<string | null>;
}

export class ServerHandler implements IServerHandler {
  private _ipAddress: {
    ip: string;
    port: string;
    clientId: string;
  } = {
    ip: "",
    port: "",
    clientId: crypto.randomUUID(),
  };

  private _connectionState: ConnectionState = ConnectionState.Disconnect;

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

  private _requestId: string | null = null;

  private _unlisten: null | UnlistenFn = null;

  private _clearErrorQueue: number[] = [];

  private _isQueueEmpty: boolean = this._clearErrorQueue.length === 0;

  private async listener(): Promise<UnlistenFn> {
    return await listen(async (x) => {
      if (
        x.payload.id === this._ipAddress.clientId &&
        x.payload.event.message &&
        x.payload.event.message.data
      ) {
        const bytes = Buffer.from(x.payload.event.message.data);
        const decode: Response = fromBinary(ResponseSchema, bytes);
        this.addResponse(decode);
        this.unlock();
      }
    });
  }

  async connect(ip: string, port: string): Promise<void | never> {
    if (this._connectionState === ConnectionState.Connect) {
      throw new Error("The server is connected.");
    }

    const clientId = this._ipAddress.clientId;
    try {
      await connect(clientId, `${ip}:${port}`);
      this._unlisten = await this.listener();
      this._ipAddress.ip = ip;
      this._ipAddress.port = port;
      this._connectionState = ConnectionState.Connect;
    } catch (e) {
      if (e) {
        throw new Error(e as string);
      }
    }
    return;
  }

  async disconnect(): Promise<void | never> {
    if (this._connectionState === ConnectionState.Disconnect) {
      throw new Error("The server is disconnected.");
    }
    try {
      if (this._unlisten) {
        this._unlisten();
        this._unlisten = null;
      }
      await disconnect(this._ipAddress.clientId);
      this.serverResponses = [];
      this._ipAddress.clientId = crypto.randomUUID();
      this._requestId = null;
      this._connectionState = ConnectionState.Disconnect;
      this.unlock();
      return;
    } catch (e) {
      if (e) {
        throw new Error(e as string);
      }
    }
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
    const requestId = crypto.randomUUID();
    this._requestId = requestId;

    await this.sendRequest(this._ipAddress.clientId, payload);
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
    const requestId = crypto.randomUUID();
    this._requestId = requestId;
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
    await this.sendRequest(this._ipAddress.clientId, payload);
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
    if (ConnectionState.Disconnect === this._connectionState)
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
    const requestId = crypto.randomUUID();
    this._requestId = requestId;
    await this.sendRequest(this._ipAddress.clientId, payload);
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
        if (ConnectionState.Disconnect === this._connectionState)
          throw new Error("The server is disconnected.");
      }
      throw new Error("Command operation not available");
    }
    throw new Error("No response.");
  }

  async getLineConfig(): Promise<LineType[] | never> {
    const requestId = crypto.randomUUID();
    this._requestId = requestId;

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
    await this.sendRequest(this._ipAddress.clientId, payload);
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

  async getSystemInfo(
    lineId: number,
    axesLength: number,
  ): Promise<TrackType | never> {
    const requestId = crypto.randomUUID();
    this._requestId = requestId;

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
                case: "axes",
                value: { start: 1, end: axesLength, $typeName: "Range" },
              },
            },
          },
        },
      },
      $typeName: "mmc.Request",
    };

    this.sendRequest(this._ipAddress.clientId, payload);
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
    } else {
      if (ConnectionState.Disconnect === this._connectionState)
        throw new Error("Server disconnected");
      throw new Error("No response.");
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
    const requestId = crypto.randomUUID();
    this._requestId = requestId;

    await this.sendRequest(this._ipAddress.clientId, payload);
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

  private async sendRequest(
    cid: string,
    payload: Request,
  ): Promise<void | never> {
    if (this._lockRequest) {
      throw new Error("locked");
    }

    this.lock();
    const timeout = setTimeout(() => this.unlock(), 500);
    const buffer = toBinary(RequestSchema, payload);
    const parseBuffer: number[] = Array.from(buffer);

    try {
      if (this._connectionState === ConnectionState.Disconnect)
        throw new Error("Server Disconnected");
      await send(cid, parseBuffer);
      this.unlock();
      clearTimeout(timeout);
    } catch (e) {
      this.unlock();
      clearTimeout(timeout);
      throw new Error(e as string);
    }
  }

  private delay = (ms: number) =>
    new Promise<NodeJS.Timeout>((resolve) => {
      setTimeout(resolve, ms);
    });

  private async waitResponse() {
    while (this._lockRequest) {
      if (this._connectionState === ConnectionState.Disconnect) break;
      await this.delay(1).then((result) => {
        clearTimeout(result);
      });
    }

    if (this._requestId) {
      while (this.serverResponses.length <= 0) {
        if (this._connectionState === ConnectionState.Disconnect) break;
        await this.delay(1).then((result) => {
          clearTimeout(result);
        });
      }
      this._requestId = null;
    }

    await this.delay(1).then((result) => {
      clearTimeout(result);
    });
    return;
  }
}
