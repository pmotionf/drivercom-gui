import { Request } from "~/proto/mmc_pb";
import { ProtobufManager } from "./ProtobufManager";
import {
  WebSocketError,
  WebsocketManager,
  ErrorKind,
} from "./WebsocketManager";
import { Request_Kind, Response_TrackConfig_Line } from "~/proto/mmc/core_pb";
import { Response_Line } from "~/proto/mmc/info_pb";

export class MonitoringWebsocket {
  readonly socket = new WebsocketManager();
  private readonly protobuf = new ProtobufManager();

  async getLineConfig(): Promise<Response_TrackConfig_Line[]> {
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
    const encodePayload = this.protobuf.encode(payload);
    const response = await this.socket.send(encodePayload, 1000);
    const decodeResponse = this.protobuf.decode(response);
    if (decodeResponse.body.case === "core") {
      const core = decodeResponse.body.value;
      if (core.body.case === "trackConfig") {
        const trackConfig = core.body.value;
        return trackConfig.lines;
      } else {
        throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
      }
    } else {
      throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
    }
  }

  async getServerName(): Promise<string> {
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
    const encodePayload = this.protobuf.encode(payload);
    const response = await this.socket.send(encodePayload, 1000);
    const decodeResponse = this.protobuf.decode(response);
    if (decodeResponse.body.case === "core") {
      const core = decodeResponse.body.value;
      if (core.body.case === "server") {
        const serverInfo = core.body.value;
        return serverInfo.name;
      } else {
        throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
      }
    } else {
      throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
    }
  }

  async getSystemInfo(lines: number[]): Promise<Response_Line[]> {
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
              registerX: false,
              registerY: false,
              registerWr: false,
              registerWw: false,
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
    const encodePayload = this.protobuf.encode(payload);
    const response = await this.socket.send(encodePayload, 1000);
    const decodeResponse = this.protobuf.decode(response);
    if (decodeResponse.body.case === "info") {
      const info = decodeResponse.body.value;
      if (info.body.case === "track") {
        const track = info.body.value;
        return track.lines;
      } else {
        throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
      }
    } else {
      throw new WebSocketError.ResponseError(ErrorKind.InvalidResponse);
    }
  }
}
