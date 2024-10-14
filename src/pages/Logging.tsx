import { Show, createSignal } from "solid-js";

import { IconX, IconChevronsDown, IconChevronsUp } from "@tabler/icons-solidjs";

import { Button } from "~/components/ui/button";
import { Collapsible } from "~/components/ui/collapsible";
import type { FileUploadFileAcceptDetails } from "@ark-ui/solid";
import { FileUpload } from "~/components/ui/file-upload";
import { Spinner } from "~/components/ui/spinner";
import { Text } from "~/components/ui/text";
import { Toast } from "~/components/ui/toast";

function Logging() {
  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const [fileSelectOpen, setFileSelectOpen] = createSignal(true);

  const [logStatus, setLogStatus] = createSignal("");
  const [logName, setLogName] = createSignal("");
  const [header, setHeader] = createSignal([] as string[]);
  const [data, setData] = createSignal([] as string[][]);

  function loadLog(details: FileUploadFileAcceptDetails) {
    if (details.files.length == 0) return;
    const file = details.files[0];
    setLogName(file.name);
    setLogStatus("loading");

    var reader = new FileReader();

    reader.onload = () => {
      setLogStatus("");
      const csv_str: string = reader.result! as string;
      const rows = csv_str.trim().split("\n");
      if (rows.length < 2) {
        setLogStatus("failed");
        toaster.create({
          title: "Invalid Log File",
          description: "Not enough rows.",
          type: "error",
        });
        return;
      }

      setHeader(rows[0].replace(/,\s*$/, "").split(","));
      setData(
        rows
          .slice(1)
          .map((row: string) =>
            row
              .replace(/,\s*$/, "")
              .replaceAll("true", "1")
              .replaceAll("false", "0")
              .split(","),
          ),
      );

      console.log(header());
      console.log(data());
    };

    reader.onerror = () => {
      setLogStatus("failed");
      toaster.create({
        title: "Log File Loading Failed",
        description: `${reader.error!.name}: ${reader.error!.message}`,
        type: "error",
      });
    };

    reader.readAsText(file);
  }

  return (
    <>
      <Collapsible.Root
        defaultOpen
        onOpenChange={() => setFileSelectOpen(true)}
        onExitComplete={() => setFileSelectOpen(false)}
      >
        <Collapsible.Trigger>
          <Button
            variant="ghost"
            style={{
              position: "fixed",
              "padding-right": "0.8em",
              "padding-left": "0.5em",
              "text-align": "right",
              top: "0px",
              right: "0px",
            }}
          >
            <Show when={logStatus() === "loading"}>
              <Spinner size="sm" />
            </Show>
            <Show when={logStatus() === "failed"}>
              <IconX color="red" />
            </Show>
            <Show when={logName() !== ""}>
              <Text>{logName()}</Text>
            </Show>
            <Show when={fileSelectOpen()} fallback={<IconChevronsDown />}>
              <IconChevronsUp />
            </Show>
          </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <FileUpload.Root
            accept="text/csv"
            minFileSize={3}
            onFileAccept={loadLog}
            onFileReject={(details) => {
              if (details.files.length == 0) return;
              var description = "The provided log file is invalid:\n";
              for (var i = 0; i < details.files[0].errors.length; i++) {
                if (description.slice(-1) !== "\n") {
                  description += ", ";
                }
                description += details.files[0].errors[i];
              }
              toaster.create({
                title: "Invalid Log File",
                description: description,
                type: "error",
              });
            }}
          >
            <FileUpload.Dropzone>
              <FileUpload.Label>Drop Log File (CSV)</FileUpload.Label>
              <FileUpload.Trigger
                asChild={(triggerProps) => (
                  <Button size="sm" {...triggerProps()} variant="outline">
                    <Show when={logName() === ""} fallback="Change">
                      Select
                    </Show>
                  </Button>
                )}
              />
            </FileUpload.Dropzone>
            <FileUpload.HiddenInput />
          </FileUpload.Root>
        </Collapsible.Content>
      </Collapsible.Root>
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
    </>
  );
}

export default Logging;
