import { Request } from "~/proto/mmc_pb";
import { IMmcWebSocket } from "./MmcWebsocket";
import { ProtobufManager } from "./ProtobufManager";
import { WebSocketError, WebsocketManger } from "./WebsocketManager";
import { Request_Kind, Response_TrackConfig_Line } from "~/proto/mmc/core_pb";
import { Response_Line } from "~/proto/mmc/info_pb";

export class MonitoringWebsocket implements IMmcWebSocket {
  socket = new WebsocketManger()
  protobuf = new ProtobufManager()

  private _isSocketOpen = () => this.socket.getStatus() === WebSocket.OPEN

  async getLineConfig() : Promise<Response_TrackConfig_Line[]> {
    if (!this._isSocketOpen()) {
      return Promise.reject(WebSocketError.NOT_CONNECTED_TO_SERVER)
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
      const encodePayload = this.protobuf.encode(payload)
      const response = await this.socket.send(encodePayload, 1000)
      const decodeResponse = this.protobuf.decode(response)
      if (decodeResponse.body.case === "core") {
        const core = decodeResponse.body.value
        if (core.body.case === "trackConfig") {
          const trackConfig = core.body.value
          return Promise.resolve(trackConfig.lines)
        }
      }
    } catch (err) {
      return Promise.reject(err)
    }
    return Promise.reject()
  }

  async getServerName() : Promise<string> {
    if (!this._isSocketOpen()) {
      return Promise.reject(WebSocketError.NOT_CONNECTED_TO_SERVER)
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
      const encodePayload = this.protobuf.encode(payload)
      const response = await this.socket.send(encodePayload, 1000)
      const decodeResponse = this.protobuf.decode(response)
      if (decodeResponse.body.case === "core") {
        const core = decodeResponse.body.value
        if (core.body.case === "server") {
          const serverInfo = core.body.value
          return Promise.resolve(serverInfo.name)
        }
      }
    } catch(err){
      return Promise.reject(err)
    }
    return Promise.reject()
  }

  async getSystemInfo(lines: number[]) : Promise<Response_Line[]> {
    if (!this._isSocketOpen()) {
      return Promise.reject(WebSocketError.NOT_CONNECTED_TO_SERVER)
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
      const encodePayload = this.protobuf.encode(payload)
      const response = await this.socket.send(encodePayload, 1000)
      const decodeResponse = this.protobuf.decode(response)
      if (decodeResponse.body.case === "info") {
        const info = decodeResponse.body.value;
        if (info.body.case === "track") {
          const track = info.body.value;
          return  Promise.resolve(track.lines)
        }
      }
    } catch (err) {
      Promise.reject(err)
    }
    return Promise.reject()
  }
}
