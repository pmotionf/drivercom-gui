import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import {
  logFormFileFormat,
  portId,
  recentFilePaths,
  setRecentFilePaths,
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

  async function getEmptyLog() {
    const logConfig = Command.sidecar("binaries/drivercom", [
      "log.config.empty",
    ]);
    const output = await logConfig.execute();
    const parseFileToObject = JSON.parse(output.stdout);
    setFileName("New File");
    setLogConfigureFile(parseFileToObject);
    setIsFileOpen(true);
  }

  async function getFilePath() {
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

  async function readJsonFile(path: string) {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);
      const newFileFormat = Object.entries(parseFileToObject)
        .map((line) => {
          return [line[0], typeof line[1]];
        })
        .sort()
        .toString();
      const logFileFormat = Object.entries(
        logFormFileFormat(),
      )
        .map((line) => {
          return [line[0], typeof line[1]];
        })
        .sort()
        .toString();

      if (
        newFileFormat !==
          logFileFormat
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
      setRecentFilePaths((prev) => {
        const parseFilePath = prev.filter((prevPath) => prevPath !== path);
        return [path, ...parseFilePath].slice(0, 7);
      });
      setLogConfigureFile(parseFileToObject);
      setIsFileOpen(true);
    } catch {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      setRecentFilePaths((prev) => {
        const parseFilePath = prev.filter((prevPath) => prevPath !== path);
        return [...parseFilePath].slice(0, 7);
      });
    }
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  return (
    <>
      <div
        style={{
          "padding-top": "4rem",
          "padding-bottom": "3rem",
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
          <Stack width="42rem" marginLeft={`calc((100% - 42rem) / 2)`}>
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
                onClick={() => getEmptyLog()}
              >
                Create New File
              </Button>
              <Button
                variant={"outline"}
                padding={"4rem"}
                onClick={async () => {
                  const path = await getFilePath();
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
            <Show when={recentFilePaths().length !== 0}>
              <Text size={"xl"} marginTop={"2rem"} fontWeight={"bold"}>
                Recent
              </Text>
              <Stack marginTop={"0.5rem"}>
                <For each={recentFilePaths()}>
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
