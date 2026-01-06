import { Buffer } from "buffer";
import { Terminal } from "xterm";
import { spawn } from "tauri-pty";
import { platform } from "@tauri-apps/plugin-os";
import { resolveResource } from "@tauri-apps/api/path";

const term = new Terminal({
  convertEol: true,
  windowsMode: false,
});

const pty = spawn(platform() === "windows" ? "powershell.exe" : "bash", [], {
  cols: term.cols,
  rows: term.rows,
});

let responses: string[] = [];
let responseLength = 0;

pty.onData((data) => {
  responseLength = responseLength + 1;
  term.write(new Uint8Array(data));
  const buffer = Buffer.from(data);
  const str = buffer.toString();
  responses.push(str);
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
  pty.write(cmd + enterBar);

  while (responses.length === 0) {
    await delay(1);
  }
  // Add more wait time for full response
  //await delay(1000);
  console.log(responses, cmd);

  return Promise.resolve<string[]>(responses);
}

export async function prepareMmccli() {
  const currentPlatform = platform();
  const targetTriple =
    currentPlatform === "windows"
      ? "-x86_64-pc-windows-msvc.exe"
      : "-x86_64-unknown-linux-gnu";
  const mmccli = "mmccli" + targetTriple;
  const resourcePath = await resolveResource(mmccli);
  const fixPath = resourcePath.replace(mmccli, "");

  await writeCommand(`cd "${fixPath}resources"`);
  await writeCommand(`./${mmccli}`);
  const loadConfigResponse = await loadConfig();

  await writeCommand("exit");
  if (
    loadConfigResponse.some((res) => res.includes("Please enter a command"))
  ) {
    return Promise.resolve();
  } else {
    return Promise.reject("mmc-cli is not available.");
  }
}

async function loadConfig() {
  const responses = await writeCommand("load_config");
  return responses;
}

const delay = async (ms: number) =>
  new Promise<NodeJS.Timeout>((resolve) => {
    setTimeout(resolve, ms);
  });
