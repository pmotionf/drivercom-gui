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
import { Tooltip } from "./ui/tooltip";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  label: string;
  onLabelChange?: (label: string) => void;
  config: object;
  onCancel?: () => void;
  linked?: {
    axes: { isLinked: boolean; changedItemIndex: number };
    hallSensor: { isLinked: boolean; changedItemIndex: number };
  };
  onLinkedChange?: (
    status: {
      axes: { isLinked: boolean; changedItemIndex: number };
      hallSensor: { isLinked: boolean; changedItemIndex: number };
    },
  ) => void;
  accordionStatus?: { axes: string[]; hallSensor: string[] };
  onAccordionStatusChange?: (
    status: { axes: string[]; hallSensor: string[] },
  ) => void;
  onConfigChange?: () => void;
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
        <ConfigObject
          object={config}
          id_prefix={props.label}
          onItemChange={() => props.onConfigChange?.()}
          linked={props.linked}
          onLinkedChange={(linkedStatus) =>
            props.onLinkedChange?.(linkedStatus)}
          accordionStatus={props.accordionStatus}
          onAccordionStatusChange={(accordionStatus) =>
            props.onAccordionStatusChange?.(accordionStatus)}
        />
      </div>
    </div>
  );
}

type ConfigObjectProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id_prefix: string;
  object: object;
  accordionStatus?: { axes: string[]; hallSensor: string[] };
  onAccordionStatusChange?: (
    status: { axes: string[]; hallSensor: string[] },
  ) => void;
  linked?: {
    axes: { isLinked: boolean; changedItemIndex: number };
    hallSensor: { isLinked: boolean; changedItemIndex: number };
  };
  onLinkedChange?: (
    status: {
      axes: { isLinked: boolean; changedItemIndex: number };
      hallSensor: { isLinked: boolean; changedItemIndex: number };
    },
  ) => void;
  onItemChange?: () => void;
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
                    items={value}
                    onItemChange={() => props.onItemChange?.()}
                    id_prefix={props.id_prefix}
                    linked={props.linked
                      ? key === "axes"
                        ? props.linked.axes.isLinked
                        : key === "hall_sensors"
                        ? props.linked.hallSensor.isLinked
                        : false
                      : false}
                    linkedItemIndex={props.linked
                      ? key === "axes"
                        ? props.linked.axes.changedItemIndex
                        : key === "hall_sensors"
                        ? props.linked.hallSensor.changedItemIndex
                        : 0
                      : 0}
                    onLinkedChange={(linked, itemIndex) => {
                      if (key === "axes") {
                        props.onLinkedChange?.({
                          axes: {
                            isLinked: linked,
                            changedItemIndex: itemIndex,
                          },
                          hallSensor: props.linked ? props.linked.hallSensor : {
                            isLinked: false,
                            changedItemIndex: 0,
                          },
                        });
                      } else if (key === "hall_sensors") {
                        props.onLinkedChange?.({
                          axes: props.linked ? props.linked.axes : {
                            isLinked: false,
                            changedItemIndex: 0,
                          },
                          hallSensor: {
                            isLinked: linked,
                            changedItemIndex: itemIndex,
                          },
                        });
                      }
                    }}
                    accordionStatus={props.accordionStatus
                      ? key === "axes"
                        ? props.accordionStatus.axes
                        : key === "hall_sensors"
                        ? props.accordionStatus.hallSensor
                        : []
                      : []}
                    onAccordionStatusChange={(status) => {
                      if (key === "axes") {
                        props.onAccordionStatusChange?.({
                          axes: status,
                          hallSensor: props.accordionStatus
                            ? props.accordionStatus.hallSensor
                            : [],
                        });
                      }
                      if (key === "hall_sensors") {
                        props.onAccordionStatusChange?.({
                          axes: props.accordionStatus
                            ? props.accordionStatus.axes
                            : [],
                          hallSensor: status,
                        });
                      }
                    }}
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
                  accordionStatus={props.accordionStatus}
                  onItemChange={() => {
                    props.onItemChange?.();
                  }}
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
                    props.onItemChange?.();
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
  onItemChange?: () => void;
  accordionStatus?: string[];
  onAccordionStatusChange?: (accordionStatus: string[]) => void;
  linked?: boolean;
  linkedItemIndex?: number;
  onLinkedChange?: (isLink: boolean, index: number) => void;
};

function ConfigList(props: ConfigListProps) {
  const [, rest] = splitProps(props, ["items"]);

  const [items, setItems] = createStore<object[]>(props.items);

  // Store a deep copy string of the most recently edited item object. This is
  // necessary over storing e.g. the item index, as the signal that sets other
  // items to be a copy cannot depend on the `items` store itself. Depending
  // directly on the `items` store will cause an infinite effects loop.
  const [recentEditedItem, setRecentEditedItem] = createSignal<string>(
    props.linkedItemIndex ? JSON.stringify(items[props.linkedItemIndex]) : "",
  );

  createEffect(() => {
    if (props.linked) {
      if (recentEditedItem().length === 0) return;
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
      value={props.accordionStatus ? props.accordionStatus : []}
      onValueChange={(e) => {
        props.onAccordionStatusChange?.(e.value);
      }}
    >
      <For each={props.items}>
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
                        props.onLinkedChange?.(!props.linked, index());
                        if (!props.linked) return;
                        setRecentEditedItem(JSON.stringify(item));
                      }}
                      marginTop="0.5rem"
                    >
                      <Show when={props.linked} fallback={<IconLinkOff />}>
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
                    props.onLinkedChange?.(
                      props.linked ? props.linked : false,
                      index(),
                    );
                    props.onItemChange?.();
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
