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
import { FileUpload } from "@ark-ui/solid";
import { LoggingForm } from "./Logging/LoggingForm";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";

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
    setFileName("New File");
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
          <Stack width="45rem" marginLeft={`calc((100% - 45rem) / 2)`}>
            <Text variant={"heading"} size={"2xl"}>
              Log Configuration
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
              <FileUpload.Root
                accept="application/json"
                minFileSize={3}
                onFileChange={(details) => {
                  if (details.rejectedFiles.length !== 0) {
                    toaster.create({
                      title: "Invalid Log File",
                      description: "File format is invalid.",
                      type: "error",
                    });

                    return;
                  }
                  const file = details.acceptedFiles[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      const data = JSON.parse(e.target?.result as string); // JSON 파싱
                      // Need to check more keys for checking the format is same
                      const fileLog = Object.keys(data).sort();
                      const emptyLog = Object.keys(logFormFileFormat()).sort();
                      if (
                        JSON.stringify(fileLog) !== JSON.stringify(emptyLog)
                      ) {
                        toaster.create({
                          title: "Invalid Log File",
                          description: "File is missing required information.",
                          type: "error",
                        });
                        return;
                      }

                      setLogConfigureFile({ ...data });
                      setIsFileOpen(true);
                      setRecentFilesPath((prev) => {
                        const parseFilePath = prev.filter((prevFile) =>
                          prevFile.name !== file.name &&
                          prevFile.lastModified !== file.lastModified
                        );
                        const updateFilePath = [file, ...parseFilePath];
                        return updateFilePath.length === 8
                          ? updateFilePath.slice(0, 7)
                          : updateFilePath;
                      });
                    };
                    reader.readAsText(file);

                    setFileName(details.acceptedFiles[0].name);
                  }
                }}
              >
                <FileUpload.Trigger
                  asChild={(triggerProps) => (
                    <Button
                      {...triggerProps()}
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
                    >
                      File Upload
                    </Button>
                  )}
                />
                <FileUpload.HiddenInput />
              </FileUpload.Root>
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
                Get Config From
              </Button>
            </Stack>
            <Show when={recentFilesPath().length !== 0}>
              <Text variant={"heading"} size={"xl"} marginTop={"2rem"}>
                Recent files
              </Text>
              <Stack marginTop={"0.5rem"}>
                <For each={recentFilesPath()}>
                  {(file) => (
                    <Text
                      onClick={() => {
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            const data = JSON.parse(e.target?.result as string); // JSON 파싱
                            setLogConfigureFile({ ...data });
                            setIsFileOpen(true);
                          };
                          reader.readAsText(file);
                          setFileName(file.name);
                          setRecentFilesPath((prev) => {
                            const parseFilePath = prev.filter((prevFile) =>
                              prevFile.name !== file.name &&
                              prevFile.lastModified !== file.lastModified
                            );
                            const updateFilePath = [file, ...parseFilePath];
                            return updateFilePath.length === 8
                              ? updateFilePath.slice(0, 7)
                              : updateFilePath;
                          });
                        }
                      }}
                      style={{ "text-decoration": "underline" }}
                      fontWeight="light"
                      cursor={"pointer"}
                    >
                      {file.name}
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
