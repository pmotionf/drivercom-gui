import { Command } from "@tauri-apps/plugin-shell";
import { portCommands } from "~/store/GlobalState";
import { toaster } from "./Toaster";
import JSON5 from "json5";
import { ConfigType } from "src-tauri/generated/config/ConfigType";

export type Port = {
  id: string;
  version: string;
};

export async function detectPort(): Promise<Port[]> {
  const drivercom = Command.sidecar("binaries/drivercom", ["port.detect"]);
  const output = await drivercom.execute();

  const portNames = output.stdout
    .split("\n")
    .map((portName) => {
      const matched = portName.match(/\(([^)]+)\)/);
      return matched;
    })
    .filter((e) => e !== null)
    .map((e) => e[1]);
  const ports = await Promise.all(
    portNames.map(async (id) => {
      const version = await detectFirmwareVersion(id);
      if (version !== null) {
        return {
          id: id,
          version: version,
        };
      } else {
        return {
          id: id,
          version: "",
        };
      }
    }),
  );

  return Promise.resolve(ports);
}

async function detectFirmwareVersion(portId: string): Promise<string | null> {
  const drivercom = Command.sidecar("binaries/drivercom", [
    "--port",
    portId,
    "firmware",
  ]);
  const output = await drivercom.execute();
  const splits = output.stdout.split(":");
  if (splits.length < 2) return null;

  const version_string = splits[1].trimStart().trimEnd();
  return version_string;
}

export const checkAvailablePort = (portId: string): boolean => {
  if (portId.length === 0) {
    return true;
  }
  if (
    Array.from(portCommands.values()).some((command) => command.port === portId)
  ) {
    toaster.create({
      title: "Communication error",
      description: "Port is already in use.",
      type: "error",
    });
    return false;
  }
  return true;
};

export async function getConfigFromPort(portId: string): Promise<ConfigType> {
  const configGet = Command.sidecar("binaries/drivercom", [
    `--port`,
    portId,
    `config.get`,
  ]);

  let stdout = "";
  configGet.stdout.on("data", (data) => {
    stdout = stdout + data;
  });

  let stderr = "";
  configGet.stderr.on("data", (data) => {
    stderr = stderr + data;
  });

  const child = await configGet.spawn();
  const pid = child.pid;
  portCommands.set(pid, { port: portId, child: child });

  return new Promise((resolve, reject) => {
    configGet.on("close", () => {
      portCommands.delete(pid);
      return resolve(JSON5.parse(stdout));
    });

    configGet.on("error", () => {
      portCommands.delete(pid);
      return reject(stderr);
    });
  });
}
