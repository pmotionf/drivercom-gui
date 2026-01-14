import { createSignal } from "solid-js";
import { Menu } from "./ui/menu.tsx";
import { Button } from "./ui/styled/button.tsx";
import { csvFileDownloads } from "~/GlobalState.ts";
import { DownloadStatus } from "./DownloadList.tsx";
import { ButtonProps } from "./ui/button.tsx";

export type PortMenuProps = ButtonProps & {
  portId: string;
  onGetFromPort?: () => void;
  onSaveToPort?: () => void;
};

export function PortMenu(props: PortMenuProps) {
  const [openMenu, setOpenMenu] = createSignal<boolean>(false);
  const { onGetFromPort, onSaveToPort, ...buttonProps } = props;

  return (
    <Menu.Root
      positioning={{ placement: "bottom-start" }}
      open={openMenu()}
      onOpenChange={(details) => {
        if (props.portId.length < 1) return;
        setOpenMenu(details.open);
      }}
    >
      <Menu.Trigger
        disabled={
          props.portId.length < 1 ||
          csvFileDownloads.some(
            (file) =>
              file.status === DownloadStatus.Progressing &&
              file.port === props.portId,
          )
        }
      >
        <Button
          {...buttonProps}
          disabled={
            props.portId.length < 1 ||
            csvFileDownloads.some(
              (file) =>
                file.status === DownloadStatus.Progressing &&
                file.port === props.portId,
            )
          }
        >
          Port
        </Button>
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content width="8rem">
          <Menu.Item
            value="Get from port"
            disabled={
              props.portId.length < 1 ||
              csvFileDownloads.some(
                (file) =>
                  file.status === DownloadStatus.Progressing &&
                  file.port === props.portId,
              )
            }
            userSelect="none"
            onClick={async () => {
              if (
                props.portId.length < 1 ||
                csvFileDownloads.some(
                  (file) =>
                    file.status === DownloadStatus.Progressing &&
                    file.port === props.portId,
                )
              )
                return;

              onGetFromPort?.();
            }}
          >
            Get from port
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            value="Save to port"
            disabled={
              props.portId.length < 1 ||
              csvFileDownloads.some(
                (file) =>
                  file.status === DownloadStatus.Progressing &&
                  file.port === props.portId,
              )
            }
            userSelect="none"
            onClick={async () => {
              if (
                props.portId.length < 1 ||
                csvFileDownloads.some(
                  (file) =>
                    file.status === DownloadStatus.Progressing &&
                    file.port === props.portId,
                )
              )
                return;

              onSaveToPort?.();
            }}
          >
            Save to port
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}
