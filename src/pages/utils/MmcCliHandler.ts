import { Buffer } from "buffer";
import { Terminal } from "xterm";
import { spawn } from "tauri-pty";
import { platform } from "@tauri-apps/plugin-os";
import { appDataDir, resolveResource } from "@tauri-apps/api/path";
import { BaseDirectory, readDir, writeTextFile } from "@tauri-apps/plugin-fs";
import { path } from "@tauri-apps/api";
import JSON5 from "json5";
import { Command } from "@tauri-apps/plugin-shell";
import {
  Request,
  RequestSchema,
  ResponseSchema,
} from "~/components/proto/mmc_pb";
import { Request_Kind } from "~/components/proto/mmc/core_pb";
import { fromBinary, toBinary } from "@bufbuild/protobuf";
import { connect, disconnect, listen, send } from "@kuyoonjo/tauri-plugin-tcp";
import { tcpClientIds } from "~/GlobalState";

enum MmccliConnectionState {
  Connecting,
  Connect,
  Open,
  Sending,
  Disconnecting,
  Disconnect,
}

let mmccliStatus: MmccliConnectionState = MmccliConnectionState.Disconnect;

type cliFormat = {
  modules: {
    mmc_client: {
      host: string;
      port: number;
    };
  }[];
};

const term = new Terminal({
  convertEol: true,
  windowsMode: false,
});

const pty = spawn(platform() === "windows" ? "powershell.exe" : "bash", [], {
  cols: term.cols,
  rows: term.rows,
});

let responses: string[] = [];
let responseKey: string = "";
let isResponseReturn: boolean = false;

pty.onData((data) => {
  term.write(new Uint8Array(data));
  const buffer = Buffer.from(data);
  const str = buffer.toString();

  console.log(str);

  responses.push(str);
  if (str.toLowerCase().trim().includes(responseKey.toLowerCase().trim())) {
    isResponseReturn = true;
  }
});

term.onData((data) => {
  pty.write(data);
});

pty.onExit(({ exitCode }) => {
  console.log(`\n\nProgram exit: ${exitCode}`);
});

async function writeCommand(cmd: string) {
  const currentPlatform = platform();
  const enterBar = currentPlatform === "windows" ? "\r\n" : "\n";
  responseKey = "Please enter a command";
  responses = [];

  pty.write(cmd + enterBar);

  while (!isResponseReturn) {
    if (isResponseReturn) break;
    await delay(1);
  }
  isResponseReturn = false;
  const commandResponses = responses;
  responses = [];

  return Promise.resolve<string[]>(commandResponses);
}

async function writeCommandWithEcho(cmd: string) {
  const currentPlatform = platform();
  const enterBar = currentPlatform === "windows" ? "\r\n" : "\n";

  const echo = crypto.randomUUID();
  responseKey = echo;

  pty.write(`${cmd} ${enterBar}echo ${echo} ${enterBar}`);
  while (!isResponseReturn) {
    await delay(10);
  }
  isResponseReturn = false;
  responses = [];

  return Promise.resolve();
}

const delay = async (ms: number) =>
  new Promise<NodeJS.Timeout>((resolve) => {
    setTimeout(resolve, ms);
  });

export async function prepareMmccli() {
  if (mmccliStatus !== MmccliConnectionState.Disconnect)
    return Promise.reject(`mmc-cli is ${MmccliConnectionState[mmccliStatus]}`);

  mmccliStatus = MmccliConnectionState.Connecting;
  const currentPlatform = platform();
  const extension = currentPlatform === "windows" ? ".exe" : "";
  let mmccli = "";
  const resourcePath = await resolveResource(mmccli);
  const fixPath = resourcePath.replace(mmccli, "");

  try {
    const files = await readDir("resources", {
      baseDir: BaseDirectory.Resource,
    });
    const index = files.findIndex(
      (file) => file.name.includes("mmccli") && file.name.endsWith(extension),
    );
    if (index > -1) {
      mmccli = files[index].name;
    } else {
      return Promise.reject("mmc-cli not found in files.");
    }
  } catch {
    mmccliStatus = MmccliConnectionState.Disconnect;
    return Promise.reject("mmc-cli not found in files.");
  }

  await writeCommandWithEcho(`cd "${fixPath}resources"`);
  await writeCommand(`./${mmccli}`);
  mmccliStatus = MmccliConnectionState.Connect;
  responses = [];

  return Promise.resolve();
}

