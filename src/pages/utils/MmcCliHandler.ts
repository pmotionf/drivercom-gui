import { Buffer } from "buffer";
import { Terminal } from "xterm";
import { spawn } from "tauri-pty";
import { platform } from "@tauri-apps/plugin-os";
import { resolveResource } from "@tauri-apps/api/path";

const term = new Terminal({
  convertEol: true,
  windowsMode: false,
});

const pty = spawn("bash", [], {
  cols: term.cols,
  rows: term.rows,
});

pty.onData((data) => {
  // Need to find parse Uint8Array from terminal
  //const uint8arr = new Uint8Array(data);
  //const decoder = new TextDecoder("utf-8");
  //const str = decoder.decode(uint8arr);

  const buffer = Buffer.from(data);
  console.log(buffer.toString());
});

pty.onExit(({ exitCode }) => {
  console.log(`\n\nProgram exit: ${exitCode}`);
});

function writeCommand(cmd: string) {
  const currentPlatform = platform();
  const enterBar = currentPlatform === "windows" ? "\r\n" : "\n";
  pty.write(cmd + enterBar);
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
  console.log(fixPath);

  writeCommand(`cd ~${fixPath}`);
  writeCommand(`./mmccli`);
}

export function loadConfig() {
  writeCommand("load_config");
}
