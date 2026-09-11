import { Request } from "~/proto/mmc_pb";
import type { Request as CommandRequest } from "~/proto/mmc/command_pb";
import { ProtobufManager } from "./ProtobufManager";
import {
  WebSocketError,
  WebsocketManager,
  ErrorKind,
} from "./WebsocketManager";
import { Response_Command_Status } from "~/proto/mmc/info_pb";
import { Request_Direction } from "~/proto/mmc/command_pb";
import { Control } from "~/proto/mmc/control_pb";

export class MmcCommandWebsocket {
  readonly socket = new WebsocketManager();
  private readonly protobuf = new ProtobufManager();

  async connect(ip: string, port: string): Promise<void> {
    return await this.socket.connect(ip, port);
  }

  async disconnect(): Promise<void> {
    return await this.socket.disconnect();
  }

  async send(buffer: Uint8Array, timeout: number): Promise<ArrayBuffer> {
    return await this.socket.send(buffer, timeout);
  }

  private _generateCommandRequest(commandPayload: CommandRequest): Request {
    const payload: Request = {
      body: {
        case: "command",
        value: commandPayload,
      },
      $typeName: "mmc.Request",
    };
    return payload;
  }

  private async _getCommandInfo(commandId: number) {
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
    const encodedPayload = this.protobuf.encode(payload);
    const response = await this.socket.send(encodedPayload, 1000);
    const decodedResponse = this.protobuf.decode(response);
    if (decodedResponse.body.case === "info") {
      const info = decodedResponse.body.value;
      if (info.body.case === "command") {
        const commandInfo = info.body.value;
        return commandInfo.items;
      } else {
        throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
      }
    } else {
      throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
    }
  }

  private async _clearCommand(commandId: number) {
    const commandPayload: CommandRequest = {
      body: {
        case: "removeCommand",
        value: {
          $typeName: "mmc.command.Request.RemoveCommand",
          command: commandId,
        },
      },
      $typeName: "mmc.command.Request",
    };
    const payload: Request = this._generateCommandRequest(commandPayload);
    const message = this.protobuf.encode(payload);
    const response = await this.socket.send(message, 1000);
    const decodedReponse = this.protobuf.decode(response);

    if (decodedReponse.body.case === "command") {
      const command = decodedReponse.body.value;
      if (command.body.case === "removedId") {
        const removedId = command.body.value;
        if (removedId === commandId) {
          return;
        }
      } else {
        throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
      }
    } else {
      throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
    }
  }

  private async _waitCommandComplete(commandId: number): Promise<void> {
    const commandInfo = await this._getCommandInfo(commandId);
    const currentCommandStatus = commandInfo[0].status;

    if (
      currentCommandStatus === Response_Command_Status.COMMAND_STATUS_COMPLETED
    ) {
      return;
    } else if (
      currentCommandStatus ===
      Response_Command_Status.COMMAND_STATUS_PROGRESSING
    ) {
      return await this._waitCommandComplete(commandId);
    } else {
      // TODO: Handle every possible error value from the server
      throw new WebSocketError.ResponseError("Command Error");
    }
  }

  private async _runCommand(payload: Request): Promise<void> {
    const message = this.protobuf.encode(payload);
    const response = await this.socket.send(message, 1000);
    const decodedReponse = this.protobuf.decode(response);

    if (decodedReponse.body.case === "command") {
      const command = decodedReponse.body.value;
      if (command.body.case === "id") {
        const commandId = command.body.value;
        await this._waitCommandComplete(commandId);
        await this._clearCommand(commandId);

        return;
      } else {
        throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
      }
    } else {
      throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
    }
  }

  async clearError(lineId: number): Promise<void> {
    const commandPayload: CommandRequest = {
      body: {
        case: "clearErrors",
        value: {
          line: lineId,
          target: { case: undefined },
          $typeName: "mmc.command.Request.ClearErrors",
        },
      },
      $typeName: "mmc.command.Request",
    };
    const payload = this._generateCommandRequest(commandPayload);
    return await this._runCommand(payload);
  }

