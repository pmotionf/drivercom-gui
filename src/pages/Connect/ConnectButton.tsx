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
import { Button } from "~/components/ui/styled/button.tsx";
import { Portal } from "solid-js/web";

export type ConnectButtonProps = JSX.HTMLAttributes<HTMLButtonElement>;

export function ConnectButton(props: ConnectButtonProps) {
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
      <Popover.Trigger maxWidth="min-content" gap="0" padding="0" {...props}>
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
          minWidth={"16em"}
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
              whiteSpace="nowrap"
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
              onClick={async () => {
                await detectPort();
                setPortId("");
              }}
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
                  <Tooltip.Root>
                    <Tooltip.Trigger width="100%">
                      <Button
                        direction="row"
                        width="100%"
                        variant="ghost"
                        fontWeight="medium"
                        gap="0"
                        padding="0"
                        alignItems="left"
                        onClick={() => {
                          setPortId(port.id);
                        }}
                        paddingLeft="0.2em"
                      >
                        <Text
                          width="11em"
                          textAlign="left"
                          textOverflow="ellipsis"
                          overflow="hidden"
                          whiteSpace="nowrap"
                          size="sm"
                          paddingRight="0.5em"
                        >
                          {port.id}
                        </Text>

                        <Text
                          width="2.5em"
                          textAlign="left"
                          opacity="60%"
                          textOverflow="ellipsis"
                          overflow="hidden"
                          whiteSpace="nowrap"
                          size="sm"
                          onClick={() => {
                            setPortId(port.id);
                          }}
                        >
                          {port.version}
                        </Text>
                        <Show
                          when={port.id === portId()}
                          fallback={<div style={{ width: "2.5em" }} />}
                        >
                          <IconButton
                            size="sm"
                            width="2em"
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
                    </Tooltip.Trigger>
                    <Tooltip.Positioner>
                      <Tooltip.Content
                        backgroundColor="bg.default"
                        color="fg.default"
                      >
                        {port.id}
                      </Tooltip.Content>
                    </Tooltip.Positioner>
                  </Tooltip.Root>
                )}
              </For>
            </div>
          </Show>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
