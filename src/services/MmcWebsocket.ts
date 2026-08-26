import { ProtobufManager } from "./ProtobufManager";
import { WebsocketManger } from "./WebsocketManager";

export interface IMmcWebSocket {
  readonly socket: WebsocketManger
  readonly protobuf: ProtobufManager
}
