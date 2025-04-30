import {
  createEffect,
  createSignal,
  For,
  JSX,
  Show,
  splitProps,
} from "solid-js";
import { createStore } from "solid-js/store";

import { Accordion } from "~/components/ui/accordion.tsx";
import { Checkbox } from "~/components/ui/checkbox.tsx";
import { Input } from "~/components/ui/input.tsx";
//@ts-ignore test
import { Stack } from "styled-system/jsx/index.mjs";
import { Text } from "./ui/text.tsx";
import { Editable } from "./ui/editable.tsx";
import { IconButton } from "./ui/icon-button.tsx";
import {
  IconChevronDown,
  IconLink,
  IconLinkOff,
  IconX,
} from "@tabler/icons-solidjs";
import { Tooltip } from "./ui/tooltip.tsx";

type CheckedState = boolean | "indeterminate";
interface CheckedChangeDetails {
  checked: CheckedState;
}

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
        onValueCommit={(e: { value: string }) => {
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
              display: "block",
              overflow: "hidden",
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
        <ConfigObject object={config} id_prefix={props.label} />
      </div>
    </div>
  );
}

type ConfigObjectProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id_prefix: string;
  object: object;
  onItemChange?: () => void;
};

function ConfigObject(props: ConfigObjectProps) {
  const [object, setObject] = createStore(props.object);

  createEffect(() => {
    const parseObject = JSON.stringify(object);
    if (parseObject.length === 0) return;
    props.onItemChange?.();
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
                    items={value}
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
                  <Text fontWeight="bold" opacity="70%">
                    {`${key[0].toUpperCase()}${
                      Array.from(
                        key.slice(1, key.length),
                      )
                        .map((char, index) => {
                          if (key[index] === "_") {
                            return char.toUpperCase();
                          }
                          return char;
                        })
                        .toString()
                        .replaceAll(",", "")
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
              //@ts-ignore Need to change not use ts-ignore
              <Checkbox
                id={props.id_prefix + key}
                checked={object[key as keyof typeof object]}
                onCheckedChange={(e: CheckedChangeDetails) => {
                  setObject({
                    ...object,
                    [key]: e.checked,
                  });
                }}
                style={{ "margin-top": "1rem" }}
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
                  onChange={(e: { target: { value: string } }) => {
                    if (isNaN(Number(e.target.value))) {
                      if (e.target.value.toLowerCase() !== "nan") {
                        e.target.value = String(
                          object[key as keyof typeof object],
                        );
                        return;
                      }
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
  items: object[];
};

function ConfigList(props: ConfigListProps) {
  const [, rest] = splitProps(props, ["items"]);

  const [items, setItems] = createStore<object[]>(props.items);

  const [openedAccordionItems, setOpenedAccordionItems] = createSignal<
    string[]
  >([]);

  const [linked, setLinked] = createSignal<boolean>(false);
  // Store a deep copy string of the most recently edited item object. This is
  // necessary over storing e.g. the item index, as the signal that sets other
  // items to be a copy cannot depend on the `items` store itself. Depending
  // directly on the `items` store will cause an infinite effects loop.
  const [recentEditedItem, setRecentEditedItem] = createSignal<string>("");

  createEffect(() => {
    if (linked()) {
      setItems(
        Array.from(
          { length: items.length },
          () => JSON.parse(recentEditedItem()),
        ),
      );
    }
  });

  // Converts label to have uppercase letters at the start of each word.
  const prettifiedLabel = Array.from(props.label)
    .map((char, i) => {
      if (typeof char !== "string") return char;

      if (i === 0) return char.toUpperCase();
      else if (props.label[i - 1] === "_") return char.toUpperCase();
      else return char;
    })
    .toString()
    .replaceAll(",", "");

  return (
    <Accordion.Root
      multiple
      {...rest}
      style={{ "border-bottom": "0", "border-top": "0" }}
      value={openedAccordionItems()}
      onValueChange={(e: { value: string[] }) =>
        setOpenedAccordionItems(e.value)}
    >
      <For each={items}>
        {(item, index) => {
          const title = props.label + " " + (index() + 1).toString();
          return (
            <Accordion.Item value={title}>
              <Stack direction="row">
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <IconButton
                      variant="ghost"
                      onClick={() => {
                        setLinked(!linked());
                        if (!linked()) return;
                        setRecentEditedItem(JSON.stringify(item));
                      }}
                      marginTop="0.5rem"
                    >
                      <Show when={linked()} fallback={<IconLinkOff />}>
                        <IconLink />
                      </Show>
                    </IconButton>
                  </Tooltip.Trigger>

                  <Tooltip.Positioner>
                    <Tooltip.Content backgroundColor="bg.default">
                      <Text color="fg.default">
                        Link {`${prettifiedLabel}`}
                      </Text>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
                <Accordion.ItemTrigger>
                  <Text fontWeight="bold" size="md" opacity="70%">
                    {`${title[0].toUpperCase()}${
                      Array.from(
                        title.slice(1, title.length),
                      )
                        .map((char, index) => {
                          if (title[index] === "_") {
                            return char.toUpperCase();
                          }
                          return char;
                        })
                        .toString()
                        .replaceAll(",", "")
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
                  onItemChange={() => {
                    setRecentEditedItem(JSON.stringify(item));
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
