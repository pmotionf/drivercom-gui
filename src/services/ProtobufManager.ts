import { fromBinary, toBinary } from "@bufbuild/protobuf";
import {
  Request,
  RequestSchema,
  Response,
  ResponseSchema,
} from "~/proto/mmc_pb";

export class ProtobufManager {
  decode(buffer: ArrayBuffer): Response {
    const uint8Array = new Uint8Array(buffer);
    return fromBinary(ResponseSchema, uint8Array);
  }

  encode(payload: Request): Uint8Array {
    return toBinary(RequestSchema, payload);
  }
}
