import { createEffect, createSignal, For, JSX, onMount, Show } from "solid-js";
import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Text } from "~/components/ui/text";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  logStartCombinatorList,
  logStartConditionList,
  portId,
  setRecentFilesPath,
} from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { createStore } from "solid-js/store";
import { Editable } from "~/components/ui/editable";
import { IconButton } from "~/components/ui/icon-button";
import { IconX } from "@tabler/icons-solidjs";
import { Menu } from "~/components/ui/menu";
import { ErrorMessage } from "../LogViewer/LogViewerTab";
import { createListCollection, Select } from "~/components/ui/select";

export type LoggingFormProps = JSX.HTMLAttributes<Element> & {
  jsonfile: object;
  fileName: string;
  onCancel?: () => void;
  onErrorMessage?: (message: ErrorMessage) => void;
};

export function LoggingForm(props: LoggingFormProps) {
  const logForm = props.jsonfile;
  const [cyclesCompleted, setCyclesCompleted] = createSignal<number>(0);
  const [currentCycles, setCurrentCycles] = createSignal<number>(0);
  const [currentLogStatus, setCurrentLogStatus] = createSignal<string>("")

  async function logStatus() {
    if (portId().length === 0) return;
    const logStatus = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.status`,
    ]);
    const output = await logStatus.execute();
    const parseOutput = output.stdout.replaceAll(" ", "").replaceAll("\n", "");
    const splitToArray = parseOutput.split(",").map((value) => {
      return value.split(":");
    });
    setCurrentLogStatus(splitToArray[0][1]);
    setCyclesCompleted(Number(splitToArray[1][1]));
  }

  async function getCyclesValue() {
    if (portId().length === 0) return;
    const logConfigGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.config.get`,
    ]);
    const output = await logConfigGet.execute();
    const parseObject = JSON.parse(output.stdout);
    const cyclesIndex = Object.keys(parseObject).indexOf("cycles");
    const cyclesValue = Object.values(parseObject)[cyclesIndex];
    setCurrentCycles(Number(cyclesValue));
  }

  const [logGetBtnLoading, setLogGetBtnLoading] = createSignal(false);
  async function logGet() {
    setLogGetBtnLoading(true);
    const logGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.get`,
    ]);
    const output = await logGet.execute(); 

    if (output.stdout) {
      const checkError = output.stdout.split("\n").filter((line) => line.length > 0)
      if(checkError.length <= 1) {
        props.onErrorMessage?.({
          title: "Invalid Log",
           description: "Log is not available.",
           type : "error"
        })
        setLogGetBtnLoading(false);
        setCurrentLogStatus("Log.status.invalid")
        return;
      }

      const path = await save({
        defaultPath: `${fileName()}`,
        filters: [
          {
            name: "CSV",
            extensions: ["csv"],
          },
        ],
      });

      if (!path) {
        props.onErrorMessage?.({
          title: "Invalid File Path",
          description: "The specified file path is invalid.",
          type: "error",
        });
        setLogGetBtnLoading(false);
        return;
      }
      const extension = path.split(".").pop();
      if (extension != "csv") {
        props.onErrorMessage?.({
          title: "Invalid File Extension",
          description: "The specified file extension is invalid.",
          type: "error",
        });
        setLogGetBtnLoading(false);
        return;
      }
      // TODO: Handle write promise error with toast
      const csvFile = output.stdout;
      await writeTextFile(path, csvFile);
      setLogGetBtnLoading(false);
    }
  }

  const [fileName, setFileName] = createSignal<string>(props.fileName);

  return (
    <div style={{ "width": "30rem", "margin-bottom": "3rem" }}>
      <Card.Root>
        <Card.Header paddingTop={"3rem"}>
          <Editable.Root
            placeholder="File name"
            defaultValue={fileName()}
            activationMode="dblclick"
            onValueCommit={(e) => {
              setFileName(e.value);
            }}
            fontWeight={"bold"}
            fontSize={"2xl"}
          >
            <Editable.Area>
              <Editable.Input />
              <Editable.Preview />
            </Editable.Area>
          </Editable.Root>
          <Text
            marginTop={"0.5rem"}
            fontWeight={"light"}
            opacity={"60%"}
            size={"lg"}
            userSelect={"none"}
          >
            Log Configuration
          </Text>
        </Card.Header>
        <Card.Body gap={1.5}>
          <LogFormObject object={logForm} />
          <IconButton
            onClick={() => props.onCancel?.()}
            variant="ghost"
            borderRadius="1rem"
            width="1rem"
            style={{ position: "absolute", top: "1.5rem", right: "0.5rem" }}
            padding="0"
          >
            <IconX />
          </IconButton>
        </Card.Body>
        <Card.Footer marginTop={"3rem"} marginBottom={"2rem"}>
          <Stack direction={"row"}>
            <Button
              disabled={portId().length === 0 || logGetBtnLoading() || cyclesCompleted() === currentCycles()}
              loading={currentLogStatus() === "Log.Status.started"}
              onClick={async () => {
                const logStart = Command.sidecar("binaries/drivercom", [
                  `--port`,
                  portId(),
                  `log.start`,
                ]);
                await logStart.execute();
                logStatus();
                getCyclesValue()

                if (currentLogStatus() === "Log.Status.invalid") {
                  props.onErrorMessage?.({
                    title: "Log Invalid",
                    description: "Current log state is invalid.",
                    type: "error",
                  });
                  return;
                }
                createEffect(() => {
                  const cyclesNumber = cyclesCompleted()
                  if (cyclesNumber !== currentCycles()) {
                    logStatus();
                  }
                });
              }}
              variant={"outline"}
            >
              Log Start
            </Button>
            <Button
              disabled={currentLogStatus() !== "Log.Status.started" ||
                portId().length === 0}
              onClick={async () => {
                const logStop = Command.sidecar("binaries/drivercom", [
                  `--port`,
                  portId(),
                  `log.stop`,
                ]);
                await logStop.execute();
                logStatus();
              }}
              variant={"outline"}
            >
              Log Stop
            </Button>
            <Button
              disabled={currentLogStatus() !== "Log.Status.stopped"}
              onClick={() => {
                logGet();
              }}
              variant={"outline"}
              loading={logGetBtnLoading()}
            >
              Log Get
            </Button>
            <Menu.Root>
              <Menu.Trigger>
                <Button>
                  Save
                </Button>
              </Menu.Trigger>
              <Menu.Positioner>
                <Menu.Content width="8rem">
                  <Menu.Item
                    value={"Save as file"}
                    onClick={async () => {
                      const json_str = JSON.stringify(logForm, null, "  ");
                      const path = await save({
                        defaultPath: `${fileName()}`,
                        filters: [
                          {
                            name: "JSON",
                            extensions: ["json"],
                          },
                        ],
                      });
                      if (!path) {
                        props.onErrorMessage?.({
                          title: "Invalid File Path",
                          description: "The specified file path is invalid.",
                          type: "error",
                        });
                        return;
                      }
                      const extension = path.split(".").pop();
                      if (extension != "json") {
                        props.onErrorMessage?.({
                          title: "Invalid File Extension",
                          description:
                            "The specified file extension is invalid.",
                          type: "error",
                        });
                        return;
                      }
                      // TODO: Handle write promise error with toast
                      await writeTextFile(path, json_str);
                      setRecentFilesPath((prev) => {
                        const parseFilePath = prev.filter((prevPath) =>
                          prevPath !== path
                        );
                        return [path, ...parseFilePath].slice(0, 7);
                      });
                    }}
                  >
                    Save as file
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    value={"Save to port"}
                    disabled={portId().length === 0}
                    onClick={async () => {
                      const json_str = JSON.stringify(logForm, null, "  ");
                      if (portId().length === 0) return;
                      const logSave = Command.sidecar("binaries/drivercom", [
                        `--port`,
                        portId(),
                        `log.config.set`,
                        json_str,
                      ]);
                      const output = await logSave.execute();
                      setTimeout(() => {
                        getCyclesValue();
                        logStatus();
                      },100)
                      // Error Message
                      if (output.stderr.length > 0) {
                        const checkErrorMsg = output.stderr.split(`\n`)[0]
                          .replaceAll(" ", "")
                          .split(":");
                        if (checkErrorMsg[0] !== "error") return;
                        // Only show error message, when the message starts with error
                        // Also change upper case to lower case, to show as a message
                        const parseErrorMsg = Array.from(checkErrorMsg[1]).map(
                          (alphabet, index) => {
                            return alphabet === alphabet.toUpperCase()
                              ? index === 0
                                ? ` ${alphabet}`
                                : ` ${alphabet.toLowerCase()}`
                              : alphabet;
                          },
                        ).toString().replaceAll(",", "");
                        props.onErrorMessage?.({
                          title: "Invalid Log Error",
                          description: parseErrorMsg,
                          type: "error",
                        });
                        return;
                      }
                    }}
                  >
                    Save to port
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          </Stack>
        </Card.Footer>
      </Card.Root>
    </div>
  );
}

export type logFormObjectProps = JSX.HTMLAttributes<Element> & {
  object: object;
  sectionName?: string;
};

export function LogFormObject(props: logFormObjectProps) {
  const [obj, setObject] = createStore<object>(props.object);

  const [prevCheckBoxIndex, setPrevCheckBoxIndex] = createSignal<number | null>(
    null,
  );

  const checkBoxShiftClick = (index: number) => {
    if (prevCheckBoxIndex() === null) return;
    const startNumber = Math.min(prevCheckBoxIndex()!, index);
    const endNumber = Math.max(prevCheckBoxIndex()!, index);

    const keys = Object.keys(obj).slice(startNumber, endNumber + 1);
    keys.forEach((key) => {
      setObject(
        key as keyof typeof obj,
        // @ts-ignore : TSC unable to handle generic object type
        // in store
        true,
      );
    });
  };

  const parseStartConditionList = logStartConditionList().map((condition) => {
    return { label: condition, value: condition };
  });
  const logStartConditions = createListCollection({
    items: parseStartConditionList,
  });

  const parseCombinatorList = logStartCombinatorList().map((condition) => {
    return { label: condition, value: condition };
  });
  const logStartCombinators = createListCollection({
    items: parseCombinatorList,
  });

  return (
    <For each={Object.entries(obj)}>
      {(key, index) => (
        <>
          <Show when={props.sectionName === undefined}>
            <Text
              fontWeight={"bold"}
              marginTop={"1rem"}
              opacity={"50%"}
              size={"lg"}
              userSelect={"none"}
            >
              {key[0]}
            </Text>
          </Show>
          <Show when={typeof key[1] === "number" && key[0] !== "_"}>
            <Stack direction={"row"}>
              <Show when={props.sectionName}>
                <Text
                  marginTop="0.3rem"
                  width={"30%"}
                  fontWeight={"light"}
                  userSelect={"none"}
                >
                  {`${props.sectionName} ${Number(key[0]) + 1}`}
                </Text>
              </Show>
              <Input
                value={Number(key[1])}
                type={"number"}
                onChange={(e) => {
                  setObject(
                    key[0] as keyof typeof obj,
                    // @ts-ignore : TSC unable to handle generic object type
                    // in store
                    Number(e.target.value),
                  );
                }}
              />
            </Stack>
          </Show>
          <Show when={typeof key[1] === "string"}>
            <Text
              marginTop="0.3rem"
              width={"30%"}
              fontWeight={"light"}
              userSelect={"none"}
            >
              {key[0]}
            </Text>
            <Select.Root
              positioning={{ sameWidth: true }}
              width="2xs"
              collection={key[0].toString() === "kind"
                ? logStartConditions
                : logStartCombinators}
              defaultValue={[key[1].toString()]}
              onValueChange={(v) => {
                setObject(
                  key[0] as keyof typeof obj,
                  // @ts-ignore : TSC unable to handle generic object type
                  // in store
                  Object.values(v.items)[0].label,
                );
              }}
            >
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Select a Framework" />
                </Select.Trigger>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  <For
                    each={key[0].toString() === "kind"
                      ? logStartConditions.items
                      : logStartCombinators.items}
                  >
                    {(item) => (
                      <Select.Item item={item}>
                        <Select.ItemText>{item.label}</Select.ItemText>
                        <Select.ItemIndicator>
                        </Select.ItemIndicator>
                      </Select.Item>
                    )}
                  </For>
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Show>
          <Show when={typeof key[1] === "boolean"}>
            <Checkbox
              checked={obj[key[0] as keyof typeof obj]}
              onCheckedChange={(e) => {
                setObject(
                  key[0] as keyof typeof obj,
                  // @ts-ignore : TSC unable to handle generic object type
                  // in store
                  e.checked,
                );
              }}
              onClick={(e) => {
                if (key[1] as keyof typeof obj) {
                  setPrevCheckBoxIndex(null);
                  return;
                }
                !e.shiftKey
                  ? setPrevCheckBoxIndex(index())
                  : checkBoxShiftClick(index());
              }}
            >
              <Text fontWeight={"light"} userSelect={"none"}>
                {!isNaN(Number(key[0]))
                  ? `${props.sectionName} ${Number(key[0]) + 1}`
                  : key[0]}
              </Text>
            </Checkbox>
          </Show>
          <Show when={typeof key[1] === "object"}>
            <Show when={props.sectionName !== undefined}>
              <Text
                marginTop={"0.2rem"}
                fontWeight={"medium"}
                userSelect={"none"}
              >
                {key[0]}
              </Text>
            </Show>
            <LogFormObject
              object={key[1]}
              sectionName={key[0]}
              style={{ "margin-bottom": "0.5rem" }}
            />
          </Show>
        </>
      )}
    </For>
  );
}
