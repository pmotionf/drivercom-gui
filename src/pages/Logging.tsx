import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import {
  logFormFileFormat,
  portId,
  recentFilesPath,
  setRecentFilesPath,
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

  async function GetConfigFromPort() {
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

  async function getEmptyLogConfiguration() {
    const logConfig = Command.sidecar("binaries/drivercom", [
      "log.config.empty",
    ]);
    const output = await logConfig.execute();
    const logFormatToJson = JSON.parse(output.stdout);
    setFileName("New File");
    setLogConfigureFile(logFormatToJson);
    setIsFileOpen(true);
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
        <Show when={!isFileOpen()}>
          <Stack width="42rem" marginLeft={`calc((100% - 42rem) / 2)`}>
            <Text variant={"heading"} size={"2xl"}>
              Logging
            </Text>
            <Stack
              direction={"row"}
              marginTop={"1.5rem"}
              justifyContent={"center"}
            >
              <Button
                variant={"outline"}
                padding={"4rem"}
                onClick={() => getEmptyLogConfiguration()}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--colors-bg-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--colors-bg-error)";
                }}
              >
                Create New File
              </Button>
              <Button
                variant={"outline"}
                padding={"4rem"}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--colors-bg-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--colors-bg-error)";
                }}
                onClick={async () => {
                  const path = await open({
                    multiple: false,
                    filters: [
                      { name: "JSON", extensions: ["json"] },
                    ],
                  });

                  if (!path) {
                    toaster.create({
                      title: "Invalid File Path",
                      description: "The specified file path is invalid.",
                      type: "error",
                    });
                    return;
                  }

                  const extension = path.split(".").pop();
                  if (extension != "json") {
                    toaster.create({
                      title: "Invalid File Extension",
                      description: "The specified file extension is invalid.",
                      type: "error",
                    });
                    return;
                  }

                  const output = await readTextFile(path);
                  const parseFileToJson = JSON.parse(output);
                  const openJsonFileKeys = Object.keys(parseFileToJson).sort();
                  const checkFileFormat = Object.keys(logFormFileFormat())
                    .sort();
                  if (
                    openJsonFileKeys.toString() !== checkFileFormat.toString()
                  ) {
                    toaster.create({
                      title: "Invalid Log Fields",
                      description: "The specified fields are invalid.",
                      type: "error",
                    });
                    return;
                  }

                  const fileName = path.toString().split("\\");
                  setFileName(fileName[fileName.length - 1]);
                  setRecentFilesPath((prev) => {
                    const parseFilePath = prev.filter((prevPath) =>
                      prevPath !== path
                    );
                    return [path, ...parseFilePath];
                  });
                  setLogConfigureFile(parseFileToJson);
                  setIsFileOpen(true);
                }}
              >
                Open File
              </Button>
              <Button
                variant={"outline"}
                padding={"4rem"}
                disabled={portId().length === 0}
                onClick={() => {
                  GetConfigFromPort();
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--colors-bg-muted)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "var(--colors-bg-error)";
                }}
              >
                Get From Port
              </Button>
            </Stack>
            <Show when={recentFilesPath().length !== 0}>
              <Text variant={"heading"} size={"xl"} marginTop={"2rem"}>
                Recent files
              </Text>
              <Stack marginTop={"0.5rem"}>
                <For each={recentFilesPath()}>
                  {(path) => (
                    <Text
                      onClick={async () => {
                          try {
                            const output = await readTextFile(path);
                          const parseFileToJson = JSON.parse(output);
                          const openJsonFileKeys = Object.keys(parseFileToJson)
                            .sort();
                          const checkFileFormat = Object.keys(
                            logFormFileFormat(),
                          ).sort();
                          if (
                            openJsonFileKeys.toString() !==
                              checkFileFormat.toString()
                          ) {
                            toaster.create({
                              title: "Invalid Log Fields",
                              description: "The specified fields are invalid.",
                              type: "error",
                            });
                            return;
                          }

                          const fileName = path.toString().split("\\");
                          setFileName(fileName[fileName.length - 1]);
                          setRecentFilesPath((prev) => {
                            const parseFilePath = prev.filter((prevPath) =>
                              prevPath !== path
                            );
                            return [path, ...parseFilePath].slice(0, 7);
                          });
                          setLogConfigureFile(parseFileToJson);
                          setIsFileOpen(true);

                          } catch {
                            toaster.create({
                              title: "Invalid File Path",
                              description: "The specified file path does not exist.",
                              type: "error"
                            })
                            setRecentFilesPath((prev) => {
                              const parseFilePath = prev.filter((prevPath) =>
                                prevPath !== path
                              );
                              return [...parseFilePath].slice(0, 7);
                            });
                          }
                      }}
                      style={{ "text-decoration": "underline" }}
                      fontWeight="light"
                      cursor={"pointer"}
                    >
                      {path}
                    </Text>
                  )}
                </For>
              </Stack>
            </Show>
          </Stack>
        </Show>
        <Stack direction="row" justifyContent={"center"}>
          <Show when={isFileOpen()}>
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
          </Show>
        </Stack>
      </div>
    </>
  );
}

export default Logging;
