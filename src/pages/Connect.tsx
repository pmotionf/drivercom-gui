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
  const [isDetected, setIsDetected] = createSignal<boolean>(
    portId().length !== 0 ? true : false,
  );
  const [portList, setPortList] = createSignal<string[]>([]);
  const [buttonSignalArray, setButtonSignalArray] = createSignal<boolean[]>([]);
  const [isSelected, setIsSelected] = createSignal<boolean>(
    portId().length !== 0 ? true : false,
  );

  if (portId().length !== 0) {
    detectPort();
  }

  async function detectPort() {
    const drivercom = Command.sidecar("binaries/drivercom", [
      "port.detect",
    ]);
    const output = await drivercom.execute();
    if (output.stdout.length === 0) {
      setIsDetected(false);
      setPortList([]);
      setPortId("");

      isSelected() ? setIsSelected(false) : toaster.create({
        title: "No Ports Found",
        description: "No driver serial ports were detected.",
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
    setPortList(filterPortList);

    const isSelectedArray = Array.from(
      { length: filterPortList.length },
      (_) => false,
    );
    if (portId().length !== 0) {
      isSelectedArray[filterPortList.indexOf(`${portId()}`) + 1] = true;
    }
    setButtonSignalArray(isSelectedArray);
  }

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
          minWidth={"5rem"}
          marginLeft="0.2rem"
        >
          Ports
        </Text>
        <Stack width={"100%"} direction={"row"} paddingRight={"2rem"}>
          <Text
            size={"lg"}
            width="10rem"
            marginTop="0.5rem"
            marginLeft="0.2rem"
          >
            {isSelected()
              ? portId().slice(4, portId().length)
              : "No port selected"}
          </Text>
          <Stack direction={"row-reverse"} width={"calc(100% - 10rem)"}>
            <Button
              onClick={() => {
                if (isSelected()) {
                  setIsSelected(false);
                  setPortId("");
                } else {
                  if (isDetected()) {
                    setPortList([]);
                    setPortId("");
                  }
                  detectPort();
                }
              }}
              variant={isSelected() ? "outline" : "solid"}
              width={"4rem"}
              disabled={isSelected() ? true : false}
            >
              Scan
            </Button>
          </Stack>
        </Stack>
        <Card.Root
          height={"calc(100% - 6rem)"}
          marginTop={"1.5rem"}
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
              when={!isDetected()}
            >
              <div
                style={{
                  width: "100%",
                  "text-align": "center",
                  "margin-top": `calc(100% / 6)`,
                }}
              >
                <Icon
                  size={"xl"}
                  opacity={"20%"}
                >
                  <IconPlugOff
                    size={"xl"}
                  />
                </Icon>

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
            <Show when={isDetected()}>
              <Accordion.Root multiple padding={0}>
                <For each={portList()}>
                  {(port, index) => (
                    <Accordion.Item
                      value={index().toString()}
                      rowGap={"0"}
                      paddingTop={"1rem"}
                      paddingBottom={"1rem"}
                    >
                      <Stack direction={"row"} width={"100%"}>
                        <Icon
                          opacity={portId() === port.slice(0, port.length - 7)
                            ? "100%"
                            : "30%"}
                          padding={"0"}
                          width="24px"
                          height={"24px"}
                          marginTop={"0.4rem"}
                        >
                          <IconPlug />
                        </Icon>
                        <Text
                          paddingLeft={"1.5rem"}
                          fontWeight={"bold"}
                          marginTop={"0.4rem"}
                          width={"5rem"}
                        >
                          {port.slice(4, length - 7)}
                        </Text>
                        <Stack
                          direction={"row-reverse"}
                          width={"calc(100% - 24px - 5rem)"}
                        >
                          <Button
                            onClick={() => {
                              const isFalse = Array.from(
                                { length: portList().length },
                                (_) => false,
                              );
                              if (
                                isSelected() && buttonSignalArray()[index()]
                              ) {
                                setIsSelected(false);
                                setButtonSignalArray(isFalse);
                                setPortId("");
                              } else if (
                                isSelected() && !buttonSignalArray()[index()]
                              ) {
                                isFalse[index()] = true;
                                setButtonSignalArray(isFalse);
                                setPortId(port.slice(0, length - 7));
                              } else {
                                setPortId(port.slice(0, length - 7));
                                setButtonSignalArray((prev) => {
                                  const updateList = prev;
                                  updateList[index()] = true;
                                  return updateList;
                                });
                                setIsSelected(true);
                              }
                            }}
                            width={"8rem"}
                            variant={portId() === port.slice(0, length - 7)
                              ? "outline"
                              : "solid"}
                          >
                            <Show
                              when={isSelected() &&
                                buttonSignalArray()[index()]}
                              fallback={"Select"}
                            >
                              Cancel
                            </Show>
                          </Button>
                        </Stack>
                      </Stack>
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
