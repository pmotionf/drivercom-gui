import { Request } from "~/proto/mmc_pb";
import { ProtobufManager } from "./ProtobufManager";
import { WebSocketError, WebsocketManger } from "./WebsocketManager";
import { Request_Kind, Response_TrackConfig_Line } from "~/proto/mmc/core_pb";
import { Response_Line } from "~/proto/mmc/info_pb";

export class MonitoringWebsocket {
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

  async getLineConfig(): Promise<Response_TrackConfig_Line[]> {
    if (!this._isSocketOpen()) {
      throw WebSocketError.NOT_CONNECTED_TO_SERVER;
    }
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
      const encodePayload = this.protobuf.encode(payload);
      const response = await this.socket.send(encodePayload, 1000);
      const decodeResponse = this.protobuf.decode(response);
      if (decodeResponse.body.case === "core") {
        const core = decodeResponse.body.value;
        if (core.body.case === "trackConfig") {
          const trackConfig = core.body.value;
          return trackConfig.lines;
        }
      }
    } catch (err) {
      throw new Error(err as string);
    }
    throw WebSocketError.RESPONSE_ERROR;
  }

  async getServerName(): Promise<string> {
    if (!this._isSocketOpen()) {
      throw WebSocketError.NOT_CONNECTED_TO_SERVER;
    }
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
      const encodePayload = this.protobuf.encode(payload);
      const response = await this.socket.send(encodePayload, 1000);
      const decodeResponse = this.protobuf.decode(response);
      if (decodeResponse.body.case === "core") {
        const core = decodeResponse.body.value;
        if (core.body.case === "server") {
          const serverInfo = core.body.value;
          return serverInfo.name;
        }
      }
    } catch (err) {
      throw new Error(err as string);
    }
    throw WebSocketError.RESPONSE_ERROR;
  }

  async getSystemInfo(lines: number[]): Promise<Response_Line[]> {
    if (!this._isSocketOpen()) {
      throw WebSocketError.NOT_CONNECTED_TO_SERVER;
    }
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
      const encodePayload = this.protobuf.encode(payload);
      const response = await this.socket.send(encodePayload, 1000);
      const decodeResponse = this.protobuf.decode(response);
      if (decodeResponse.body.case === "info") {
        const info = decodeResponse.body.value;
        if (info.body.case === "track") {
          const track = info.body.value;
          return track.lines;
        }
      }
    } catch (err) {
      throw new Error(err as string);
    }
    throw WebSocketError.RESPONSE_ERROR;
  }
}
