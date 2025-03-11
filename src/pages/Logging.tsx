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
import { IconButton } from "~/components/ui/icon-button";
import { Spinner } from "~/components/ui/spinner";

export function Logging() {
  const [isFileOpen, setIsFileOpen] = createSignal<boolean>(false);
  const [logConfigureFile, setLogConfigureFile] = createSignal({});
  const [fileName, setFileName] = createSignal<string>("");
  const [filePath, setFilePath] = createSignal<string>("");
  const [logMode, setLogMode] = createSignal<
    "create" | "port" | "file" | "none"
  >("none");
  const [render, setRender] = createSignal<boolean>(false);

  async function GetLogConfigFromPort(): Promise<object | undefined> {
    if (portId().length === 0) return undefined;
    const sideCommand = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.config.get`,
    ]);
    const output = await sideCommand.execute();
    const obj = JSON.parse(output.stdout);

    if (output.stdout.length === 0) return undefined;
    else return obj;
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function openFileDialog(): Promise<string | undefined> {
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

  async function readJsonFile(path: string): Promise<object | undefined> {
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

      return parseFileToObject;
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
      return undefined;
    }
  }

  const [isButtonHovered, setIsButtonHoverd] = createSignal<
    [boolean, number | null]
  >([
    false,
    null,
  ]);

  function setFileData(file: object, path: string) {
    setLogConfigureFile(file);
    setFileName(path.split("/").pop()!);
    setRecentLogFilePaths((prev) => {
      const newRecentFiles = prev.filter((prevFilePath) =>
        prevFilePath !== path
      );
      return [path, ...newRecentFiles];
    });
    setIsFileOpen(true);
  }

  return (
    <>
      <div
        style={{
          "padding-top": "4rem",
          "padding-bottom": "4rem",
          "height": "100%",
          "width": `calc(100% - 3rem)`,
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
            <Stack direction="row" justifyContent="center">
              <Show
                when={render()}
                fallback={<Spinner />}
              >
                <LoggingForm
                  jsonfile={logConfigureFile()}
                  fileName={fileName()}
                  mode={logMode()}
                  onModeChange={(mode) => {
                    setLogMode(mode);
                    setRender(false);
                  }}
                  onReadFile={async () => {
                    setRender(false);
                    const logObj = await readJsonFile(filePath());
                    if (!logObj) return;
                    await setLogConfigureFile(logObj);
                    setRender(true);
                  }}
                  onReadPort={async () => {
                    setRender(false);
                    const logConfigObj = await GetLogConfigFromPort();
                    if (!logConfigObj) return;
                    await setLogConfigureFile(logConfigObj);
                    setRender(true);
                  }}
                  onCancel={() => {
                    setFileName("");
                    setIsFileOpen(false);
                    setLogConfigureFile({});
                    setLogMode("none");
                    setRender(false);
                  }}
                  onErrorMessage={(msg) => toaster.create(msg)}
                  style={{ "margin-bottom": "3rem" }}
                />
              </Show>
            </Stack>
          }
        >
          <Stack
            width="100%"
            alignItems="center"
            height="100%"
          >
            <Text
              variant="heading"
              size="2xl"
              width="44rem"
            >
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
                  setIsFileOpen(true);
                  setRender(true);
                }}
              >
                Create New File
              </Button>
              <Button
                variant="outline"
                padding="4rem"
                onClick={async () => {
                  const path = await openFileDialog();
                  if (!path) return;
                  const logObj = await readJsonFile(path);
                  if (!logObj) return;
                  const fileName = path.replaceAll("\\", "/").split("/").pop();
                  setFileName(fileName!);
                  setLogConfigureFile(logObj);
                  setFilePath(path!);
                  setLogMode("file");
                  setRender(true);
                  setIsFileOpen(true);
                }}
              >
                Open File
              </Button>
              <Button
                variant="outline"
                padding="4rem"
                disabled={portId().length === 0}
                onClick={async () => {
                  const logConfigObj = await GetLogConfigFromPort();
                  if (!logConfigObj) return;
                  setFileName(portId());
                  setLogConfigureFile(logConfigObj);
                  setLogMode("port");
                  setIsFileOpen(true);
                  setRender(true);
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
                <Text
                  width="16rem"
                  size="sm"
                  fontWeight="light"
                  opacity="50%"
                >
                  File
                </Text>
                <Text
                  size="sm"
                  fontWeight="light"
                  opacity="50%"
                >
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
                          setFileData(object!, path);
                          setIsButtonHoverd([false, null]);
                        }}
                        size="md"
                        height="2rem"
                        fontWeight="medium"
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          "display": "block",
                          "overflow": "hidden",
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
                          setFileData(object!, path);
                          setIsButtonHoverd([false, null]);
                        }}
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          "display": "block",
                          "overflow": "hidden",
                          "text-align": "left",
                          width: `calc(100% - 17rem)`,
                          "padding-left": "1rem",
                        }}
                      >
                        {path.replace(
                          path.match(/[^?!//]+$/)!.toString(),
                          "",
                        )}
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
      </div>
    </>
  );
}

export default Logging;
