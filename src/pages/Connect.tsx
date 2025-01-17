import { Button } from "~/components/ui/button";
import { IconPlug, IconPlugOff, IconX } from "@tabler/icons-solidjs";
import { Text } from "~/components/ui/text";
import { Stack } from "styled-system/jsx";
import { Card } from "~/components/ui/card";

import { Command } from "@tauri-apps/plugin-shell";
import { For, Show } from "solid-js";
import { Accordion } from "~/components/ui/accordion";
import { Toast } from "~/components/ui/toast";
import { portId, portList, setPortId, setPortList } from "~/GlobalState";
import { Dynamic } from "solid-js/web";

function Connect() {
  async function detectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "port.detect",
    ]);
    const output = await drivercom.execute();

    const portNames = output.stdout.split("\n").map(
      (portName) => {
        const matched = portName.match(/\(([^)]+)\)/);
        return matched;
      },
    ).filter((e) => e !== null).map((e) => e[1]);
    setPortList(portNames);

    if (portNames.length == 0) {
      setPortId("");
      toaster.create({
        title: "No Ports Found",
        description: "No driver serial ports were detected.",
        type: "error",
      });
      return;
    }
  }

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  return (
    <div
      style={{ "padding": "3rem", "height": `100%`, "width": "100%" }}
    >
      <Text
        variant={"heading"}
        size={"2xl"}
        marginLeft={"0.2rem"}
      >
        Ports
      </Text>
      <Stack
        width={"100%"}
        direction={"row"}
        minWidth={"50rem"}
        marginLeft={"0.2rem"}
      >
        <Text
          size={"lg"}
          width="20rem"
          fontWeight={"light"}
          opacity={"60%"}
          marginTop="1rem"
        >
          {portId().length > 0 ? portId() : "No port selected"}
        </Text>
        <Button
          onClick={() => detectPort()}
          marginLeft={`calc(100% - 20rem - 5rem)`}
          marginRight={"1rem"}
          width="7rem"
        >
          Scan
        </Button>
      </Stack>
      <Card.Root
        width={"100%"}
        height={`calc(100% - 6rem)`}
        marginTop={"1.5rem"}
        style={{
          "overflow-y": "auto",
          "min-height": "20rem",
          "min-width": "50rem",
        }}
      >
        <Show
          when={portList().length == 0}
        >
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
              opacity={"30%"}
              style={{ "margin-left": `calc(50% - 1rem)` }}
            />

            <Text
              variant={"heading"}
              size={"2xl"}
              marginTop={"1rem"}
              opacity={"70%"}
            >
              No ports Found
            </Text>
          </div>
        </Show>
        <Show when={portList().length > 0}>
          <Accordion.Root
            multiple
            borderTop={"0"}
            borderBottom={"0"}
            paddingRight={"1rem"}
            paddingLeft={"1rem"}
          >
            <For each={portList()}>
              {(port) => (
                <Accordion.Item
                  value={port}
                  paddingTop={"1rem"}
                  paddingBottom={"1rem"}
                >
                  <Stack direction="row" width="100%">
                    <IconPlug
                      style={{
                        "margin-top": "0.5rem",
                        opacity: portId() === port ? "100%" : "30%",
                        width: "3rem",
                      }}
                    />
                    <Text
                      fontWeight="bold"
                      width="10%"
                      marginTop="0.5rem"
                    >
                      {port}
                    </Text>
                    <Button
                      onClick={() => {
                        setPortId(
                          portId() === port ? "" : port,
                        );
                      }}
                      width="7rem"
                      marginLeft={`calc(100% - 10% - 7rem)`}
                      variant={portId() === port ? "outline" : "solid"}
                    >
                      {portId() === port ? "Cancel" : "Select"}
                    </Button>
                  </Stack>
                </Accordion.Item>
              )}
            </For>
          </Accordion.Root>
        </Show>
      </Card.Root>
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
    </div>
  );
}

export default Connect;
