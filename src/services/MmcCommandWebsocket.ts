import { Request } from "~/proto/mmc_pb";
import type { Request as CommandRequest } from "~/proto/mmc/command_pb";
import { ProtobufManager } from "./ProtobufManager";
import { WebSocketError, WebsocketManger } from "./WebsocketManager";
import { Response_Command_Status } from "~/proto/mmc/info_pb";
import { Request_Direction } from "~/proto/mmc/command_pb";
import { Control } from "~/proto/mmc/control_pb";

export class MmcCommandWebsocket {
  private readonly socket = new WebsocketManger();
  private readonly protobuf = new ProtobufManager();
  private _isSocketOpen = () => this.socket.getStatus() === WebSocket.OPEN;

  async connect(ip: string, port: string): Promise<void> {
    return await this.socket.connect(ip, port);
  }

  async disconnect(): Promise<void> {
    return await this.socket.disconnect();
  }

  async send(buffer: Uint8Array, timeout: number): Promise<ArrayBuffer> {
    return await this.socket.send(buffer, timeout);
  }

  getStatus(): number {
    return this.socket.getStatus();
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
    if (!this._isSocketOpen()) throw WebSocketError.NOT_CONNECTED_TO_SERVER;
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
      const encodedPayload = this.protobuf.encode(payload);
      const response = await this.socket.send(encodedPayload, 1000);
      const decodedResponse = this.protobuf.decode(response);
      if (decodedResponse.body.case === "info") {
        const info = decodedResponse.body.value;
        if (info.body.case === "command") {
          const commandInfo = info.body.value;
          return commandInfo.items;
        }
      }
    } catch (err) {
      throw new Error(err as string);
    }
    throw WebSocketError.RESPONSE_ERROR;
  }

  private async _clearCommand(commandId: number) {
    try {
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
        }
      }
      throw WebSocketError.RESPONSE_ERROR;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  private async _waitCommandComplete(commandId: number): Promise<void> {
    if (!this._isSocketOpen()) throw WebSocketError.NOT_CONNECTED_TO_SERVER;
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
      throw WebSocketError.RESPONSE_ERROR;
    }
  }

  async runCommand(commandPayload: CommandRequest): Promise<void> {
    if (!this._isSocketOpen()) throw WebSocketError.NOT_CONNECTED_TO_SERVER;
    try {
      const payload = this._generateCommandRequest(commandPayload);
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
        }
      }
      throw WebSocketError.RESPONSE_ERROR;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async clearError(lineId: number): Promise<void> {
    try {
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
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async initialize(
    line: number,
    axis: number,
    carrier: number,
    direction: Request_Direction,
    linkAxis?: Request_Direction,
  ): Promise<void> {
    try {
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
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async deinitialize(line: number, axisId: number): Promise<void> {
    try {
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
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async calibrate(line: number): Promise<void> {
    try {
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
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async setZero(line: number): Promise<void> {
    try {
      const commandPayload: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "setZero",
          value: {
            line: line,
            $typeName: "mmc.command.Request.SetZero",
          },
        },
      };
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async pull(
    line: number,
    axisId: number,
    carrier: number,
    direction: Request_Direction,
    speed: number,
    acceleration: number,
    disableCas?: boolean,
    target?: number,
  ): Promise<void> {
    try {
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
            transition: {
              $typeName: "mmc.command.Request.Pull.Transition",
              disableCas: disableCas ?? false,
              target: target ?? 0,
              control: Control.POSITION,
            },
          },
        },
      };
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async stopPull(line: number, axisId: number): Promise<void> {
    try {
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
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async push(
    line: number,
    axisId: number,
    direction: Request_Direction,
    speed: number,
    acceleration: number,
    carrier?: number,
  ): Promise<void> {
    try {
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
            carrier: carrier,
          },
        },
      };
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async stopPush(line: number, axisId: number): Promise<void> {
    try {
      const commandPayload: CommandRequest = {
        $typeName: "mmc.command.Request",
        body: {
          case: "stopPush",
          value: {
            $typeName: "mmc.command.Request.StopPush",
            line: line,
            axes: {
              $typeName: "root.Range",
              start: axisId,
              end: axisId,
            },
          },
        },
      };
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }

  async moveCarrier(
    line: number,
    targetKind: "axis" | "location" | "distance",
    targetValue: number,
    carrier: number,
    control: Control,
    disableCas: boolean,
    speed: number,
    acceleration: number,
  ): Promise<void> {
    try {
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
            disableCas: disableCas,
            velocity: speed,
            acceleration: acceleration,
          },
        },
      };
      await this.runCommand(commandPayload);
      return;
    } catch (err) {
      throw new Error(err as string);
    }
  }
}
