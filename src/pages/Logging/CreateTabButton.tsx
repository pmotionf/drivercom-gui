import { JSX } from "solid-js";
import {
  type FileUploadFileChangeDetails,
  FileUploadTrigger,
} from "@ark-ui/solid";
import { IconPlus } from "@tabler/icons-solidjs";
import { FileUpload } from "~/components/ui/file-upload";
import { IconButton } from "~/components/ui/icon-button";

export type CreateTabButtonProps = JSX.HTMLAttributes<HTMLButtonElement> & {
  onCreateTabValue?: (
    tabId: string,
    file: FileUploadFileChangeDetails,
  ) => void;
};

export function CreateTabButton(props: CreateTabButtonProps) {
  return (
    <>
      <FileUpload.Root
        accept="text/csv"
        minFileSize={3}
        onFileChange={(details) => {
          props.onCreateTabValue?.(crypto.randomUUID(), details);
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
    </>
  );
}
