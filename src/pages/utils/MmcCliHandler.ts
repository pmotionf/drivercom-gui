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

  console.log(buffer.toString());
  responses.push(str);
  if (str.includes(responseKey)) {
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
    return Promise.reject("mmc-cli not found in files.");
  }

  await writeCommandWithEcho(`cd "${fixPath}resources"`);
  await writeCommand(`./${mmccli}`);
  responses = [];

  return Promise.resolve();
}

export async function loadConfig(ip: string, port: number) {
  const config = buildCliConfig(ip, port);
  const resourcePath = await appDataDir();
  const configFilePath = await path.join(resourcePath, "config.json5");
  await writeTextFile(configFilePath, config);
  await writeCommand(`load_config ${configFilePath}`);

  const res = await connectMmccli();
  if (res.some((response) => response.toLowerCase().includes("error"))) {
    return Promise.resolve(null);
  } else {
    return Promise.resolve({ ip: ip, port: port });
  }
}

async function connectMmccli() {
  const res = await writeCommand("connect");
  return res;
}

export async function disconnectMmccli() {
  await writeCommand("disconnect");
  Promise.resolve();
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
  const currentPlatform = platform();
  const enterBar = currentPlatform === "windows" ? "\r\n" : "\n";
  responseKey = ">";
  pty.write(`exit ${enterBar}`);

  while (!isResponseReturn) {
    await delay(1);
  }
  isResponseReturn = false;
  responses = [];

  return Promise.resolve();
}

export async function stopPull(line: string, axisId: number) {
  const result = await writeCommand(`stop_pull_carrier ${line} ${axisId}a`);
  return Promise.resolve<string[]>(result);
}

export async function stopPush(line: string, axisId: number) {
  const result = await writeCommand(`stop_push_carrier ${line} ${axisId}a`);
  return Promise.resolve<string[]>(result);
}

export async function pullCarrier(
  direction: string,
  line: string,
  axisId: string,
  carrierId: string,
  destination?: string,
  casDisabled?: boolean,
) {
  const result = await writeCommand(
    `pull_carrier_${direction} ${line} ${axisId} ${carrierId} ${destination && destination !== "NaN" ? destination : casDisabled ? "NaN" : ""} ${casDisabled ? "true" : ""}`,
  );
  return Promise.resolve<string[]>(result);
}

export async function pushCarrier(
  direction: string,
  line: string,
  axisId: string,
  carrierId?: string,
) {
  const result = await writeCommand(
    `push_carrier_${direction} ${line} ${axisId} ${carrierId ? carrierId : ""}`,
  );
  return Promise.resolve<string[]>(result);
}

export async function killTerminal() {
  pty.kill();
}

export async function scanPorts(ip: string): Promise<number[]> {
  const results: number[] = [];
  try {
    const scanPorts = Command.sidecar("binaries/rustscan", ["-a", ip]);
    let startScanPort: boolean = false;
    let completeScanPort: boolean = false;

    scanPorts.stdout.on("data", async (data) => {
      if (data.slice(0, 4).toLowerCase() === "open" && data.includes(":")) {
        if (!startScanPort) {
          startScanPort = true;
        }
        const openPort = data.split(":").pop();
        results.push(Number(openPort));
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
      await delay(1);
    }
    await child.kill();
    return Promise.resolve(results);
  } catch (e) {
    return Promise.reject(e as string);
  }
}

export async function checkMmcServer(
  ip: string,
  ports: number[],
): Promise<number> {
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
  const clientIds: string[] = ports.map(() => crypto.randomUUID());
  const found: string[] = [];

  console.log("Start");

  const count: string[] = [];
  const unlisten = await listen((x) => {
    if (x.payload.id) {
      if (!count.includes(x.payload.id)) {
        count.push(x.payload.id);
      }
    }
    if (x.payload.id && x.payload.event.message) {
      const buffer = Buffer.from(x.payload.event.message.data);
      const decode = fromBinary(ResponseSchema, buffer);
      if (decode && decode.body.case === "core") {
        const core = decode.body.value;
        if (core && core.body.case === "apiVersion") {
          found.push(x.payload.id);
        }
      }
    }
  });

  const promises = ports.map((port, i) =>
    getApiVersion(clientIds[i], ip, port, buffer),
  );

  await Promise.all(promises);

  while (count.length !== ports.length) {
    await delay(1);
  }

  unlisten();

  console.log(clientIds.sort(), count.sort());
  console.log("end");

  if (found.length === 0) {
    return Promise.reject("No tcp server connection found");
  } else {
    return Promise.resolve<number>(ports[clientIds.indexOf(found[0])]);
  }
}

async function getApiVersion(
  clientId: string,
  addr: string,
  port: number,
  buffer: Uint8Array,
): Promise<number | null> {
  try {
    await connect(clientId, `${addr}:${port}`);
    await send(clientId, Array.from<number>(buffer));
    return Promise.resolve(port);
  } catch (e) {
    console.error(e);
    return Promise.resolve(null);
  }
}
