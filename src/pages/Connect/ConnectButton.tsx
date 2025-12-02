import { IconButton } from "~/components/ui/icon-button.tsx";
import {
  IconChevronDown,
  IconChevronUp,
  IconPlugConnected,
  IconPlugConnectedX,
  IconX,
} from "@tabler/icons-solidjs";
import { Popover } from "~/components/ui/popover.tsx";
import { createSignal, JSX, Show } from "solid-js";
import { portId, portList, setPortId, setPortList } from "../../GlobalState.ts";
//@ts-ignore Implicitly has an 'any' type.
import { Stack } from "styled-system/jsx/stack.mjs";
import { Text } from "../../components/ui/text.tsx";
import { Command } from "@tauri-apps/plugin-shell";
import { Toast } from "~/components/ui/toast.tsx";
import { For } from "solid-js";
import { Tooltip } from "~/components/ui/tooltip.tsx";
import { Button } from "~/components/ui/button.tsx";
import { Portal } from "solid-js/web";
import { csvFileDownloads } from "../../GlobalState.ts";
import { DownloadStatus } from "~/components/DownloadList.tsx";

export type ConnectButtonProps = JSX.HTMLAttributes<HTMLButtonElement>;

export function ConnectButton(props: ConnectButtonProps) {
  const [isDectecting, setIsDetecting] = createSignal<boolean>(false);

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
    const ports = await Promise.all(
      portNames.map(async (id) => {
        const version = await detectFirmwareVersion(id);
        if (version !== null) {
          return {
            id: id,
            version: version,
          };
        } else {
          return {
            id: id,
            version: "",
          };
        }
      }),
    );
    setPortList(ports);

    if (portNames.length == 0) {
      toaster.create({
        title: "No Ports Found",
        description: "No driver serial ports were detected.",
        type: "error",
      });
      return;
    }
    setPortId("");
  }

  async function detectFirmwareVersion(portId: string): Promise<string | null> {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "--port",
      portId,
      "firmware",
    ]);
    const output = await drivercom.execute();
    const splits = output.stdout.split(":");
    if (splits.length < 2) return null;

    const version_string = splits[1].trimStart().trimEnd();
    return version_string;
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  const [isOpen, setIsOpen] = createSignal<boolean>(false);

  return (
    <Popover.Root
      positioning={{ placement: "bottom-start" }}
      onOpenChange={(e: { open: boolean }) => setIsOpen(e.open)}
    >
      <Popover.Trigger maxWidth="min-content" gap="" padding="0" {...props}>
        <Button
          variant="outline"
          borderColor="bg.disabled"
          backgroundColor="bg.default"
          style={{
            "padding-right": "0.5em",
            "padding-left": "0em",
            "padding-top": "0",
            "padding-bottom": "0",
            "border-width": "1px",
            width: "4em",
            height: "2em",
          }}
        >
          <Tooltip.Root>
            <Tooltip.Trigger
              width="2em"
              paddingLeft="0.5em"
              borderRightWidth="1px"
              color={portId().length === 0 ? "fg.subtle" : "fg.default"}
            >
              <div
                style={{
                  width: "2em",
                }}
              >
                {portId().length === 0 ? (
                  <IconPlugConnectedX />
                ) : (
                  <IconPlugConnected />
                )}
              </div>
            </Tooltip.Trigger>
            <Show when={portId().length !== 0}>
              <Portal>
                <Tooltip.Positioner>
                  <Tooltip.Content
                    backgroundColor="bg.default"
                    color="fg.default"
                    textAlign="left"
                  >
                    {portId()}
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Portal>
            </Show>
          </Tooltip.Root>
          {isOpen() ? <IconChevronUp /> : <IconChevronDown />}
        </Button>
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content
          padding="0.5em"
          width="100%"
          maxHeight="11em"
          minWidth="16em"
          maxWidth="20em"
        >
          <Stack height="2em" direction="row" width="100%" gap="0">
            <Text
              fontWeight="bold"
              width={`calc(100% - 3em)`}
              paddingTop="0.3em"
              opacity={portList().length === 0 ? "30%" : "100%"}
              size="md"
              textAlign="left"
              textOverflow="ellipsis"
              overflow="hidden"
              whiteSpace=""
              paddingRight="1em"
            >
              Ports
            </Text>

            <Button
              size="sm"
              width="3em"
              height="2em"
              variant="outline"
              fontWeight="medium"
              loading={isDectecting()}
              onClick={async () => {
                setIsDetecting(true);
                await detectPort();
                setPortId("");
                setIsDetecting(false);
              }}
              disabled={
                csvFileDownloads.findIndex(
                  (file) => file.status === DownloadStatus.Progressing,
                ) !== -1
              }
            >
              Scan
            </Button>
          </Stack>
          <Show when={portList().length > 0}>
            <div
              style={{
                height: `calc(100% - 2.5em)`,
                "overflow-y": "auto",
                "border-bottom-width": "1px",
                "border-top-width": "1px",
                "margin-top": "0.5em",
              }}
            >
              <For each={portList()}>
                {(port) => (
                  <Button
                    style={{
                      width: "100%",
                      "flex-direction": "row",
                      "font-weight": "normal",
                      gap: "0",
                      padding: "0",
                      "align-items": "left",
                    }}
                    variant="ghost"
                    onClick={() => {
                      setPortId(port.id);
                    }}
                  >
                    <Tooltip.Root>
                      <Tooltip.Trigger width={`calc(75% - 3em)`}>
                        <Text
                          style={{
                            width: "100%",
                            "text-align": "left",
                            "text-overflow": "ellipsis",
                            overflow: "hidden",
                            "white-space": "nowrap",
                            "padding-left": "0.5em",
                          }}
                          size="sm"
                        >
                          {port.id}
                        </Text>
                      </Tooltip.Trigger>
                      <Portal>
                        <Tooltip.Positioner>
                          <Tooltip.Content>{port.id}</Tooltip.Content>
                        </Tooltip.Positioner>
                      </Portal>
                    </Tooltip.Root>
                    <Tooltip.Root>
                      <Tooltip.Trigger width={`25% `}>
                        <Text
                          style={{
                            width: "100%",
                            "text-align": "left",
                            "text-overflow": "ellipsis",
                            overflow: "hidden",
                            "white-space": "nowrap",
                            "padding-left": "0.5em",
                            opacity: "0.5",
                          }}
                          size="sm"
                        >
                          {port.version}
                        </Text>
                      </Tooltip.Trigger>
                      <Portal>
                        <Tooltip.Positioner>
                          <Tooltip.Content>{port.version}</Tooltip.Content>
                        </Tooltip.Positioner>
                      </Portal>
                    </Tooltip.Root>
                    <Show
                      when={port.id === portId()}
                      fallback={<div style={{ width: "3em" }} />}
                    >
                      <IconButton
                        size="sm"
                        width="3em"
                        borderRadius="3em"
                        onClick={() => {
                          setTimeout(() => {
                            setPortId("");
                          }, 200);
                        }}
                        variant="ghost"
                        margin="0"
                        padding="0"
                      >
                        <IconX />
                      </IconButton>
                    </Show>
                  </Button>
                )}
              </For>
            </div>
          </Show>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