  async initialize(
    line: number,
    axis: number,
    carrier: number,
    direction: Request_Direction,
    linkAxis?: Request_Direction,
  ): Promise<void> {
    const commandPayload: CommandRequest = {
      body: {
        case: "initialize",
        value: {
          line: line,
          axis: axis,
          carrier: carrier,
          direction: direction,
          linkAxis: linkAxis,
          $typeName: "mmc.command.Request.Initialize",
        },
      },
      $typeName: "mmc.command.Request",
    };
    const payload = this._generateCommandRequest(commandPayload);
    return await this._runCommand(payload);
  }

  async deinitialize(line: number, axisId: number): Promise<void> {
    const commandPayload: CommandRequest = {
      body: {
        case: "deinitialize",
        value: {
          line: line,
          target: {
            case: "axes",
            value: {
              start: axisId,
              end: axisId,
              $typeName: "root.Range",
            },
          },
          $typeName: "mmc.command.Request.Deinitialize",
        },
      },
      $typeName: "mmc.command.Request",
    };
    const payload = this._generateCommandRequest(commandPayload);
    return await this._runCommand(payload);
  }

  async calibrate(line: number): Promise<void> {
    const commandPayload: CommandRequest = {
      body: {
        case: "calibrate",
        value: {
          line: line,
          $typeName: "mmc.command.Request.Calibrate",
        },
      },
      $typeName: "mmc.command.Request",
    };
    const payload = this._generateCommandRequest(commandPayload);
    return await this._runCommand(payload);
  }

  async pull(
    line: number,
    axisId: number,
    carrier: number,
    direction: Request_Direction,
    speed: number,
    acceleration: number,
  ): Promise<void> {
    const commandPayload: CommandRequest = {
      $typeName: "mmc.command.Request",
      body: {
        case: "pull",
        value: {
          $typeName: "mmc.command.Request.Pull",
          line: line,
          axis: axisId,
          carrier: carrier,
          direction: direction,
          velocity: speed,
          acceleration: acceleration,
        },
      },
    };
    const payload = this._generateCommandRequest(commandPayload);
    return await this._runCommand(payload);
  }

  async stopPull(line: number, axisId: number): Promise<void> {
    const commandPayload: CommandRequest = {
      $typeName: "mmc.command.Request",
      body: {
        case: "stopPull",
        value: {
          $typeName: "mmc.command.Request.StopPull",
          line: line,
          axes: {
            $typeName: "root.Range",
            start: axisId,
            end: axisId,
          },
        },
      },
    };
    const payload = this._generateCommandRequest(commandPayload);
    return await this._runCommand(payload);
  }

  async push(
    line: number,
    axisId: number,
    direction: Request_Direction,
    speed: number,
    acceleration: number,
  ): Promise<void> {
    const commandPayload: CommandRequest = {
      $typeName: "mmc.command.Request",
      body: {
        case: "push",
        value: {
          $typeName: "mmc.command.Request.Push",
          line: line,
          axis: axisId,
          direction: direction,
          velocity: speed,
          acceleration: acceleration,
        },
      },
    };
    const payload = this._generateCommandRequest(commandPayload);
    return await this._runCommand(payload);
  }

  async moveCarrier(
    line: number,
    targetKind: "axis" | "location" | "distance",
    targetValue: number,
    carrier: number,
    control: Control,
    speed: number,
    acceleration: number,
  ): Promise<void> {
    const commandPayload: CommandRequest = {
      $typeName: "mmc.command.Request",
      body: {
        case: "move",
        value: {
          $typeName: "mmc.command.Request.Move",
          line: line,
          carrier: carrier,
          target: {
            case: targetKind,
            value: targetValue,
          },
          control: control,
          velocity: speed,
          acceleration: acceleration,
        },
      },
    };
    const payload = this._generateCommandRequest(commandPayload);
    return await this._runCommand(payload);
  }
}
