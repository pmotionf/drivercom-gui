import { createSignal, For, JSX, Show } from "solid-js";
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
  const logFormPortId = portId();
  const logForm = props.jsonfile;

  async function logStart() {
    const logStart = Command.sidecar("binaries/drivercom", [
      `--port`,
      `${logFormPortId}`,
      `log.start`,
    ]);
    const output = await logStart.execute();
    console.log(output);
  }

  async function logStop() {
    const logStop = Command.sidecar("binaries/drivercom", [
      `--port`,
      `${logFormPortId}`,
      `log.stop`,
    ]);
    const output = await logStop.execute();
    console.log(output);
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
              disabled={logFormPortId.length <= 0}
              onClick={() => logStart()}
              variant={"outline"}
            >
              Log Start
            </Button>
            <Button
              disabled={logFormPortId.length <= 0}
              onClick={() => logStop()}
              variant={"outline"}
            >
              Log Stop
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
                    onClick={async () => {
                      const json_str = JSON.stringify(logForm, null, "  ");
                      const logSave = Command.sidecar("binaries/drivercom", [
                        `--port`,
                        `${logFormPortId}`,
                        `log.config.set`,
                        json_str,
                      ]);
                      const output = await logSave.execute();
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
