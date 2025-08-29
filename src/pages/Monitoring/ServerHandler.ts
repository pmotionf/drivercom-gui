import { listen, send, connect, disconnect } from "@kuyoonjo/tauri-plugin-tcp";
import { UnlistenFn } from "@tauri-apps/api/event";
//@ts-ignore Ignore test in git action
import { mmc } from "~/components/proto/mmc.js";
import { CreateToasterReturn } from "@ark-ui/solid";
import { SetStoreFunction } from "solid-js/store";
import { SystemConfig, ServerClientId } from "../Monitoring";
import { Buffer } from "buffer";
import { IpAddress } from "~/components/System/IpHistory";
import { Setter, Accessor } from "solid-js";

export const sendRequest = async (
  cid: string,
  payload: object,
  catchError?: () => void,
) => {
  const msg = mmc.Request.fromObject(payload);
  const buffer = mmc.Request.encode(msg).finish();
  const parseBuffer: number[] = Array.from(buffer);

  try {
    await send(cid, parseBuffer);
  } catch {
    catchError?.();
  }
};

const connectMultiClients = async (
  clients: string[],
  addr: string,
): Promise<void | never> => {
  for await (const cid of clients) {
    try {
      await connect(cid, addr);
    } catch (e) {
      throw new Error(e as string);
    }
  }
  return;
};

const prepareInfos = async (cid: string) => {
  let payload: object = {
    core: {
      kind: "CORE_REQUEST_KIND_LINE_CONFIG",
    },
  };
  await sendRequest(cid, payload);

  payload = {
    core: {
      kind: "CORE_REQUEST_KIND_SERVER_INFO",
    },
  };
  await sendRequest(cid, payload);
};

export const connectServer = async (
  cid: ServerClientId,
  address: string,
): Promise<null | string> => {
  try {
    await connectMultiClients(Object.values(cid), address);
    await prepareInfos(cid.info);
  } catch (error) {
    return error as string;
  }
  return null;
};

const disconnectClients = async (clients: string[]): Promise<void | never> => {
  for await (const cid of clients) {
    try {
      await disconnect(cid);
    } catch (e) {
      throw new Error(e as string);
    }
  }
  return;
};

export const disconnectServer = async (
  clientId: ServerClientId,
  isDisconnect: boolean,
  toast?: CreateToasterReturn,
) => {
  if (isDisconnect) return;
  try {
    await disconnectClients(Object.values(clientId));
  } catch (e) {
    if (e) {
      if (toast) {
        toast.create({
          title: "Disconnect Error",
          description: e as string,
          type: "error",
        });
      } else {
        return e as string;
      }
    }
  }
};

// Request system info part
export async function requestSystemInfo(
  cid: string,
  lineId: number,
  lines: mmc.core.Response.LineConfig.ILine[],
) {
  if (lines.length < 1) return null;
  const payload = {
    info: {
      system: {
        lineId: lineId,
        driver: true,
        axis: true,
        carrier: true,
      },
    },
  };
  await sendRequest(cid, payload, () => {
    return null;
  });
  if (lineId + 1 <= lines.length) {
    await requestSystemInfo(cid, lineId + 1, lines);
  }
}

export const requestClearError = async (lineId: number, cid: string) => {
  const payload = {
    command: {
      clearErrors: {
        lineId: lineId,
      },
    },
  };
  // Giving timeout to show user the error is erasing
  setTimeout(async () => {
    await sendRequest(cid, payload);
  }, 200);
};

export async function commandListener(
  cid: string,
  commandComplete?: () => void,
  catchError?: () => void,
): Promise<UnlistenFn> {
  return await listen(async (x) => {
    if (
      x.payload.id === cid &&
      x.payload.event.message &&
      x.payload.event.message.data
    ) {
      const msg = Buffer.from(x.payload.event.message!.data);

      const decode = mmc.Response.decode(msg);
      if (decode.command) {
        const command = decode.command;
        if (command.commandId) {
          const payload = {
            info: {
              command: { id: command.commandId },
            },
          };
          await sendRequest(cid, payload, () => {
            catchError?.();
          });
        }

        if (command.commandOperation) {
          const commandOperation = command.commandOperation;
          const parseOperation =
            mmc.command.Response.CommandOperationStatus[commandOperation];
          if (parseOperation.includes("COMPLETED")) {
            commandComplete?.();
          }
        }
      }

      if (decode.info) {
        if (decode.info.commands) {
          const command = decode.info.commands.commands![0];
          const commandStatus = command.status;
          const commandId = command.id;
          const parseStatus =
            mmc.info.Response.Commands.Command.Status[
              commandStatus as mmc.info.Response.Commands.Command.Status
            ];

          if (parseStatus.includes("COMPLETED")) {
            const payload = {
              command: {
                clearCommand: {
                  commandId: commandId,
                },
              },
            };
            await sendRequest(cid, payload, () => {
              catchError?.();
            });
          } else {
            const payload = {
              info: {
                command: { id: commandId },
              },
            };
            await sendRequest(cid, payload, () => {
              catchError?.();
            });
          }
        }
      }
    }
  });
}

export async function infoListener(
  cid: string,
  setSystemConfig: SetStoreFunction<SystemConfig>,
  isAutoClear: Accessor<boolean>,
  setIpHistory: Setter<IpAddress[]>,
  sendCommand?: (lineId: number) => void,
): Promise<UnlistenFn> {
  return await listen(async (x) => {
    if (
      x.payload.id === cid &&
      x.payload.event.message &&
      x.payload.event.message.data
    ) {
      const msg = Buffer.from(x.payload.event.message!.data);
      const decode = mmc.Response.decode(msg);

      if (decode.core) {
        if (decode.core.lineConfig) {
          //@ts-ignore Ignore test in git action
          const update = decode.core.lineConfig.lines!.map((line) => {
            return { line: line };
          });
          setSystemConfig({ lines: update });
          return;
        }

        if (decode.core.server) {
          const serverName = decode.core.server.name;
          if (serverName) {
            const ipAddress = x.payload.event.message.addr;
            const split = ipAddress.split(":");
            const ip = split[0];
            const port = split[1];

            setIpHistory((prev) => [
              { ip: ip, port: port, name: serverName },
              ...prev.filter(
                (prev) => prev.ip !== ip && prev.port !== prev.port,
              ),
            ]);
          }
          return;
        }
      }

      if (decode.info) {
        if (decode.info.system) {
          const index = decode.info!.system!.lineId! - 1;
          if (isAutoClear()) {
            if (decode.info.system.driverErrors) {
              const hasDriverError = hasError(decode.info.system.driverErrors);
              const hasAxisError = hasError(decode.info.system.axisErrors!);

              if (hasDriverError && !hasAxisError) {
                const lineId = decode.info.system.lineId!;
                if (sendCommand) {
                  sendCommand(lineId);
                }
              }
            }
          }

          setSystemConfig("lines", index, "system", decode.info!.system);
          return;
        }
      }
    }
  });
}

const hasError = (fields: object[]): boolean => {
  const findErrorFields = fields.map((field) => findErrorField(field));
  return findErrorFields.includes(true);
};

const findErrorField = (fields: object): boolean => {
  const values = Object.values(fields);
  let findError: boolean = false;

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (typeof val === "boolean") {
      if (val) {
        findError = true;
        break;
      }
    } else if (typeof val === "object") {
      if (findErrorField(val)) {
        findError = true;
        break;
      }
    }
  }
  return findError;
};
