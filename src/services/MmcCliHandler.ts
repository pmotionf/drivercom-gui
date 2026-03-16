import { Buffer } from "buffer";
import { Terminal } from "xterm";
import { spawn } from "tauri-pty";
import { platform } from "@tauri-apps/plugin-os";
import { appDataDir, resolveResource } from "@tauri-apps/api/path";
import { BaseDirectory, readDir, writeTextFile } from "@tauri-apps/plugin-fs";
import { path } from "@tauri-apps/api";
import JSON5 from "json5";
import { Command } from "@tauri-apps/plugin-shell";
import { Request, RequestSchema, ResponseSchema } from "~/proto/mmc_pb";
import { Request_Kind } from "~/proto/mmc/core_pb";
import { fromBinary, toBinary } from "@bufbuild/protobuf";
import { connect, disconnect, listen, send } from "@kuyoonjo/tauri-plugin-tcp";
import { tcpClientIds } from "~/store/GlobalState";

export enum MmcCliState {
  Unloaded, // MMC-CLI is closed.
  Loading, // MMC-CLI is opened, but not connected to server.
  Ready, // Ready to send command in MMC-CLI.
  SendingCommand, // MMC-CLI is sending to command.
  WaitCompletion, // Waiting until MMC-CLI wait command completed.
  ExecutingScenario, // Scenario file is running in MMC-CLI.
  Exiting, // Exiting MMC-CLI.
}

type cliFormat = {
  modules: {
    mmc_client: {
      host: string;
      port: number;
    };
  }[];
};

let mmccliStatus: MmcCliState = MmcCliState.Unloaded;
export function getMmccliStatus() {
  return mmccliStatus;
}

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
let isCommandStop: boolean = false;

pty.onData((data) => {
  term.write(new Uint8Array(data));
  const buffer = Buffer.from(data);
  const str = buffer.toString();
  responses.push(str);
  if (str.toLowerCase().trim().includes(responseKey.toLowerCase().trim())) {
    isResponseReturn = true;
  }
});

term.onData((data) => {
  pty.write(data);
});

async function writeCommand(cmd: string) {
  const enterBar = platform() === "windows" ? "\r\n" : "\n";
  responseKey = "HELP";
  responses = [];

  pty.write(cmd + enterBar);

  while (!isResponseReturn) {
    if (isCommandStop) break;
    await delay(1);
  }
  isResponseReturn = false;
  const commandResponses = responses;
  responses = [];

  return Promise.resolve<string[]>(commandResponses);
}

async function writeCommandWithEcho(cmd: string) {
  const enterBar = platform() === "windows" ? "\r\n" : "\n";

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

function timer(ms: number) {
  return new Promise<NodeJS.Timeout>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function delay(ms: number) {
  const timeout = await timer(ms);
  clearTimeout(timeout);
  return Promise.resolve();
}

export async function prepareMmccli() {
  if (mmccliStatus !== MmcCliState.Unloaded)
    return Promise.reject(`mmc-cli is ${MmcCliState[mmccliStatus]}`);

  const extension = platform() === "windows" ? ".exe" : "";
  let mmccli = "";
  const resourcePath = await resolveResource("resources");

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
      return Promise.reject("Invalid file");
    }
  } catch {
    return Promise.reject("mmc-cli not found in files.");
  }

  await writeCommandWithEcho(`cd "${resourcePath}"`);
  await writeCommand(`./${mmccli}`);
  mmccliStatus = MmcCliState.Loading;
  responses = [];

  return Promise.resolve();
}

export async function loadConfig(ip: string, port: number) {
  if (mmccliStatus !== MmcCliState.Loading) {
    return Promise.reject("MMC-CLI is not open.");
  }
  const config = buildCliConfig(ip, port);
  const resourcePath = await appDataDir();
  const configFilePath = await path.join(resourcePath, "config.json5");
  await writeTextFile(configFilePath, config);
  const res = await writeCommand(`load_config ${configFilePath}`);

  if (res.some((response) => response.toLowerCase().includes("error"))) {
    const errorMsg = findError(res);
    return Promise.reject(errorMsg);
  } else {
    return Promise.resolve();
  }
}

