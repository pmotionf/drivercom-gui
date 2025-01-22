import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { portId } from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { createSignal, Show } from "solid-js";
import { FileUpload } from "@ark-ui/solid";
import { LoggingForm } from "./Logging/LoggingForm";

export function Logging() {
  const [isFileOpen, setIsFileOpen] = createSignal<boolean>(false);
  const [logConfigureFile, setLogConfigureFile] = createSignal({});

  async function GetFileFromPort() {
    if (portId().length === 0) return;
    const sideCommand = Command.sidecar("binaries/drivercom", [
      `--port`,
      `\\\\.\\${portId()}`,
      `log.configure.get`,
    ]);
    const output = await sideCommand.execute();
    const obj = JSON.parse(output.stdout);
    console.log(obj);

    if (output.stdout.length === 0) return;
    setLogConfigureFile(obj);
    setIsFileOpen(true);
  }

  return (
    <>
      <div style={{ "margin-left": "calc(100% / 3)", "padding-top": "3rem" }}>
        <Show when={!isFileOpen()}>
          <Text variant={"heading"}>
            Open Log
          </Text>
          <Stack direction={"row"} marginTop={"1rem"}>
            <FileUpload.Root
              accept="application/json"
              minFileSize={3}
              onFileChange={(details) => {
                if (details.rejectedFiles.length !== 0) return;
                const file = details.acceptedFiles[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const data = JSON.parse(e.target?.result as string); // JSON 파싱
                    setLogConfigureFile({ ...data });
                    setIsFileOpen(true);
                  };
                  reader.readAsText(file);
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
        </Show>
        <Show when={isFileOpen()}>
          <LoggingForm jsonfile={logConfigureFile()} />
        </Show>
      </div>
    </>
  );
}

export default Logging;
