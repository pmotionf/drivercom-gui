import { Buffer } from "buffer";
import { Terminal } from "xterm";
import { spawn } from "tauri-pty";
import { platform } from "@tauri-apps/plugin-os";
import { resolveResource } from "@tauri-apps/api/path";
import { readdir } from "node:fs/promises";
import { BaseDirectory, readDir } from "@tauri-apps/plugin-fs";

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
  const response = await loadConfig();
  console.log(response);
  pty.write("exit\n\r");

  return Promise.resolve();
}

async function loadConfig() {
  const responses = await writeCommand("load_config");
  return responses;
}

const delay = async (ms: number) =>
  new Promise<NodeJS.Timeout>((resolve) => {
    setTimeout(resolve, ms);
  });
