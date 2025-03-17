import {
  createEffect,
  createSignal,
  For,
  JSX,
  Show,
  splitProps,
} from "solid-js";
import { createStore } from "solid-js/store";

import { Accordion } from "~/components/ui/accordion";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";

import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text";
import { Editable } from "./ui/editable";
import { IconButton } from "./ui/icon-button";
import {
  IconChevronDown,
  IconLink,
  IconLinkOff,
  IconX,
} from "@tabler/icons-solidjs";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  label: string;
  onLabelChange?: (label: string) => void;
  config: object;
  onCancel?: () => void;
};

export function ConfigForm(props: ConfigFormProps) {
  const [config] = createStore(props.config);

  return (
    <div style={{ width: "100%", "margin-bottom": "3rem" }}>
      <Editable.Root
        placeholder="File name"
        defaultValue={props.label ? props.label : "New File"}
        activationMode="dblclick"
        onValueCommit={(e) => {
          props.onLabelChange?.(e.value);
        }}
        fontWeight="bold"
        fontSize="2xl"
      >
        <Editable.Area>
          <Editable.Input width="90%" />
          <Editable.Preview
            width="90%"
            style={{
              "text-overflow": "ellipsis",
              "display": "block",
              "overflow": "hidden",
              "text-align": "left",
            }}
          />
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
      <div style={{ "margin-top": "4rem", "margin-bottom": "2rem" }}>
        <ConfigObject
          object={config}
          id_prefix={props.label}
        />
      </div>
    </div>
  );
}

type ConfigObjectProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id_prefix: string;
  object: object;
  onObjChange?: () => void;
};

function ConfigObject(props: ConfigObjectProps) {
  const [object, setObject] = createStore(props.object);

  createEffect(() => {
    const parseObject = JSON.stringify(object);
    if (parseObject.length === 0) return;
    props.onObjChange?.();
  });

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
                    fontWeight="bold"
                    opacity="70%"
                  >
                    {`${key[0].toUpperCase()}${
                      Array.from(key.slice(1, key.length)).map(
                        (char, index) => {
                          if (key[index] === "_") {
                            return char.toUpperCase();
                          }
                          return char;
                        },
                      ).toString().replaceAll(",", "")
                    }`}
                  </Text>
                </legend>
                <ConfigObject
                  object={value}
                  id_prefix={props.id_prefix + key}
                  style={{ "padding-left": "1rem" }}
                />
              </fieldset>
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
                marginTop="1rem"
              >
                <Text fontWeight="light" userSelect="none">
                  {key}
                </Text>
              </Checkbox>
            );
          }
          if (typeof value === "number") {
            return (
              <Stack
                direction="row"
                width="100%"
                marginTop="1rem"
                marginBottom="0.5rem"
              >
                <Text width="50%" marginTop="0.4rem" fontWeight="light">
                  {key}
                </Text>
                <Input
                  width="50%"
                  placeholder={key}
                  value={object[key as keyof typeof object]}
                  onChange={(e) => {
                    if (isNaN(Number(e.target.value))) {
                      e.target.value = String(
                        object[key as keyof typeof object],
                      );
                      return;
                    }
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
  onListChange?: (list: object[]) => void;
};

function ConfigList(props: ConfigListProps) {
  const [, rest] = splitProps(props, ["list"]);

  const [list, setList] = createStore<object[]>(props.list);

  const [accordionValue, setAccordionValue] = createSignal<
    string[]
  >([]);

  const [link, setLink] = createSignal<boolean>(false);
  const [linkedObj, setLinkObj] = createSignal<string>("");

  createEffect(() => {
    const object = linkedObj();
    if (link()) {
      setList(Array.from({ length: list.length }, () => JSON.parse(object)));
    }
  });

  return (
    <Accordion.Root
      multiple
      {...rest}
      style={{ "border-bottom": "0", "border-top": "0" }}
      value={accordionValue()}
      onValueChange={(e) => setAccordionValue(e.value)}
    >
      <For each={list}>
        {(item, index) => {
          const title = props.label + " " + (index() + 1).toString();
          return (
            <Accordion.Item value={title}>
              <Stack direction="row">
                <IconButton
                  variant="ghost"
                  onClick={() => {
                    setLink(!link());
                    if (!link()) return;
                    setLinkObj(JSON.stringify(item));
                  }}
                  marginTop="0.5rem"
                >
                  <Show
                    when={link()}
                    fallback={<IconLinkOff />}
                  >
                    <IconLink />
                  </Show>
                </IconButton>
                <Accordion.ItemTrigger>
                  <Text fontWeight="bold" size="md" opacity="70%">
                    {`${title[0].toUpperCase()}${
                      Array.from(title.slice(1, title.length)).map(
                        (char, index) => {
                          if (title[index] === "_") {
                            return char.toUpperCase();
                          }
                          return char;
                        },
                      ).toString().replaceAll(",", "")
                    }`}
                  </Text>
                  <Accordion.ItemIndicator>
                    <IconChevronDown />
                  </Accordion.ItemIndicator>
                </Accordion.ItemTrigger>
              </Stack>
              <Accordion.ItemContent padding="0">
                <ConfigObject
                  object={item}
                  id_prefix={props.id_prefix + title}
                  onObjChange={() => {
                    setLinkObj(JSON.stringify(item));
                  }}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
