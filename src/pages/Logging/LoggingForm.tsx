import { createEffect, createSignal, For, JSX, Show } from "solid-js";
import { Stack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Text } from "~/components/ui/text";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { portId } from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { createStore } from "solid-js/store";
import { Editable } from "~/components/ui/editable";
import { IconButton } from "~/components/ui/icon-button";
import { IconX } from "@tabler/icons-solidjs";
import { Menu } from "~/components/ui/menu";
import { ErrorMessage } from "../LogViewer/LogViewerTab";

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
  const [currentLogStatus, setCurrentLogStatus] = createSignal<string>("");

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
              loading={currentLogStatus() === "Log.Status.started"}
              onClick={async () => {
                const logStart = Command.sidecar("binaries/drivercom", [
                  `--port`,
                  portId(),
                  `log.start`,
                ]);
                await logStart.execute();
                logStatus();
                getCyclesValue();

                createEffect(() => {
                  if (cyclesCompleted() !== currentCycles()) {
                    logStatus();
                  }
                });
              }}
              variant={"outline"}
            >
              Log Start
            </Button>
            <Button
              disabled={currentLogStatus() !== "Log.Status.started"}
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
              disabled={currentLogStatus() === "Log.Status.started" ||
                currentLogStatus() === "Log.Status.invalid"}
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
                      // Error Message
                      logStatus();

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

  return (
    <For each={Object.entries(obj)}>
      {(key) => (
        <>
          <Show when={props.sectionName === undefined}>
            <Text
              fontWeight={"bold"}
              marginTop={"1rem"}
              opacity={"50%"}
              size={"lg"}
            >
              {key[0]}
            </Text>
          </Show>
          <Show when={typeof key[1] === "number" && key[0] !== "_"}>
            <Stack direction={"row"}>
              <Show when={props.sectionName}>
                <Text marginTop="0.3rem" width={"30%"}>
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
            <Text marginTop="0.3rem" width={"30%"}>
              {key[0]}
            </Text>
            <Input
              type="string"
              value={`${key[1]}`}
              placeHolder={key[0]}
              onchange={(e) => {
                setObject(
                  key[0] as keyof typeof obj,
                  // @ts-ignore : TSC unable to handle generic object type
                  // in store
                  e.target.value,
                );
              }}
            />
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
            >
              {!isNaN(Number(key[0]))
                ? `${props.sectionName} ${Number(key[0]) + 1}`
                : key[0]}
            </Checkbox>
          </Show>
          <Show when={typeof key[1] === "object"}>
            <Show when={props.sectionName !== undefined}>
              <Text
                marginTop={"0.2rem"}
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