export async function loadConfig(ip: string, port: number) {
  if (mmccliStatus !== MmccliConnectionState.Connect) {
    return Promise.reject("MMC-CLI is not connected");
  }
  const config = buildCliConfig(ip, port);
  const resourcePath = await appDataDir();
  const configFilePath = await path.join(resourcePath, "config.json5");
  await writeTextFile(configFilePath, config);
  await writeCommand(`load_config ${configFilePath}`);

  const res = await connectMmccli();
  if (res.some((response) => response.toLowerCase().includes("error"))) {
    return Promise.resolve(null);
  } else {
    mmccliStatus = MmccliConnectionState.Open;
    return Promise.resolve({ ip: ip, port: port });
  }
}

async function connectMmccli() {
  const res = await writeCommand("connect");
  return res;
}

const buildCliConfig = (ip: string, port: number) => {
  const newCliConfig: cliFormat = {
    modules: [
      {
        mmc_client: {
          host: ip,
          port: port,
        },
      },
    ],
  };

  const str = JSON5.stringify(newCliConfig, null, "  ");
  const parseStr = parseJsonStr(newCliConfig, str).replaceAll(`'`, `"`);
  return parseStr;
};

const parseJsonStr = (config: object, str: string): string => {
  let parseString = str;
  const entries = Object.entries(config);
  entries.forEach((entry) => {
    const key = entry[0];
    const value = entry[1];
    if (isNaN(Number(key))) {
      parseString = parseString.replace(key, `"${key}"`);
    }
    if (typeof value === "object") {
      parseString = parseJsonStr(value, parseString);
    }
  });
  return parseString;
};

export async function exit() {
  if (mmccliStatus === MmccliConnectionState.Sending) {
    //ty.pause();
    //pty.resume();
    mmccliStatus = MmccliConnectionState.Open;
  }
  if (
    mmccliStatus === MmccliConnectionState.Connect ||
    mmccliStatus === MmccliConnectionState.Open
  ) {
    mmccliStatus = MmccliConnectionState.Disconnecting;
    const currentPlatform = platform();
    const enterBar = currentPlatform === "windows" ? "\r\n" : "\n";
    responseKey = "disconnected from";
    pty.write(`exit ${enterBar}`);

    while (!isResponseReturn) {
      await delay(1);
    }
    isResponseReturn = false;
    responses = [];

    mmccliStatus = MmccliConnectionState.Disconnect;
    return Promise.resolve();
  }
  return Promise.reject(`mmc-cli is ${MmccliConnectionState[mmccliStatus]}`);
}

