import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import {
  logFormFileFormat,
  portId,
  recentLogFilePaths,
  setRecentLogFilePaths,
} from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { createSignal, For, Show } from "solid-js";
import { LoggingForm } from "./Logging/LoggingForm";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

export function Logging() {
  const [isFileOpen, setIsFileOpen] = createSignal<boolean>(false);
  const [logConfigureFile, setLogConfigureFile] = createSignal({});
  const [fileName, setFileName] = createSignal<string>("");

  async function GetLogConfigFromPort() {
    if (portId().length === 0) return;
    const sideCommand = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.config.get`,
    ]);
    const output = await sideCommand.execute();
    const obj = JSON.parse(output.stdout);

    if (output.stdout.length === 0) return;
    setFileName(portId());
    setLogConfigureFile(obj);
    setIsFileOpen(true);
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function openFileDialog() {
    const path = await open({
      multiple: false,
      filters: [
        { name: "JSON", extensions: ["json"] },
      ],
    });

    if (!path) {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      return undefined;
    }

    const extension = path.split(".").pop();
    if (extension != "json") {
      toaster.create({
        title: "Invalid File Extension",
        description: "The file extension is invalid.",
        type: "error",
      });
      return undefined;
    }
    return path;
  }

  function checkFileFormat(file: object): string {
    const newFileFormat = Object.entries(file)
      .map((line) => {
        const key = line[0];
        const value = line[1];
        if (typeof value !== "object") return [key, typeof value];
        const parseValue = checkFileFormat(value);
        return [key, parseValue];
      })
      .sort()
      .toString();

    return newFileFormat;
  }

  async function readJsonFile(path: string) {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);
      const checkNewFileFormat = checkFileFormat(parseFileToObject);
      const logFileFormat = checkFileFormat(logFormFileFormat());

      if (
        checkNewFileFormat !== logFileFormat
      ) {
        toaster.create({
          title: "Invalid Log",
          description: "Invalid log file.",
          type: "error",
        });
        return;
      }

      const fileName = path.replaceAll("\\", "/").split("/").pop();
      setFileName(fileName!);
      setRecentLogFilePaths((prev) => {
        const parseFilePath = prev.filter((prevPath) => prevPath !== path);
        return [path, ...parseFilePath];
      });
      setLogConfigureFile(parseFileToObject);
      setIsFileOpen(true);
    } catch {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      setRecentLogFilePaths((prev) => {
        const parseFilePath = prev.filter((prevPath) => prevPath !== path);
        return [...parseFilePath];
      });
    }
  }

  return (
    <>
      <div
        style={{
          "padding-top": "4rem",
          "padding-bottom": "4rem",
          "height": "100%",
        }}
      >
        <Toast.Toaster toaster={toaster}>
          {(toast) => (
            <Toast.Root>
              <Toast.Title>{toast().title}</Toast.Title>
              <Toast.Description>{toast().description}</Toast.Description>
              <Toast.CloseTrigger>
                <IconX />
              </Toast.CloseTrigger>
            </Toast.Root>
          )}
        </Toast.Toaster>
        <Show
          when={!isFileOpen()}
          fallback={
            <Stack direction="row" justifyContent={"center"}>
              <LoggingForm
                jsonfile={logConfigureFile()}
                fileName={fileName()}
                onCancel={() => {
                  setFileName("");
                  setIsFileOpen(false);
                  setLogConfigureFile({});
                }}
                onErrorMessage={(msg) => toaster.create(msg)}
                style={{ "margin-bottom": "3rem" }}
              />
            </Stack>
          }
        >
          <Stack
            width="42rem"
            marginLeft={`calc((100% - 42rem) / 2)`}
            height={"100%"}
          >
            <Text variant={"heading"} size={"3xl"}>
              Logging
            </Text>
            <Stack
              direction={"row"}
              justifyContent={"center"}
              marginTop={"1.5rem"}
            >
              <Button
                variant={"outline"}
                padding={"4rem"}
                onClick={() => {
                  const newEmptyFile = JSON.parse(
                    JSON.stringify(logFormFileFormat()),
                  );
                  setFileName("New File");
                  setLogConfigureFile(newEmptyFile);
                  setIsFileOpen(true);
                }}
              >
                Create New File
              </Button>
              <Button
                variant={"outline"}
                padding={"4rem"}
                onClick={async () => {
                  const path = await openFileDialog();
                  if (!path) return;
                  readJsonFile(path);
                }}
              >
                Open File
              </Button>
              <Button
                variant={"outline"}
                padding={"4rem"}
                disabled={portId().length === 0}
                onClick={() => {
                  GetLogConfigFromPort();
                }}
              >
                Get From Port
              </Button>
            </Stack>
            <Show when={recentLogFilePaths().length !== 0}>
              <Text size={"xl"} marginTop={"2rem"} fontWeight={"bold"}>
                Recent
              </Text>
              <Stack
                marginTop={"0.5rem"}
                maxHeight={"100%"}
                style={{ "overflow-y": "auto" }}
              >
                <For each={recentLogFilePaths()}>
                  {(path) => (
                    <Text
                      onClick={() => {
                        readJsonFile(path);
                      }}
                      cursor={"pointer"}
                      userSelect="none"
                    >
                      {path}
                    </Text>
                  )}
                </For>
              </Stack>
            </Show>
          </Stack>
        </Show>
      </div>
    </>
  );
}

export default Logging;
