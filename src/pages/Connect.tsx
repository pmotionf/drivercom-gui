import { Button } from "~/components/ui/button.tsx";
import { IconPlug, IconPlugOff, IconX } from "@tabler/icons-solidjs";
import { Text } from "~/components/ui/text.tsx";
//@ts-ignore test
import { Stack } from "styled-system/jsx/index.mjs";
import { Card } from "~/components/ui/card.tsx";

import { Command } from "@tauri-apps/plugin-shell";
import { For, Show } from "solid-js";
import { Accordion } from "~/components/ui/accordion.tsx";
import { Toast } from "~/components/ui/toast.tsx";
import { portId, portList, setPortId, setPortList } from "~/GlobalState.ts";
import { Dynamic } from "solid-js/web";

function Connect() {
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

  return (
    <div style={{ padding: "3rem", height: `100%`, width: "100%" }}>
      <Text variant="heading" size="2xl" marginLeft="0.2rem">
        Ports
      </Text>
      <Stack width="100%" direction="row" minWidth="50rem" marginLeft="0.2rem">
        <Text
          size="lg"
          width="20rem"
          fontWeight="light"
          opacity="60%"
          marginTop="1rem"
          textOverflow="ellipsis"
          overflow="hidden"
          whiteSpace="nowrap"
        >
          {portId().length > 0 ? portId() : "No port selected"}
        </Text>
        {/*@ts-ignore Should change not to use ts-ignore*/}
        <Button
          onClick={() => {
            detectPort();
            setPortId("");
          }}
          marginLeft={`calc(100% - 20rem - 5rem)`}
          marginRight="1rem"
          width="7rem"
        >
          Scan
        </Button>
      </Stack>
      <Card.Root
        width="100%"
        height={`calc(100% - 6rem)`}
        marginTop="1.5rem"
        style={{
          "overflow-y": "auto",
          "min-height": "20rem",
          "min-width": "50rem",
        }}
      >
        <Show when={portList().length == 0}>
          <div
            style={{
              width: "100%",
              "text-align": "center",
              "margin-top": `20%`,
            }}
          >
            <Dynamic
              component={IconPlugOff}
              size={40}
              opacity="30%"
              style={{ "margin-left": `calc(50% - 1rem)` }}
            />

            <Text variant="heading" size="2xl" marginTop="1rem" opacity="70%">
              No ports Found
            </Text>
          </div>
        </Show>
        <Show when={portList().length > 0}>
          <Accordion.Root
            multiple
            borderTop="0"
            borderBottom="0"
            paddingRight="1rem"
            paddingLeft="1rem"
          >
            <For each={portList()}>
              {(port) => (
                <Accordion.Item
                  value={port.id}
                  paddingTop="1rem"
                  paddingBottom="1rem"
                >
                  <Stack direction="row" width="100%" alignItems="center">
                    <IconPlug
                      style={{
                        opacity: portId() === port.id ? "100%" : "30%",
                        width: "3rem",
                      }}
                    />
                    <Text
                      fontWeight="bold"
                      width="20%"
                      textOverflow="ellipsis"
                      overflow="hidden"
                      whiteSpace="nowrap"
                    >
                      {port.id}
                    </Text>
                    <Stack
                      direction="row"
                      marginLeft="auto"
                      alignItems="center"
                    >
                      <Text
                        opacity="60%"
                        textOverflow="ellipsis"
                        overflow="hidden"
                        whiteSpace="nowrap"
                        marginRight="1rem"
                      >
                        {port.version}
                      </Text>
                      {/*@ts-ignore Should change not to use ts-ignore*/}
                      <Button
                        onClick={() => {
                          setPortId(portId() === port.id ? "" : port.id);
                        }}
                        width="7rem"
                        variant={portId() === port.id ? "outline" : "solid"}
                      >
                        {portId() === port.id ? "Cancel" : "Select"}
                      </Button>
                    </Stack>
                  </Stack>
                </Accordion.Item>
              )}
            </For>
          </Accordion.Root>
        </Show>
      </Card.Root>
      <Toast.Toaster toaster={toaster}>
        {/*@ts-ignore Should change not to use ts-ignore*/}
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
    </div>
  );
}

export default Connect;
