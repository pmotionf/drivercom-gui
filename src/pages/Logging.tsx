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
import { createEffect, createSignal, For, Show } from "solid-js";
import { LoggingForm } from "./Logging/LoggingForm";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { IconButton } from "~/components/ui/icon-button";

export function Logging() {
  const [isFileOpen, setIsFileOpen] = createSignal<boolean>(false);
  const [logConfigureFile, setLogConfigureFile] = createSignal({});
  const [fileName, setFileName] = createSignal<string>("");
  const [filePath, setFilePath] = createSignal<string>("");
  const [logMode, setLogMode] = createSignal<
    "create" | "port" | "file" | "none"
  >("none");

  // This signal is needed in UI when reload the file or port.
  const [renderLoggingForm, setRenderLoggingForm] = createSignal<boolean>(
    false,
  );

  createEffect(() => {
    const currentMode = logMode();
    currentMode === "none" ? setIsFileOpen(false) : setIsFileOpen(true);
  });

  async function GetLogConfigFromPort(): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const sideCommand = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.config.get`,
    ]);
    const output = await sideCommand.execute();
    return { stdout: output.stdout, stderr: output.stderr };
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function openFileDialog(): Promise<string | null> {
    const path = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!path) {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      return null;
    }

    const extension = path.split(".").pop();
    if (extension != "json") {
      toaster.create({
        title: "Invalid File Extension",
        description: "The file extension is invalid.",
        type: "error",
      });
      return null;
    }
    return path.replaceAll("\\", "/");
  }

  function checkFileFormat(file: object): string {
    const newFileFormat = Object.entries(file)
      .map((entry) => {
        const key = entry[0];
        const value = entry[1];
        if (typeof value !== "object") return [key, typeof value];
        const parseValue = checkFileFormat(value);
        return [key, parseValue];
      })
      .sort()
      .toString();

    return newFileFormat;
  }

  function compareFileFormat(newFile: object, fileFormat: object): boolean {
    const newFileObject = checkFileFormat(newFile);
    const logFileObject = checkFileFormat(fileFormat);
    return newFileObject === logFileObject;
  }

  async function readJsonFile(path: string): Promise<object | null> {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);
      return parseFileToObject;
    } catch {
      return null;
    }
  }

  function setFileData(file: object, path: string) {
    setLogConfigureFile(file);
    setFileName(path.split("/").pop()!);
    setFilePath(path);
    setRenderLoggingForm(true);
    setLogMode("file");
  }

  const [isButtonHovered, setIsButtonHoverd] = createSignal<
    [boolean, number | null]
  >([false, null]);

  return (
    <>
      <Stack
        alignItems="center"
        style={{
          "padding-top": "4rem",
          "padding-bottom": "4rem",
          height: "100%",
          width: `100% `,
          "overflow-y": "auto",
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
            <Stack width="42rem">
              <Show when={renderLoggingForm()} fallback={<div></div>}>
                <LoggingForm
                  jsonfile={logConfigureFile()}
                  fileName={fileName()}
                  filePath={filePath()}
                  onFileNameChange={(newFileName) => setFileName(newFileName)}
                  mode={logMode()}
                  onModeChange={(currentMode, path) => {
                    const parsePath = path.split("/").pop();
                    setFileName(parsePath!);
                    setLogMode(currentMode);
                    setFilePath(path);
                  }}
                  onReloadFile={async () => {
                    setRenderLoggingForm(false);
                    const logObj = await readJsonFile(filePath());
                    if (!logObj) {
                      toaster.create({
                        title: "Invalid File Path",
                        description: "The file path is invalid.",
                        type: "error",
                      });
                      setRecentLogFilePaths((prev) => {
                        const newRecentFiles = prev.filter(
                          (prevFilePath) => prevFilePath !== filePath(),
                        );
                        return newRecentFiles;
                      });
                      return;
                    }
                    setLogConfigureFile(logObj);
                    setRenderLoggingForm(true);
                  }}
                  onReloadPort={async () => {
                    setRenderLoggingForm(false);
                    const logObj = await GetLogConfigFromPort();
                    if (!logObj) {
                      toaster.create({
                        title: "Invalid Port",
                        description: "The port is invalid.",
                        type: "error",
                      });
                      return;
                    }
                    setLogConfigureFile(logObj);
                    setRenderLoggingForm(true);
                  }}
                  onCancel={() => {
                    setFileName("");
                    setLogConfigureFile({});
                    setLogMode("none");
                    setRenderLoggingForm(false);
                  }}
                  onErrorMessage={(msg) => toaster.create(msg)}
                />
              </Show>
            </Stack>
          }
        >
          <Stack width="100%" alignItems="center" height="100%">
            <Text variant="heading" size="2xl" width="44rem">
              Logging
            </Text>
            <Stack
              direction="row"
              marginTop="1.5rem"
              gap="1.5rem"
              width="44rem"
            >
              <Button
                variant="outline"
                padding="4rem"
                onClick={() => {
                  const newEmptyFile = JSON.parse(
                    JSON.stringify(logFormFileFormat()),
                  );
                  setFileName("New File");
                  setLogConfigureFile(newEmptyFile);
                  setLogMode("create");
                  setRenderLoggingForm(true);
                }}
              >
                Create New Log
              </Button>
              <Button
                variant="outline"
                padding="4rem"
                onClick={async () => {
                  const path = await openFileDialog();
                  if (!path) return;
                  const logObj = await readJsonFile(path);
                  if (!logObj) {
                    toaster.create({
                      title: "Invalid File Path",
                      description: "The file path is invalid.",
                      type: "error",
                    });
                    setRecentLogFilePaths((prev) => {
                      const newRecentFiles = prev.filter(
                        (prevFilePath) => prevFilePath !== filePath(),
                      );
                      return newRecentFiles;
                    });
                    return;
                  }
                  const isFileFormatMatch = compareFileFormat(
                    logObj,
                    logFormFileFormat(),
                  );
                  if (isFileFormatMatch) {
                    setLogMode("file");
                    setFileData(logObj, path);
                    setRecentLogFilePaths((prev) => {
                      const newRecentFiles = prev.filter(
                        (prevFilePath) => prevFilePath !== path,
                      );
                      return [path, ...newRecentFiles];
                    });
                  } else {
                    toaster.create({
                      title: "Invalid File",
                      description: "File format is invalid.",
                      type: "error",
                    });
                  }
                }}
              >
                Open File
              </Button>
              <Button
                variant="outline"
                padding="4rem"
                disabled={portId().length === 0}
                onClick={async () => {
                  const output = await GetLogConfigFromPort();
                  if (output.stderr.length !== 0) {
                    toaster.create({
                      title: "Communication Error",
                      description: output.stderr,
                      type: "error",
                    });
                    return;
                  } else {
                    setFileName(portId());
                    setLogConfigureFile(JSON.parse(output.stdout));
                    setLogMode("port");
                    setRenderLoggingForm(true);
                  }
                }}
              >
                Get From Port
              </Button>
            </Stack>
            <Show when={recentLogFilePaths().length !== 0}>
              <Text width="44rem" size="xl" marginTop="2rem" fontWeight="bold">
                Recent
              </Text>
              <Stack width="44rem" direction="row" marginTop="0.5rem">
                <Text width="16rem" size="sm" fontWeight="light" opacity="50%">
                  File
                </Text>
                <Text size="sm" fontWeight="light" opacity="50%">
                  Path
                </Text>
              </Stack>
              <Stack
                style={{ "overflow-y": "auto" }}
                height="100%"
                width="44rem"
                gap="0"
                marginLeft="-0.5rem"
                borderTopWidth="1"
                borderBottomWidth="1"
              >
                <For each={recentLogFilePaths()}>
                  {(path, index) => (
                    <Button
                      width="100%"
                      variant="ghost"
                      padding="0.5rem"
                      paddingTop="1rem"
                      paddingBottom="1rem"
                      onMouseEnter={() => {
                        setIsButtonHoverd([true, index()]);
                      }}
                      onMouseLeave={() => {
                        setIsButtonHoverd([false, null]);
                      }}
                      bgColor={isButtonHovered()[0] === true &&
                          isButtonHovered()[1] === index()
                        ? "bg.muted"
                        : "bg.canvas"}
                      gap="0"
                    >
                      <Text
                        userSelect="none"
                        onClick={async () => {
                          const object = await readJsonFile(path);
                          if (!object) {
                            toaster.create({
                              title: "Invalid File Path",
                              description: "The file path is invalid.",
                              type: "error",
                            });
                            setRecentLogFilePaths((prev) => {
                              const newRecentFiles = prev.filter(
                                (prevFilePath) => prevFilePath !== path,
                              );
                              return newRecentFiles;
                            });
                            return;
                          }
                          setFileData(object!, path);
                          setIsButtonHoverd([false, null]);
                        }}
                        size="md"
                        height="2rem"
                        fontWeight="medium"
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          display: "block",
                          overflow: "hidden",
                          "text-align": "left",
                          "margin-top": "0.4rem",
                          width: "15rem",
                        }}
                      >
                        {path.match(/[^//]+$/)!.toString()}
                      </Text>
                      <Text
                        userSelect="none"
                        size="sm"
                        fontWeight="light"
                        marginLeft="0.5rem"
                        opacity="70%"
                        onClick={async () => {
                          const object = await readJsonFile(path);
                          if (!object) {
                            toaster.create({
                              title: "Invalid File Path",
                              description: "The file path is invalid.",
                              type: "error",
                            });
                            setRecentLogFilePaths((prev) => {
                              const newRecentFiles = prev.filter(
                                (prevFilePath) => prevFilePath !== path,
                              );
                              return newRecentFiles;
                            });
                            return;
                          }
                          setFileData(object!, path);
                          setIsButtonHoverd([false, null]);
                        }}
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          display: "block",
                          overflow: "hidden",
                          "text-align": "left",
                          width: `calc(100% - 17rem)`,
                          "padding-left": "1rem",
                        }}
                      >
                        {path.replace(path.match(/[^?!//]+$/)!.toString(), "")}
                      </Text>
                      <Stack width="2rem">
                        <Show
                          when={isButtonHovered()[0] === true &&
                            isButtonHovered()[1] === index()}
                        >
                          <IconButton
                            padding="0"
                            opacity="50%"
                            variant="ghost"
                            borderRadius="2rem"
                            size="sm"
                            width="1rem"
                            marginRight="1rem"
                            onClick={() => {
                              setRecentLogFilePaths((prev) => {
                                const updateFilePath = prev.filter((_, i) => {
                                  return i !== index();
                                });
                                return updateFilePath;
                              });
                            }}
                          >
                            <IconX width="1rem" />
                          </IconButton>
                        </Show>
                      </Stack>
                    </Button>
                  )}
                </For>
              </Stack>
            </Show>
          </Stack>
        </Show>
      </Stack>
    </>
  );
}

export default Logging;
