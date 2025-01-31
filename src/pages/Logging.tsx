import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { logFormFileFormat, portId } from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { createSignal, Show } from "solid-js";
import { FileUpload } from "@ark-ui/solid";
import { LoggingForm } from "./Logging/LoggingForm";
import { Toast } from "~/components/ui/toast";
import { IconX } from "@tabler/icons-solidjs";

export function Logging() {
  const [isFileOpen, setIsFileOpen] = createSignal<boolean>(false);
  const [logConfigureFile, setLogConfigureFile] = createSignal({});
  const [fileName, setFileName] = createSignal<string>("");

  async function GetFileFromPort() {
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

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  return (
    <>
      <div
        style={{
          "padding-top": "3rem",
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
          <Stack width="48%" marginLeft="26%">
            <Text variant={"heading"} size={"xl"}>
              Log configuration
            </Text>
            <Stack
              direction={"row"}
              marginTop={"1rem"}
              justifyContent={"center"}
            >
              <Button
                variant={"outline"}
                padding={"4rem"}
                onClick={() => {
                  setFileName("New file");
                  setLogConfigureFile(logFormFileFormat());
                  setIsFileOpen(true);
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
                disabled={portId().length === 0 ? true : false}
                onClick={() => {
                  GetFileFromPort();
                }}
              >
                Get file from port
              </Button>
            </Stack>
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
