import { createSignal, JSX } from "solid-js";
import { Menu } from "./ui/menu.tsx";
import { Button } from "./ui/styled/button.tsx";
import { csvFileDownloads, portId, setPortId } from "~/GlobalState.ts";
import { DownloadStatus } from "./DownloadList.tsx";
import { Command } from "@tauri-apps/plugin-shell";

export type PortMenuProps = JSX.HTMLAttributes<HTMLDivElement> & {
  disabled: boolean;
  onGetFromPort?: () => void;
  onSaveToPort?: () => void;
};

export function PortMenu(props: PortMenuProps) {
  const [openMenu, setOpenMenu] = createSignal<boolean>(false);

  async function detectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", ["port.detect"]);
    const output = await drivercom.execute();

    const portNames = output.stdout
      .split("\n")
      .map((portName) => {
        const matched = portName.match(/\(([^)]+)\)/);
        return matched;
      })
      .filter((e) => e !== null)
      .map((e) => e[1]);
    if (portNames.includes(portId())) {
      return true;
    } else {
      setPortId("");
      return false;
    }
  }

  return (
    <Menu.Root
      positioning={{ placement: "bottom-start" }}
      open={openMenu()}
      onOpenChange={(details) => {
        if (
          csvFileDownloads.some(
            (file) => file.status === DownloadStatus.Progressing,
          )
        )
          return;
        setOpenMenu(details.open);
      }}
    >
      <Menu.Trigger
        disabled={props.disabled}
        opacity={
          csvFileDownloads.some(
            (file) => file.status === DownloadStatus.Progressing,
          )
            ? "0.5"
            : "1"
        }
      >
        {props.children ? (
          props.children
        ) : (
          <Button
            disabled={
              props.disabled
                ? true
                : csvFileDownloads.some(
                    (file) => file.status === DownloadStatus.Progressing,
                  )
            }
            variant="ghost"
          >
            Port
          </Button>
        )}
      </Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content width="8rem">
          <Menu.Item
            value="Get from port"
            disabled={csvFileDownloads.some(
              (file) => file.status === DownloadStatus.Progressing,
            )}
            userSelect="none"
            onClick={async () => {
              if (
                csvFileDownloads.some(
                  (file) => file.status === DownloadStatus.Progressing,
                )
              )
                return;

              const hasPort = await detectPort();

              if (hasPort) {
                props.onGetFromPort?.();
              }
            }}
          >
            Get from port
          </Menu.Item>
          <Menu.Separator />
          <Menu.Item
            value="Save to port"
            disabled={csvFileDownloads.some(
              (file) => file.status === DownloadStatus.Progressing,
            )}
            userSelect="none"
            onClick={async () => {
              if (
                csvFileDownloads.some(
                  (file) => file.status === DownloadStatus.Progressing,
                )
              )
                return;
              const hasPort = await detectPort();

              if (hasPort) {
                props.onSaveToPort?.();
              }
            }}
          >
            Save to port
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}
