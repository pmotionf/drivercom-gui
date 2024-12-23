import { JSX } from "solid-js";
import { Toast } from "~/components/ui/toast";
import {
  type FileUploadFileAcceptDetails,
  FileUploadTrigger,
} from "@ark-ui/solid";
import { IconPlus, IconX } from "@tabler/icons-solidjs";
import { inferSchema, initParser } from "udsv";
import { FileUpload } from "~/components/ui/file-upload";
import { IconButton } from "~/components/ui/icon-button";

export type CreateTabButtonProps = JSX.HTMLAttributes<HTMLButtonElement> & {
  onCreateTabValue?: (tabId: string, file: string, fileName: string) => void;
};

export function CreateTabButton(props: CreateTabButtonProps) {
  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  function loadLog(details: FileUploadFileAcceptDetails) {
    if (details.files.length == 0) return;
    const file = details.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const csv_str: string = (reader.result! as string).trim();
      const rows = csv_str.split("\n");
      if (rows.length < 2) {
        toaster.create({
          title: "Invalid Log File",
          description: "Not enough rows.",
          type: "error",
        });
        return;
      }

      const schema = inferSchema(csv_str);
      const parser = initParser(schema);
      const local_header = rows[0].replace(/,\s*$/, "").split(",");
      const data = parser.typedCols(csv_str).map((row) =>
        row.map((val) => {
          if (typeof val === "boolean") return val ? 1 : 0;
          return val;
        })
      );
      if (data.length < local_header.length) {
        toaster.create({
          title: "Invalid Log File",
          description:
            `Data has ${data.length} columns, while header has ${local_header.length} labels.`,
          type: "error",
        });
        return;
      }

      if (typeof (reader.result!) === "string") {
        const newTabId: string = crypto.randomUUID();
        props.onCreateTabValue?.(newTabId, reader.result, file.name);
      }
    };

    reader.onerror = () => {
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
      <FileUpload.Root
        accept="text/csv"
        minFileSize={3}
        onFileAccept={loadLog}
        onFileReject={(details) => {
          if (details.files.length == 0) return;
          let description = "The provided log file is invalid:\n";
          for (let i = 0; i < details.files[0].errors.length; i++) {
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
        <FileUploadTrigger
          asChild={(triggerProps) => (
            <IconButton
              size={"xs"}
              variant={"ghost"}
              {...triggerProps()}
              width={"1rem"}
              borderRadius={"1rem"}
            >
              <IconPlus />
            </IconButton>
          )}
        />
        <FileUpload.HiddenInput />
      </FileUpload.Root>
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
