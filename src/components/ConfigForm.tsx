import { createSignal, For, JSX, splitProps } from "solid-js";
import { createStore } from "solid-js/store";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

import { Accordion } from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";

import { Menu } from "./ui/menu";
import { portId, setRecentConfigFilePaths } from "~/GlobalState";
import { ErrorMessage } from "~/pages/LogViewer/LogViewerTab";
import { Command } from "@tauri-apps/plugin-shell";
import { Stack } from "styled-system/jsx";
import { Card } from "./ui/card";
import { Text } from "./ui/text";
import { Editable } from "./ui/editable";
import { IconButton } from "./ui/icon-button";
import { IconChevronDown, IconX } from "@tabler/icons-solidjs";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  label: string;
  config: object;
  onErrorMessage?: (msg: ErrorMessage) => void;
  onCancel?: () => void;
};

export function ConfigForm(props: ConfigFormProps) {
  const [config] = createStore(props.config);
  const [fileName, setFileName] = createSignal<string>(props.label);

  async function saveLogAsFile() {
    const json_str = JSON.stringify(config, null, "  ");
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
        description: "The specified file extension is invalid.",
        type: "error",
      });
      return;
    }

    await writeTextFile(path, json_str);
    setRecentConfigFilePaths((prev) => {
      const newRecentFiles = prev.filter((prevFilePath) =>
        prevFilePath !== path
      );
      return [path, ...newRecentFiles];
    });
  }

  async function saveLogToPort() {
    if (portId().length === 0) return;
    const json_str = JSON.stringify(config, null, "  ");
    const logSave = Command.sidecar("binaries/drivercom", [
      `--port`,
      portId(),
      `config.set`,
      json_str,
    ]);
    await logSave.execute();
  }

  return (
    <div style={{ width: "40rem", "margin-bottom": "3rem" }}>
      <Card.Root padding={"0.5rem"}>
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
              <Editable.Input width={"90%"} />
              <Editable.Preview />
            </Editable.Area>
          </Editable.Root>
          <IconButton
            onClick={() => props.onCancel?.()}
            variant="ghost"
            borderRadius="1rem"
            width="1rem"
            style={{ position: "absolute", top: "1.5rem", right: "1.5rem" }}
            padding="0"
          >
            <IconX />
          </IconButton>
        </Card.Header>
        <Card.Body marginTop={"1rem"}>
          <ConfigObject object={config} id_prefix={props.label} />
        </Card.Body>
        <Card.Footer>
          <Stack direction={"row-reverse"}>
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
                    onClick={() => saveLogAsFile()}
                    userSelect="none"
                  >
                    Save as file
                  </Menu.Item>
                  <Menu.Separator />
                  <Menu.Item
                    value={"Save to port"}
                    disabled={portId().length === 0}
                    onClick={() => saveLogToPort()}
                    userSelect="none"
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

type ConfigObjectProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id_prefix: string;
  object: object;
};

function ConfigObject(props: ConfigObjectProps) {
  const [object, setObject] = createStore(props.object);

  return (
    <div>
      <For each={Object.entries(object)}>
        {(entry) => {
          const key = entry[0];
          const value = entry[1];
          if (value.constructor === Array) {
            return (
              <>
                <Stack
                  style={{
                    "border-width": "1px",
                    "padding-right": "1rem",
                    "padding-left": "1rem",
                    "margin-top": "1rem",
                    "border-radius": "0.5rem",
                    "margin-bottom": "0.5rem",
                    "padding-bottom": "0.5rem",
                  }}
                >
                  <ConfigList
                    label={key}
                    list={value}
                    id_prefix={props.id_prefix}
                  />
                </Stack>
              </>
            );
          }
          if (typeof value === "object") {
            return (
              <Stack
                /*style={{
                  "border-width": "1px",
                  padding: "1rem",
                  "margin-top": "1rem",
                  "border-radius": "0.5rem",
                  "margin-bottom": "0.5rem",
                }}*/
              >
                <fieldset
                  style={{
                    "border-width": "1px",
                    padding: "1rem",
                    "padding-top": "0",
                    "margin-bottom": "1rem",
                    "border-radius": "0.5rem",
                    "margin-top": "1rem",
                  }}
                >
                  <legend>
                    <Text
                      fontWeight={"bold"}
                      opacity={"70%"}
                    >
                      {`${key[0].toUpperCase()}${key.slice(1, key.length)}`}
                    </Text>
                  </legend>
                  <ConfigObject
                    object={value}
                    id_prefix={props.id_prefix + key}
                    style={{ "padding-left": "1rem" }}
                  />
                </fieldset>
              </Stack>
            );
          }
          if (typeof value === "boolean") {
            return (
              <Checkbox
                id={props.id_prefix + key}
                checked={object[key as keyof typeof object]}
                onCheckedChange={(e) => {
                  setObject(
                    key as keyof typeof object,
                    // @ts-ignore: TSC unable to handle generic object type
                    // in store
                    e.checked,
                  );
                }}
                marginTop={"1rem"}
              >
                <Text fontWeight={"light"} userSelect={"none"}>
                  {key}
                </Text>
              </Checkbox>
            );
          }
          if (typeof value === "number") {
            return (
              <Stack
                direction={"row"}
                width={"100%"}
                marginTop={"1rem"}
                marginBottom={"0.5rem"}
              >
                <Text width={"50%"} marginTop={"0.4rem"} fontWeight={"light"}>
                  {key}
                </Text>
                <Input
                  width={"50%"}
                  placeholder={key}
                  value={object[key as keyof typeof object]}
                  onChange={(e) => {
                    setObject(
                      key as keyof typeof object,
                      // @ts-ignore: TSC unable to handle generic object type
                      // in store
                      Number(e.target.value),
                    );
                  }}
                />
              </Stack>
            );
          }
        }}
      </For>
    </div>
  );
}

type ConfigListProps = Accordion.RootProps & {
  id_prefix: string;
  label: string;
  list: object[];
};

function ConfigList(props: ConfigListProps) {
  const [, rest] = splitProps(props, ["list"]);

  const [list] = createStore(props.list);

  return (
    <Accordion.Root
      multiple
      {...rest}
      style={{ "border-bottom": "0", "border-top": "0" }}
    >
      <For each={list}>
        {(item, index) => {
          const title = props.label + " " + (index() + 1).toString();
          return (
            <Accordion.Item value={props.id_prefix + title}>
              <Accordion.ItemTrigger>
                <Text fontWeight={"bold"} size={"md"} opacity={"70%"}>
                  {title}
                </Text>
                <Accordion.ItemIndicator>
                  <IconChevronDown />
                </Accordion.ItemIndicator>
              </Accordion.ItemTrigger>
              <Accordion.ItemContent
                padding={"0"}
              >
                <ConfigObject
                  object={item}
                  id_prefix={props.id_prefix + title}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
