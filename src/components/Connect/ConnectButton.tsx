import { IconButton } from "~/components/ui/icon-button.tsx";
import {
  IconPlugConnected,
  IconPlugConnectedX,
  IconX,
} from "@tabler/icons-solidjs";
import * as Popover from "~/components/ui/popover.tsx";
import { createSignal, Show } from "solid-js";
import { portList, setPortList } from "../../store/GlobalState.ts";
//@ts-ignore Implicitly has an 'any' type.
import { Stack } from "styled-system/jsx/stack.mjs";
import { Text } from "../../components/ui/text.tsx";
import { Command } from "@tauri-apps/plugin-shell";
import { For } from "solid-js";
import { Tooltip } from "~/components/ui/tooltip.tsx";
import { Button } from "~/components/ui/button.tsx";
import { csvFileDownloads } from "../../store/GlobalState.ts";
import { DownloadStatus } from "~/components/DownloadList.tsx";
import { toaster } from "~/services/Toaster.ts";
import type { ComponentProps } from "solid-js";

export type ConnectButtonProps = {
  portId: string;
  onPortIdChange?: (portId: string) => void;
  buttonProps?: ComponentProps<typeof IconButton>;
};

export function ConnectButton(props: ConnectButtonProps) {
  const [isDetecting, setIsDetecting] = createSignal<boolean>(false);

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
    props.onPortIdChange?.("");
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

  return (
    <Popover.Root positioning={{ placement: "bottom-start" }}>
      <Popover.Trigger maxWidth="min-content" gap="" padding="0" {...props}>
        <Tooltip content={

          <Show when={props.portId.length !== 0}>

                  {props.portId}

          </Show>
        }>

            <IconButton
              {...(props.buttonProps
                ? props.buttonProps
                : {
                    variant: "outline",
                    borderColor: "bg.diabled",
                    cursor: "-moz-grab",
                    opacity: props.portId.length === 0 ? "0.7" : "1",
                    backgroundColor: "bg.default",
                  })}
            >
              {props.portId.length === 0 ? (
                <IconPlugConnectedX />
              ) : (
                <IconPlugConnected />
              )}
            </IconButton>

        </Tooltip>
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
              textStyle="md"
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
              loading={isDetecting()}
              onClick={async () => {
                setIsDetecting(true);
                await detectPort();
                props.onPortIdChange?.("");
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
                    variant="plain"
                    onClick={() => {
                      props.onPortIdChange?.(port.id);
                    }}
                  >
                    <Tooltip content = {port.id}>
                        <Text
                          style={{
                            width: "100%",
                            "text-align": "left",
                            "text-overflow": "ellipsis",
                            overflow: "hidden",
                            "white-space": "nowrap",
                            "padding-left": "0.5em",
                          }}
                          textStyle="sm"
                        >
                          {port.id}
                        </Text>

                    </Tooltip>
                    <Tooltip content = {port.version}>
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
                          textStyle="sm"
                        >
                          {port.version}
                        </Text>
                    </Tooltip>
                    <Show
                      when={port.id === props.portId}
                      fallback={<div style={{ width: "3em" }} />}
                    >
                      <IconButton
                        size="sm"
                        width="3em"
                        borderRadius="3em"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.onPortIdChange?.("");
                        }}
                        variant="plain"
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
