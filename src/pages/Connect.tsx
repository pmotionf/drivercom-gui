import { Button } from "~/components/ui/button";
import { IconPlug, IconPlugOff, IconX } from "@tabler/icons-solidjs";
import { Text } from "~/components/ui/text";
import { Stack } from "styled-system/jsx";
import { Card } from "~/components/ui/card";

import { Command } from "@tauri-apps/plugin-shell";
import { createSignal, For, Show } from "solid-js";
import { Accordion } from "~/components/ui/accordion";
import { Toast } from "~/components/ui/toast";
import { portId, setPortId } from "~/GlobalState";
import { Icon } from "~/components/ui/icon";

function Connect() {
  const [isDetected, setIsDetected] = createSignal<boolean>(false);
  const [portList, setPortList] = createSignal<string[]>([]);
  const [buttonSignalArray, setButtonSignalArray] = createSignal<boolean[]>([]);

  async function detectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "port.detect",
    ]);
    const output = await drivercom.execute();
    if (output.stdout.length === 0) {
      const stderr = output.stderr;
      toaster.create({
        title: "Port detect fail",
        description: `${stderr}`,
        type: "error",
      });
      return;
    }
    setIsDetected(true);
    getPortList();
  }

  async function getPortList() {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "port.list",
    ]);
    const output = await drivercom.execute();
    const portList = output.stdout.split("\n");
    const filterPortList = portList.filter((e) => e !== "\\\\.\\COM (COM)")
      .filter((e) => e.length !== 0);
    filterPortList.length === 0 ? setIsDetected(false) : setIsDetected(true);

    if (!isDetected()) return;
    const isConnectedArray = Array.from(
      { length: filterPortList.length },
      (_) => false,
    );
    setButtonSignalArray(isConnectedArray);
    setPortList(filterPortList);
  }

  const [isConnected, setIsConnected] = createSignal<boolean>();

  const toaster = Toast.createToaster({
    placement: "top-end",
    gap: 24,
  });

  return (
    <>
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
      <div
        style={{ "padding": "3rem", "height": "100%" }}
      >
        <Text
          variant={"heading"}
          size={"2xl"}
        >
          Port
        </Text>
        <Card.Root
          marginTop={"2rem"}
          style={{ "min-width": "50rem" }}
        >
          <Stack
            direction={"row"}
          >
            <Card.Header
              paddingLeft={"2rem"}
              width={"3rem"}
              paddingTop={"2rem"}
            >
              <Show
                when={isConnected()}
                fallback={<IconPlugOff opacity={"20%"} />}
              >
                <IconPlug />
              </Show>
            </Card.Header>
            <Card.Body
              paddingTop={"1rem"}
            >
              <Text
                variant={"heading"}
                size={"xl"}
              >
                {isConnected()
                  ? "Connected"
                  : isDetected()
                  ? "Port detected"
                  : "Not found"}
              </Text>
              <Text
                opacity={"70%"}
              >
                {isConnected()
                  ? portId().slice(4, 8)
                  : isDetected()
                  ? "Port is found"
                  : "Port is not found"}
              </Text>
            </Card.Body>
            <Card.Footer
              paddingTop={"1.5rem"}
              paddingRight={"2rem"}
            >
              <Button
                disabled={isDetected() ? isConnected() ? false : true : false}
                onClick={() => {
                  isConnected() ? setIsConnected(false) : detectPort();
                }}
                variant={isConnected() ? "outline" : "solid"}
              >
                {isConnected()
                  ? "Cancel"
                  : isDetected()
                  ? "Port detected"
                  : "Detect port"}
              </Button>
            </Card.Footer>
          </Stack>
        </Card.Root>

        <Text
          variant={"heading"}
          size={"2xl"}
          marginTop={"3rem"}
        >
          Port List
        </Text>
        <Text
          marginTop={"0.5rem"}
        >
          {isDetected() ? "Port found" : "Not found"}
        </Text>
        <Card.Root
          height={`calc(100% - 19rem)`}
          marginTop={"1rem"}
          marginBottom={"3rem"}
          style={{
            "overflow-y": "auto",
            "min-height": "22rem",
            "min-width": "50rem",
          }}
        >
          <Card.Body
            paddingRight={"2rem"}
            paddingLeft={"2rem"}
            paddingTop={"1.5rem"}
          >
            <Show
              when={isDetected()}
              fallback={
                <div
                  style={{
                    width: "100%",
                    "text-align": "center",
                    "margin-top": `calc(100% / 10)`,
                  }}
                >
                  <Icon
                    size={"2xl"}
                    opacity={"20%"}
                  >
                    <IconPlugOff
                      size={"2xl"}
                    />
                  </Icon>

                  <Text
                    variant={"heading"}
                    size={"xl"}
                    marginTop={"1rem"}
                    opacity={"70%"}
                  >
                    Port is not detected
                  </Text>
                  <Text
                    opacity={"60%"}
                  >
                    Click the button above to detect port
                  </Text>
                </div>
              }
            >
              <Accordion.Root multiple>
                <For each={portList()}>
                  {(port, index) => (
                    <Accordion.Item value={index().toString()} gap={0}>
                      <Accordion.ItemTrigger>
                        <Stack direction={"row"}>
                          <IconPlug />
                          {port.slice(4, 8)}
                        </Stack>
                      </Accordion.ItemTrigger>
                      <Accordion.ItemContent
                        padding={"1rem"}
                      >
                        <Stack direction={"row"} width={"100%"}>
                          <Text>
                            <Show
                              when={isConnected() &&
                                buttonSignalArray()[index()]}
                              fallback={"Not connected"}
                            >
                              Connected
                            </Show>
                          </Text>
                          <Stack direction={"row-reverse"} width={"100%"}>
                            <Button
                              variant={buttonSignalArray()[index()]
                                ? "outline"
                                : "solid"}
                              onClick={() => {
                                const isFalse = Array.from(
                                  { length: portList().length },
                                  (_) =>
                                    false,
                                );
                                if (
                                  isConnected() && buttonSignalArray()[index()]
                                ) {
                                  setIsConnected(false);
                                  setButtonSignalArray(isFalse);
                                  setPortId("");
                                } else if (
                                  isConnected() && !buttonSignalArray()[index()]
                                ) {
                                  isFalse[index()] = true;
                                  setButtonSignalArray(isFalse);
                                  setPortId(port.slice(0, 8));
                                } else {
                                  setPortId(port.slice(0, 8));
                                  setButtonSignalArray((prev) => {
                                    const updateList = prev;
                                    updateList[index()] = true;
                                    return updateList;
                                  });
                                  setIsConnected(true);
                                }
                              }}
                              width={"8rem"}
                            >
                              <Show
                                when={isConnected() &&
                                  buttonSignalArray()[index()]}
                                fallback={"Connect"}
                              >
                                Cancel
                              </Show>
                            </Button>
                          </Stack>
                        </Stack>
                      </Accordion.ItemContent>
                    </Accordion.Item>
                  )}
                </For>
              </Accordion.Root>
            </Show>
          </Card.Body>
          <Card.Footer>
          </Card.Footer>
        </Card.Root>
      </div>
    </>
  );
}

export default Connect;