export async function connectMmcServer() {
  if (mmccliStatus !== MmcCliState.Loading) {
    return Promise.reject("MMC-CLI is not open.");
  }
  const res = await writeCommand("connect");
  if (res.some((response) => response.toLowerCase().includes("error"))) {
    const errMsg = findError(res);
    return Promise.reject(errMsg);
  } else {
    mmccliStatus = MmcCliState.Ready;
    return Promise.resolve();
  }
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

export async function stopCommand() {
  if (mmccliStatus === MmcCliState.SendingCommand) {
    isCommandStop = true;
    responseKey = "error";
    responses = [];

    const stopKey = `\x03`;
    pty.write(stopKey);
    while (!isResponseReturn) {
      await delay(1);
    }
    isResponseReturn = false;
    responses = [];
    isCommandStop = false;

    mmccliStatus = MmcCliState.Ready;
    return Promise.resolve();
  }
  return Promise.reject("There is no command to stop.");
}

export async function exit() {
  if (mmccliStatus === MmcCliState.SendingCommand) {
    await stopCommand();
  }
  if (mmccliStatus === MmcCliState.Ready) {
    mmccliStatus = MmcCliState.Exiting;
    const currentPlatform = platform();
    const enterBar = currentPlatform === "windows" ? "\r\n" : "\n";
    responseKey = "disconnected from";
    pty.write(`exit ${enterBar}`);

    while (!isResponseReturn) {
      await delay(1);
    }
    isResponseReturn = false;
    responses = [];

    mmccliStatus = MmcCliState.Unloaded;
    return Promise.resolve();
  }
  return Promise.reject(`mmc-cli is ${MmcCliState[mmccliStatus]}`);
}

export async function stopPull(line: string, axisId: number) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send stop pull.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(`stop_pull_carrier ${line} ${axisId}a`);
  mmccliStatus = MmcCliState.Ready;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function stopPush(line: string, axisId: number) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send stop push.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(`stop_push_carrier ${line} ${axisId}a`);
  mmccliStatus = MmcCliState.Ready;
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
  cas?: string,
) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send pull.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(
    `pull_carrier ${line} ${axisId} ${carrierId} ${direction} ${destination ? destination : ""} ${destination ? cas : ""}`,
  );
  mmccliStatus = MmcCliState.Ready;
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
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send push.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(
    `push_carrier ${line} ${axisId} ${direction} ${carrierId ? carrierId : ""}`,
  );
  mmccliStatus = MmcCliState.Ready;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function getSpeed(line: string): Promise<string | null> {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.resolve(null);
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const response = await writeCommand(`get_speed ${line}`);
  mmccliStatus = MmcCliState.Ready;

  if (response.some((res) => res.toLowerCase().includes("error"))) {
    return Promise.resolve(null);
  } else {
    const speedRegex = /speed:\s*([\d.]+\s*[a-zA-Z/]+)/;
    const speed = response.join("").match(speedRegex);
    if (!speed) return Promise.reject("Invalid response");
    return Promise.resolve(speed[1]);
  }
}

export async function getAcceleration(line: string): Promise<string | null> {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.resolve(null);
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const response = await writeCommand(`get_acceleration ${line}`);
  mmccliStatus = MmcCliState.Ready;

  if (response.some((res) => res.toLowerCase().includes("error"))) {
    return Promise.resolve(null);
  } else {
    const accelerationRegex = /acceleration:\s*([\d.]+\s*(?:mm|cm|m)\/s²)/;
    const acceleration = response.join("").match(accelerationRegex);
    if (!acceleration) return Promise.reject("Invalid response");
    return Promise.resolve(acceleration[1]);
  }
}

export async function setSpeed(line: string, speed: number) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send set speed.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(`set_speed ${line} ${speed} `);
  mmccliStatus = MmcCliState.Ready;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function setAcceleration(line: string, acceleration: number) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send set acceleration.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(`SET_ACCELERATION ${line} ${acceleration}`);
  mmccliStatus = MmcCliState.Ready;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function setZero(line: string) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send set zero.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(`set_zero ${line}`);
  mmccliStatus = MmcCliState.Ready;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function calibrate(line: string) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send calibrate.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(`calibrate ${line}`);
  mmccliStatus = MmcCliState.Ready;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function initialize(
  line: string,
  axisId: number,
  direction: string,
  carrierId: string,
  linkAxis?: string,
) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send set speed.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(
    `initialize ${line} ${axisId} ${direction} ${carrierId} ${linkAxis ? linkAxis : ""}`,
  );
  mmccliStatus = MmcCliState.Ready;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function deinitialize(line: string, axisId: number) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC-CLI is not prepared to send set speed.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(
    `deinitialize ${line} ${axisId ? `${axisId}a` : ""}`,
  );
  mmccliStatus = MmcCliState.Ready;
  if (result.some((res) => res.toLowerCase().includes("error"))) {
    const errMsg = findError(result);
    return Promise.reject(errMsg);
  } else {
    return Promise.resolve();
  }
}

export async function moveCarrier(
  line: string,
  carrier: number,
  target: string,
  controlMode?: string,
  cas?: string,
) {
  if (mmccliStatus !== MmcCliState.Ready) {
    return Promise.reject("MMC_CLI is not prepared to send move carrier.");
  }
  mmccliStatus = MmcCliState.SendingCommand;
  const result = await writeCommand(
    `move_carrier ${line.toLowerCase()} ${carrier} ${target.toLowerCase()} ${controlMode ? controlMode.toLowerCase() : "position"} ${cas ? cas.toLowerCase() : "on"}`,
  );
  mmccliStatus = MmcCliState.Ready;
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
    if (!port) Promise.reject("Invalid Tcp Connection");
    const disconnectServer = clientIds.map((id) => disconnect(id));
    await Promise.allSettled(disconnectServer);
    tcpClientIds.splice(0, tcpClientIds.length);

    return Promise.resolve(port!);
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
          if (core && core.body.case === "server") {
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
          kind: Request_Kind.CORE_REQUEST_KIND_SERVER_INFO,
        },
      },
    };

    const buffer: Uint8Array = toBinary(RequestSchema, payload);
    await send(clientId, Array.from<number>(buffer));
    return Promise.resolve(port);
  } catch {
    return Promise.resolve(null);
  }
}