export async function stopPull(line: string, axisId: number) {
  if (mmccliStatus !== MmccliConnectionState.Open) {
    return Promise.reject("MMC-CLI is not prepared to send stop pull.");
  }
  mmccliStatus = MmccliConnectionState.Sending;
  const result = await writeCommand(`stop_pull_carrier ${line} ${axisId}a`);
  mmccliStatus = MmccliConnectionState.Open;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function stopPush(line: string, axisId: number) {
  if (mmccliStatus !== MmccliConnectionState.Open) {
    return Promise.reject("MMC-CLI is not prepared to send stop push.");
  }
  mmccliStatus = MmccliConnectionState.Sending;
  const result = await writeCommand(`stop_push_carrier ${line} ${axisId}a`);
  mmccliStatus = MmccliConnectionState.Open;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function pullCarrier(
  direction: string,
  line: string,
  axisId: string,
  carrierId: string,
  destination?: string,
  casDisabled?: boolean,
) {
  if (mmccliStatus !== MmccliConnectionState.Open) {
    return Promise.reject("MMC-CLI is not prepared to send pull.");
  }
  mmccliStatus = MmccliConnectionState.Sending;
  const result = await writeCommand(
    `pull_carrier_${direction} ${line} ${axisId} ${carrierId} ${destination && destination !== "NaN" ? destination : casDisabled ? "NaN" : ""} ${casDisabled ? "true" : ""}`,
  );
  mmccliStatus = MmccliConnectionState.Open;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function pushCarrier(
  direction: string,
  line: string,
  axisId: string,
  carrierId?: string,
) {
  if (mmccliStatus !== MmccliConnectionState.Open) {
    return Promise.reject("MMC-CLI is not prepared to send push.");
  }
  mmccliStatus = MmccliConnectionState.Sending;
  const result = await writeCommand(
    `push_carrier_${direction} ${line} ${axisId} ${carrierId ? carrierId : ""}`,
  );
  mmccliStatus = MmccliConnectionState.Open;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

const findError = (commandResponses: string[]): string => {
  const errorMsgIndex = commandResponses.findIndex((res) =>
    res.toLowerCase().includes("error"),
  );

  const errorMsg = commandResponses[errorMsgIndex];
  const errorReg = /error: (.+)/;
  const desc = errorMsg.match(errorReg)![1].replaceAll(`"`, "");
  return desc;
};

export async function killTerminal() {
  pty.kill();
}

export async function findMmcServer(ip: string): Promise<number> {
  try {
    const { port, clientIds } = await scanPorts(ip);
    const disconnectServer = clientIds.map((id) => disconnect(id));
    await Promise.allSettled(disconnectServer);
    tcpClientIds.splice(0, tcpClientIds.length);

    if (port) {
      return Promise.resolve(port);
    } else {
      return Promise.reject("Invalid Tcp Connection");
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

export async function scanPorts(
  ip: string,
): Promise<{ port: number | null; clientIds: string[] }> {
  const found: string[] = [];
  const unlisten = await listen((x) => {
    if (x.payload.id) {
      if (x.payload.event.message) {
        const buffer = Buffer.from(x.payload.event.message.data);
        const decode = fromBinary(ResponseSchema, buffer);
        if (decode && decode.body.case === "core") {
          const core = decode.body.value;
          if (core && core.body.case === "apiVersion") {
            found.push(x.payload.id);
          }
        }
      }
    }
  });

  try {
    const scanPorts = Command.sidecar("binaries/rustscan", ["-a", ip]);
    let startScanPort: boolean = false;
    let completeScanPort: boolean = false;

    const ports: Promise<number | null>[] = [];

    scanPorts.stdout.on("data", async (data) => {
      if (data.slice(0, 4).toLowerCase() === "open" && data.includes(":")) {
        if (!startScanPort) {
          startScanPort = true;
        }
        const openPort = data.split(":").pop();
        const clientId = crypto.randomUUID();
        ports.push(getApiVersion(clientId, ip, Number(openPort)));
        tcpClientIds.push(clientId);
      } else {
        if (startScanPort) {
          completeScanPort = true;
        }
      }
    });

    scanPorts.on("close", () => {
      if (!completeScanPort) {
        completeScanPort = true;
      }
    });

    const child = await scanPorts.spawn();
    while (!completeScanPort) {
      if (found.length !== 0) {
        break;
      }
      await delay(1);
    }
    await child.kill();

    unlisten();
    while (ports.length !== tcpClientIds.length) {
      if (found.length !== 0) {
        break;
      }
      await delay(1);
    }

    const portList = await Promise.all(ports);
    if (found.length !== 0) {
      return Promise.resolve({
        port: Number(portList[tcpClientIds.indexOf(found[0])]),
        clientIds: tcpClientIds,
      });
    } else {
      return Promise.resolve({
        port: null,
        clientIds: tcpClientIds,
      });
    }
  } catch (e) {
    return Promise.reject(e as string);
  }
}

async function getApiVersion(
  clientId: string,
  addr: string,
  port: number,
): Promise<number | null> {
  try {
    await connect(clientId, `${addr}:${port}`);
    const payload: Request = {
      $typeName: "mmc.Request",
      body: {
        case: "core",
        value: {
          $typeName: "mmc.core.Request",
          kind: Request_Kind.CORE_REQUEST_KIND_API_VERSION,
        },
      },
    };

    const buffer: Uint8Array = toBinary(RequestSchema, payload);
    await send(clientId, Array.from<number>(buffer));
    return Promise.resolve(port);
  } catch (e) {
    console.error(e);
    return Promise.resolve(null);
  }
}
