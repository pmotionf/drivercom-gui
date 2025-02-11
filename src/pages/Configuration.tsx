import { createSignal, For, Show } from "solid-js";

import { ConfigForm } from "~/components/ConfigForm";
import {
  IconX,
} from "@tabler/icons-solidjs";
import { open } from "@tauri-apps/plugin-dialog";
import { Toast } from "~/components/ui/toast";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Stack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import {
  configFormFileFormat,
  portId,
  recentConfigFilePaths,
  setRecentConfigFilePaths,
} from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { IconButton } from "~/components/ui/icon-button";
import { Button } from "~/components/ui/button";

function Configuration() {
  const [configureFile, setConfigureFile] = createSignal({});
  const [fileName, setFileName] = createSignal("");
  const [isFileOpen, setIsFileOpen] = createSignal(false);
  const [filePath, setFilePath] = createSignal<string | undefined>(undefined);

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  async function getConfigFromPort() {
    const configGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.get`,
    ]);
    const output = await configGet.execute();
    const parseConfigToObject = JSON.parse(output.stdout);
    setFileName(portId());
    setConfigureFile(parseConfigToObject);
    setIsFileOpen(true);
  }

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

  function compareFileFormat(newFile: object, fileFormat: object): boolean {
    const newFileObject = Object.entries(newFile).sort();
    const configFileObject = Object.entries(fileFormat).sort();

    const newFileFormat = newFileObject.map((line) => {
      const key = line[0];
      const value = line[1];
      if (typeof value === "object") {
        const checkValue = Object.entries(value).map((valueLine) => {
          const valueKey = valueLine[0];
          const typeOfValue = typeof valueLine[1];
          return [valueKey, typeOfValue];
        });
        return checkValue;
      }
      return [key, typeof value];
    }).toString();

    const configFileFormat = configFileObject.map((line) => {
      const key = line[0];
      const value = line[1];
      if (typeof value === "object") {
        const checkValue = Object.entries(value).map((valueLine) => {
          const valueKey = valueLine[0];
          const typeOfValue = typeof valueLine[1];
          return [valueKey, typeOfValue];
        });
        return checkValue;
      }
      return [key, typeof value];
    }).toString();

    return newFileFormat === configFileFormat;
  }

  async function readJsonFile(path: string) {
    try {
      const output = await readTextFile(path);
      const parseFileToObject = JSON.parse(output);

      const checkFileFormat = compareFileFormat(
        parseFileToObject,
        configFormFileFormat(),
      );
      if (!checkFileFormat) {
        toaster.create({
          title: "Invalid File",
          description: "The file is invalid.",
          type: "error",
        });
        return;
      }

      const fileName = path.replaceAll("\\", "/").split("/").pop();
      setFileName(fileName!);
      setFilePath(path);
      setConfigureFile(parseFileToObject);
      setIsFileOpen(true);
      setRecentConfigFilePaths((prev) => {
        const newRecentFiles = prev.filter((prevFilePath) =>
          prevFilePath !== path
        );
        return [path, ...newRecentFiles];
      });
    } catch {
      toaster.create({
        title: "Invalid File Path",
        description: "The file path is invalid.",
        type: "error",
      });
      setRecentConfigFilePaths((prev) => {
        const newRecentFiles = prev.filter((prevFilePath) =>
          prevFilePath !== path
        );
        return [...newRecentFiles];
      });
      setFilePath(undefined);
    }
  }

  const [isHovered, setIsHoverd] = createSignal<[boolean, number | null]> ([false, null])

  return (
    <>
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
      <div
        style={{
          "padding-top": "4rem",
          "padding-bottom": "4rem",
          "height": "100%",
          "width" : "100%"
        }}
      >
        <Show
          when={!isFileOpen()}
          fallback={
            <Stack direction="row" justifyContent={"center"}>
              <ConfigForm
                label={fileName()}
                config={configureFile()}
                onErrorMessage={(msg) => toaster.create(msg)}
                onCancel={() => setIsFileOpen(false)}
                path={filePath()}
              />
            </Stack>
          }
        >
          <Stack
            width="44rem"
            marginLeft={`calc((100% - 44rem) / 2)`}
            height={"100%"}
          >
            <Text variant={"heading"} size={"2xl"}>
              Configuration
            </Text>
            <Stack
              direction={"row"}
              marginTop={"1.5rem"}
              gap={"1.5rem"}
            >
              <Button
                variant={"outline"}
                padding={"4rem"}
                onClick={() => {
                  const newEmptyFile = JSON.parse(
                    JSON.stringify(configFormFileFormat()),
                  );
                  setFileName("New File");
                  setConfigureFile(newEmptyFile);
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
                  getConfigFromPort();
                }}
              >
                Get From Port
              </Button>
            </Stack>
            <Show when={recentConfigFilePaths().length !== 0}>
              <Text size={"xl"} marginTop={"2rem"} fontWeight={"bold"}>
                Recent
              </Text>
              <Stack direction={"row"} width="100%" marginTop={"0.5rem"}>
                  <Text
                    width={"16rem"}
                    size={"sm"}
                    fontWeight={"light"}
                    opacity={"50%"}>
                    File
                  </Text>
                  <Text
                  size={"sm"}
                  fontWeight={"light"}
                    opacity={"50%"}>
                    Path
                  </Text>
                </Stack>
              <Stack
                style={{ "overflow-y": "auto"}}
                height={"100%"}
                width={"45rem"}
                gap={"0"}
                marginLeft={"-0.5rem"}
                borderTopWidth={"1"}
                borderBottomWidth={"1"}
              >
                <For each={recentConfigFilePaths()}>
                  {(path, index) => (
                      <Button
                      width={"100%"}
                      variant={"ghost"}
                      padding= {"0.5rem"}
                      paddingTop = {"1rem"}
                      paddingBottom={"1rem"}
                      marginTop={index() === 0? "1rem" : "0"}
                      marginBottom={index() === recentConfigFilePaths().length-1? "1rem" : "0"}
                      onMouseEnter={() => {
                        setIsHoverd([true, index()])
                      }}
                      onMouseLeave={() => {
                        setIsHoverd([false, null])
                      }}
                      >
                      <Text
                        userSelect="none"
                        onClick={() => {
                          readJsonFile(path);
                          setFilePath(path);
                        }}
                        size={"md"}
                        height={"2rem"}
                        fontWeight={"medium"}
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          "display": "block",
                          "overflow": "hidden",
                          "text-align": "left",
                          "margin-top" : "0.4rem",
                          width : "16rem",
                        }}
                      >
                        {path.match(/[^\\\\]+$/)!.toString()}
                      </Text>
                      <Text
                        userSelect="none"
                        size={"sm"}
                        fontWeight={"light"}
                        marginLeft={"0.5rem"}
                        opacity={"70%"}
                        onClick={() => {
                          readJsonFile(path);
                          setFilePath(path);
                        }}
                        style={{
                          "white-space": "nowrap",
                          "text-overflow": "ellipsis",
                          "display": "block",
                          "overflow": "hidden",
                          "text-align": "left",
                          width : `15rem`
                        }}
                      >
                        {path.replace(
                          path.match(/[^?!\\\\]+$/)!.toString(),
                          "",
                        )}
                      </Text>
                        <Stack width={"calc(100% - 16rem - 15rem)"} direction={"row-reverse"}>
                        <Show when = {isHovered()[0] === true && isHovered()[1] === index()}>
                        <IconButton
                          padding={"0"}
                          opacity={"50%"} 
                          variant={"ghost"}
                          borderRadius={"2rem"}
                          size={"sm"}
                          width={"1rem"}
                          onClick={() => {
                            setRecentConfigFilePaths((prev) => {
                              const updateFilePath = prev.filter((_, i) => {
                                return i !== index();
                              });
                              return updateFilePath;
                            });
                          }}
                        >
                          <IconX 
                          
                          width={"1rem"}
                          onClick={() => {
                            setRecentConfigFilePaths((prev) => {
                              const updateFilePath = prev.filter((_, i) => {
                                return i !== index();
                              });
                              return updateFilePath;
                            });
                          }}
                          />
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

export default Configuration;
