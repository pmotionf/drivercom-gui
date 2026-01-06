import { Buffer } from "buffer";
import { Terminal } from "xterm";
import { spawn } from "tauri-pty";
import { platform } from "@tauri-apps/plugin-os";
import { resolveResource } from "@tauri-apps/api/path";
import { BaseDirectory, readDir, writeTextFile } from "@tauri-apps/plugin-fs";
import { path } from "@tauri-apps/api";
import JSON5 from "json5";

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

  if (str.includes(responseKey)) isResponseReturn = true;
  responses.push(JSON.stringify(str));
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
  responses = [];
  responseKey = "Please enter a command";
  pty.write(cmd + enterBar);

  while (!isResponseReturn) {
    await delay(1);
  }

  return Promise.resolve<string[]>(responses);
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
  await loadConfig("192.168.0.98");

  return Promise.resolve();
}

async function loadConfig(ip: string) {
  const config = buildCliConfig(ip);
  const resourcePath = await resolveResource("resources");
  const configFilePath = await path.join(resourcePath, "config.json5");
  await writeTextFile(configFilePath, config);

  await writeCommand("load_config");
  const responses = await writeCommand("connect");
  return responses;
}

const buildCliConfig = (ip: string) => {
  const newCliConfig: cliFormat = {
    modules: [
      {
        mmc_client: {
          host: ip,
          port: 9001,
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
  pty.write(`exit ${enterBar}`);
}

const delay = async (ms: number) =>
  new Promise<NodeJS.Timeout>((resolve) => {
    setTimeout(resolve, ms);
  });
