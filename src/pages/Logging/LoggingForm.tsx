import { createSignal, For, JSX, onMount, Show } from "solid-js";
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
  setRecentLogFilePaths,
} from "~/GlobalState";
import { Command } from "@tauri-apps/plugin-shell";
import { createStore } from "solid-js/store";
import { Editable } from "~/components/ui/editable";
import { IconButton } from "~/components/ui/icon-button";
import { IconFileIsr, IconReload, IconX } from "@tabler/icons-solidjs";
import { Menu } from "~/components/ui/menu";
import { ErrorMessage } from "../LogViewer/LogViewerTabPageContent";
import { createListCollection, Select } from "~/components/ui/select";
import { Tooltip } from "~/components/ui/tooltip";

export type LoggingFormProps = JSX.HTMLAttributes<Element> & {
  formData: object;
  formTitle: string;
  onFormTitleChange?: (fileName: string) => void;
  mode?: "none" | "create" | "file" | "port";
  filePath?: string;
  onModeChange?: (
    mode: "none" | "create" | "file" | "port",
    filePath: string,
  ) => void;
  onReloadFile?: () => void;
  onReloadPort?: () => void;
  onCancel?: () => void;
  onErrorMessage?: (message: ErrorMessage) => void;
};

export function LoggingForm(props: LoggingFormProps) {
  const logForm = props.formData;

  const [cyclesCompleted, setCyclesCompleted] = createSignal<number>(0);
  const [currentLogStatus, setCurrentLogStatus] = createSignal<string>("");

  let firstStart: boolean = true;

  async function getCurrentLogStatus() {
    if (portId().length === 0) return;
    const logStatus = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.status`,
    ]);
    const output = await logStatus.execute();
    const parseOutput = output.stdout.replaceAll(" ", "").replaceAll("\n", "");
    const currentLogStatusList = parseOutput.split(",").map((value) => {
      return value.split(":");
    });

    const currentCompletedLogCycle = Number(currentLogStatusList[1][1]);
    setCyclesCompleted(currentCompletedLogCycle);

    const currentLogState = currentLogStatusList[0][1];
    if (!currentLogState) return;
    setCurrentLogStatus(currentLogState);
    if (currentLogState === "Log.Status.invalid") {
      if (firstStart) {
        firstStart = false;
        return;
      }
      props.onErrorMessage?.({
        title: "Invalid Log",
        description: "The log is invalid.",
        type: "error",
      });
    }
  }

  onMount(() => {
    getCurrentLogStatus();
  });

  // Signal for display Log Get button loading while saving log.csv file.
  const [logGetBtnLoading, setLogGetBtnLoading] = createSignal(false);

  // Save log.csv file && Display `Log Get` button loading while saving log.csv file
  async function saveLogCsvFile() {
    setLogGetBtnLoading(true);
    const logGet = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `--timeout`,
      `10000`,
      `log.get`,
    ]);
    const output = await logGet.execute();

    if (output) {
      const notEmptyLines = output.stdout
        .split("\n")
        .filter((line) => line.length > 0);

      if (output.stderr.length > 0) {
        props.onErrorMessage?.({
          title: "Communication Failure",
          description: output.stderr,
          type: "error",
        });
        setLogGetBtnLoading(false);
        return;
      }

      if (notEmptyLines.length <= 1) {
        props.onErrorMessage?.({
          title: "Invalid Log",
          description: "No log data found.",
          type: "error",
        });
        setLogGetBtnLoading(false);
        return;
      }

      const path = await save({
        defaultPath: props.formTitle!.split(".").pop()!.toLowerCase() === "csv"
          ? `${props.formTitle}`
          : `${props.formTitle}.csv`,
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
          description: "The file path is invalid.",
          type: "error",
        });
        setLogGetBtnLoading(false);
        return;
      }
      const extension = path.split(".").pop();
      if (extension != "csv") {
        props.onErrorMessage?.({
          title: "Invalid File Extension",
          description: "The file extension is invalid.",
          type: "error",
        });
        setLogGetBtnLoading(false);
        return;
      }

      const csvFile = output.stdout;
      await writeTextFile(path, csvFile);
      setLogGetBtnLoading(false);
    }
  }

  async function startLogging() {
    const logStart = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.start`,
    ]);
    await logStart.execute();
  }

  async function stopLogging() {
    const logStop = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.stop`,
    ]);
    await logStop.execute();
  }

  async function openSaveFileDialog(): Promise<string | null> {
    const fileNameFromPath = props.filePath! && props.filePath.length !== 0
      ? props.filePath.match(/[^?!//]+$/)!.toString()
      : "";
    const currentFilePath = props.filePath! && props.filePath.length !== 0
      ? props.formTitle === fileNameFromPath
        ? props.filePath
        : props.filePath.replace(fileNameFromPath, props.formTitle)
      : props.formTitle;

    const path = await save({
      defaultPath: currentFilePath!.split(".").pop()!.toLowerCase() === "json"
        ? `${currentFilePath}`
        : `${currentFilePath}.json`,
      filters: [
        {
          name: "JSON",
          extensions: ["json"],
        },
      ],
    });
    if (!path) {
      return null;
    }

    const extension = path.split(".").pop();
    if (extension != "json") {
      return null;
    }

    return path;
  }

  async function saveLogAsFile(path: string, logForm: object) {
    const json_str = JSON.stringify(logForm, null, "  ");
    await writeTextFile(path, json_str);
    setRecentLogFilePaths((prev) => {
      const parseFilePath = prev.filter((prevPath) => prevPath !== path);
      return [path.replaceAll("\\", "/"), ...parseFilePath];
    });
  }

  async function saveLogToPort(log: object): Promise<string> {
    const json_str = JSON.stringify(log, null, "  ");
    const logSave = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `log.config.set`,
      json_str,
    ]);
    const output = await logSave.execute();
    return output.stderr;
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Card.Root padding="0.5rem" height={`100%`}>
        <Card.Header paddingTop="1rem">
          <Stack
            direction="row-reverse"
            width="100%"
            gap="2"
            marginBottom="1rem"
            minWidth="30rem"
          >
            <IconButton
              onClick={() => props.onCancel?.()}
              variant="ghost"
              borderRadius="1rem"
            >
              <IconX />
            </IconButton>

            <Stack direction="row">
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <IconButton
                    disabled={portId().length === 0 || logGetBtnLoading()}
                    onClick={() => getCurrentLogStatus()}
                    variant="ghost"
                  >
                    <IconReload />
                  </IconButton>
                </Tooltip.Trigger>
                <Tooltip.Positioner>
                  <Tooltip.Content backgroundColor="bg.default">
                    <Text color="fg.default">Reset log status</Text>
                  </Tooltip.Content>
                </Tooltip.Positioner>
              </Tooltip.Root>

              <Button
                disabled={portId().length === 0 ||
                  logGetBtnLoading() ||
                  currentLogStatus() === "Log.Status.invalid" ||
                  currentLogStatus() === "Log.Status.started" ||
                  currentLogStatus() === "Log.Status.waiting"}
                onClick={async () => {
                  await startLogging();
                  await getCurrentLogStatus();
                }}
                variant="outline"
              >
                Log Start
              </Button>
              <Button
                disabled={currentLogStatus() === "Log.Status.stopped" ||
                  currentLogStatus() === "Log.Status.invalid" ||
                  portId().length === 0}
                onClick={async () => {
                  await stopLogging();
                  await getCurrentLogStatus();
                }}
                variant="outline"
              >
                Log Stop
              </Button>
              <Button
                disabled={currentLogStatus() !== "Log.Status.stopped" ||
                  portId().length === 0 ||
                  currentLogStatus() === "Log.Status.invalid" ||
                  cyclesCompleted() === 0 ||
                  portId().length === 0}
                onClick={async () => {
                  await saveLogCsvFile();
                }}
                variant="outline"
                loading={logGetBtnLoading()}
              >
                Log Get
              </Button>
              <Menu.Root>
                <Menu.Trigger>
                  <Button variant="outline">Save</Button>
                </Menu.Trigger>
                <Menu.Positioner>
                  <Menu.Content width="8rem">
                    <Menu.Item
                      value="Save as file"
                      onClick={async () => {
                        const path = await openSaveFileDialog();
                        if (!path) {
                          props.onErrorMessage?.({
                            title: "Invalid File Path",
                            description: "The specified file path is invalid.",
                            type: "error",
                          });
                          return;
                        }
                        if (props.mode === "create") {
                          props.onModeChange?.(
                            "file",
                            path.replaceAll("\\", "/"),
                          );
                        }
                        await saveLogAsFile(path, logForm);
                      }}
                      userSelect="none"
                    >
                      Save as file
                    </Menu.Item>
                    <Menu.Separator />
                    <Menu.Item
                      value="Save to port"
                      disabled={portId().length === 0 || logGetBtnLoading()}
                      onClick={async () => {
                        const outputError = await saveLogToPort(logForm);
                        if (outputError.length !== 0) {
                          props.onErrorMessage?.({
                            title: "Communication Error",
                            description: outputError,
                            type: "error",
                          });
                          return;
                        }
                        props.onErrorMessage?.({
                          title: "Communication Success",
                          description: "Log saved to port successfully.",
                          type: "error",
                        });
                        getCurrentLogStatus();
                      }}
                      userSelect="none"
                    >
                      Save to port
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Menu.Root>
            </Stack>
            <Show when={props.mode !== "create"}>
              <div style={{ width: "100%" }}>
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <IconButton
                      width="100%"
                      onClick={() => {
                        if (props.mode === "file") {
                          props.onReloadFile?.();
                        } else if (props.mode === "port") {
                          props.onReloadPort?.();
                        }
                      }}
                      variant="outline"
                      borderRadius="1rem"
                    >
                      <IconFileIsr />
                    </IconButton>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content backgroundColor="bg.default">
                      <Text color="fg.default">
                        Reload log from {`${props.mode}`}
                      </Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              </div>
            </Show>
          </Stack>
          <Editable.Root
            placeholder="File name"
            defaultValue={props.formTitle}
            activationMode="dblclick"
            onValueCommit={(e) => {
              props.onFormTitleChange?.(e.value);
            }}
            fontWeight="bold"
            fontSize="2xl"
            width="100%"
            paddingLeft="0.5rem"
            paddingRight="0.5rem"
          >
            <Editable.Area>
              <Editable.Input width="100%" />
              <Editable.Preview />
            </Editable.Area>
          </Editable.Root>
        </Card.Header>
        <Card.Body overflowY="auto" marginBottom="1rem">
          <LogConfigFieldSet object={logForm} />
        </Card.Body>
      </Card.Root>
    </div>
  );
}

export type logConfigFieldSetProps = JSX.HTMLAttributes<Element> & {
  object: object;
  sectionName?: string;
};

export function LogConfigFieldSet(props: logConfigFieldSetProps) {
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

  // Log config start condition list for select component
  const parseStartConditionList = logStartConditionList().map((condition) => {
    return { label: condition, value: condition };
  });
  const logStartConditions = createListCollection({
    items: parseStartConditionList,
  });

  // Log config start combinator list for select component
  const parseCombinatorList = logStartCombinatorList().map((condition) => {
    return { label: condition, value: condition };
  });
  const logStartCombinators = createListCollection({
    items: parseCombinatorList,
  });

  return (
    <For each={Object.entries(obj)}>
      {(entry, index) => {
        const key = entry[0];
        const value = entry[1];
        const keyArray = Array.from(key);
        const upperCaseKey = keyArray
          .map((char, i) => {
            if (i === 0) return char.toUpperCase();
            else if (keyArray[i - 1] === "_") return char.toUpperCase();
            else return char;
          })
          .toString()
          .replaceAll(",", "");

        if (typeof value == "object") {
          return (
            <>
              <fieldset
                style={{
                  "border-width": "1px",
                  padding: "1rem",
                  "padding-top": "0",
                  "margin-bottom": "1rem",
                  "border-radius": "0.5rem",
                  "margin-top": "0.5rem",
                }}
              >
                <legend>
                  <Text
                    fontWeight="bold"
                    opacity="50%"
                    size="lg"
                    userSelect="none"
                  >
                    {upperCaseKey}
                  </Text>
                </legend>
                <LogConfigFieldSet object={value} sectionName={key} />
              </fieldset>
            </>
          );
        }
        if (typeof value == "boolean") {
          return (
            <Checkbox
              checked={obj[key as keyof typeof obj]}
              onCheckedChange={(e) => {
                setObject(
                  key as keyof typeof obj,
                  // @ts-ignore : TSC unable to handle generic object type
                  // in store
                  e.checked,
                );
              }}
              onClick={(e) => {
                if (value as keyof typeof obj) {
                  setPrevCheckBoxIndex(null);
                  return;
                }
                !e.shiftKey
                  ? setPrevCheckBoxIndex(index())
                  : checkBoxShiftClick(index());
              }}
              style={{
                "margin-top": "0.2rem",
              }}
            >
              <Text fontWeight="light" userSelect="none">
                {!isNaN(Number(key))
                  ? `${props.sectionName} ${Number(key) + 1}`
                  : key}
              </Text>
            </Checkbox>
          );
        }
        if (typeof value === "number") {
          if (key === "_") return;
          return (
            <>
              <Stack
                direction="row"
                style={{
                  "margin-top": "0.5rem",
                }}
              >
                <Text
                  marginTop="0.3rem"
                  width="50%"
                  fontWeight="light"
                  userSelect="none"
                  marginLeft="0.5rem"
                >
                  <Show when={props.sectionName} fallback={upperCaseKey}>
                    {`${props.sectionName![0].toUpperCase()}${
                      props.sectionName!.slice(
                        1,
                        props.sectionName!.length,
                      )
                    } ${Number(key[0]) + 1}`}
                  </Show>
                </Text>
                <Input
                  value={Number(value)}
                  type="number"
                  onChange={(e) => {
                    setObject(
                      key as keyof typeof obj,
                      // @ts-ignore : TSC unable to handle generic object type
                      // in store
                      Number(e.target.value),
                    );
                  }}
                />
              </Stack>
            </>
          );
        }
        if (typeof value == "string") {
          return (
            <>
              <Text
                marginTop="0.5rem"
                marginLeft="0.2rem"
                userSelect="none"
                marginBottom="0.5rem"
              >
                {`${key[0].toUpperCase()}${key.slice(1, key.length)}`}
              </Text>
              <Select.Root
                positioning={{ sameWidth: true }}
                width="2xs"
                collection={key === "kind"
                  ? logStartConditions
                  : logStartCombinators}
                defaultValue={[value.toString()]}
                onValueChange={(v) => {
                  setObject(key as keyof typeof obj, v.items[0].label);
                }}
              >
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder={`Select ${key}`} />
                  </Select.Trigger>
                </Select.Control>
                <Select.Positioner>
                  <Select.Content>
                    <For
                      each={key === "kind"
                        ? logStartConditions.items
                        : logStartCombinators.items}
                    >
                      {(item) => (
                        <Select.Item item={item}>
                          <Select.ItemText>{item.label}</Select.ItemText>
                          <Select.ItemIndicator></Select.ItemIndicator>
                        </Select.Item>
                      )}
                    </For>
                  </Select.Content>
                </Select.Positioner>
              </Select.Root>
            </>
          );
        }
      }}
    </For>
  );
}
