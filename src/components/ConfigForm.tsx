import {
  type Accessor,
  createEffect,
  createSignal,
  For,
  JSX,
  type Setter,
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
};

type AccordionStatuses = Map<string, [Accessor<string[]>, Setter<string[]>]>;

type LinkedStatuses = Map<
  string,
  [Accessor<[boolean, number]>, Setter<[boolean, number]>]
>;

export function ConfigForm(props: ConfigFormProps) {
  const [config, setConfig] = createStore(props.config);
  createSignal;

  const accordionStatuses: AccordionStatuses = new Map();
  const linkedStatuses: LinkedStatuses = new Map();

  createEffect(() => {
    const axes = config["axes" as keyof typeof config];
    const newAxes: object[] = axes;

    const rs = getValueFromObject(config, "coil", "rs");
    const ls = getValueFromObject(config, "coil", "ls");

    const pitch = getValueFromObject(config, "magnet", "pitch");
    const mass = getValueFromObject(config, "carrier", "mass");
    const kf = getValueFromObject(config, "coil", "kf");

    const updatedCurrentPAxesArray = typeof ls === "number"
      ? updateAxesArrayCurrentP(ls, newAxes)
      : newAxes;
    const updatedCurrentIAxesArray = typeof rs === "number"
      ? updateAxesArrayCurrentI(rs, updatedCurrentPAxesArray)
      : updatedCurrentPAxesArray;
    const updatedVelocityPAxesArray = typeof pitch === "number" &&
        typeof mass === "number" &&
        typeof kf === "number"
      ? updateAxesArrayVelocityP(pitch, mass, kf, updatedCurrentIAxesArray)
      : updatedCurrentIAxesArray;
    const updatedVelocityIAxesArray = updateAxesArrayVelocityI(
      updatedVelocityPAxesArray,
    );
    const updatedPositionPAxesArray = updateAxesArrayPosition(
      updatedVelocityIAxesArray,
    );

    if (JSON.stringify(updatedPositionPAxesArray) !== JSON.stringify(newAxes)) {
      setConfig({
        ...config,
        axes: updatedPositionPAxesArray,
      });
    }
  });

  function getValueFromObject(
    config: object,
    parent: string,
    child?: string,
  ): object | number | null {
    if (Object.keys(config).includes(parent)) {
      const parentValue = Object.entries(config)
        .filter((key) => key[0] === parent)
        .pop()![1];

      if (typeof parentValue === "object") {
        return child ? getValueFromObject(parentValue, child) : parentValue;
      } else if (typeof parentValue === "number") {
        return parentValue;
      } else {
        return null;
      }
    }
    return null;
  }

  function calcCurrentP(denominator: number, ls: number) {
    const wcc = 2.0 * Math.PI * (15000.0 / denominator);
    const p = wcc * ls;
    return p;
  }

  function calcCurrentI(denominator: number, rs: number) {
    const wcc = 2.0 * Math.PI * (15000.0 / denominator);
    const i = wcc * rs;
    return i;
  }

  function calcVelocityP(
    denominator: number,
    currentDenominator: number,
    pitch: number,
    mass: number,
    kf: number,
  ): number {
    const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);
    const radius = pitch / (2.0 * Math.PI);
    const inertia = (mass / 100) * radius * radius;
    const torque_constant = kf * radius;

    const wsc = wcc / denominator;
    const p = (inertia * wsc) / torque_constant;

    return p;
  }

  function calcVelocityI(
    denominator: number,
    denominator_pi: number,
    currentDenominator: number,
    p: number,
  ): number {
    const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);
    const wsc = wcc / denominator;
    const wpi = wsc / denominator_pi;

    const i = p * wpi;

    return i;
  }

  function calcPositionP(
    currentDenominator: number,
    velocityDenominator: number,
    positionDenominator: number,
  ) {
    const wcc = 2.0 * Math.PI * (15000.0 / currentDenominator);
    const wsc = wcc / velocityDenominator;

    const wpc = wsc / positionDenominator;
    const p = wpc;
    return p;
  }

  function updateAxesArrayCurrentI(rs: number, axes: object[]): object[] {
    const updateAxes = axes.map((axis) => {
      const gain: object = axis["gain" as keyof typeof axis];
      const denominator = getValueFromObject(gain, "current", "denominator");
      const p = getValueFromObject(gain, "current", "p");
      if (!denominator || typeof denominator === "object") return axis;

      const i = calcCurrentI(denominator, rs);

      return {
        gain: {
          ...gain,
          current: {
            p: p,
            i: isNaN(i) ? "NaN" : i,
            denominator: denominator,
          },
        },
      };
    });
    return updateAxes;
  }

  function updateAxesArrayCurrentP(ls: number, axes: object[]): object[] {
    const updateAxes = axes.map((axis) => {
      const gain: object = axis["gain" as keyof typeof axis];
      const denominator = getValueFromObject(gain, "current", "denominator");
      const i = getValueFromObject(gain, "current", "i");

      if (!denominator || typeof denominator === "object") return axis;

      const p = calcCurrentP(denominator, ls);
      return {
        gain: {
          ...gain,
          current: {
            p: isNaN(p) ? "NaN" : p,
            i: i,
            denominator: denominator,
          },
        },
      };
    });
    return updateAxes;
  }

  function updateAxesArrayVelocityP(
    pitch: number,
    mass: number,
    kf: number,
    axes: object[],
  ): object[] {
    const updateAxes = axes.map((axis) => {
      const gain: object = axis["gain" as keyof typeof axis];
      const denominator = getValueFromObject(gain, "velocity", "denominator");
      const i = getValueFromObject(gain, "velocity", "i");
      const denominator_pi = getValueFromObject(
        gain,
        "velocity",
        "denominator_pi",
      );
      const currentDenominator = getValueFromObject(
        gain,
        "current",
        "denominator",
      );

      if (
        !denominator ||
        !currentDenominator ||
        typeof denominator === "object" ||
        typeof currentDenominator === "object"
      ) {
        return axis;
      }

      const p = calcVelocityP(denominator, currentDenominator, pitch, mass, kf);

      return {
        gain: {
          ...gain,
          velocity: {
            p: isNaN(p) ? "NaN" : p,
            i: i,
            denominator: denominator,
            denominator_pi: denominator_pi,
          },
        },
      };
    });
    return updateAxes;
  }

  function updateAxesArrayVelocityI(axes: object[]): object[] {
    const updateAxes = axes.map((axis) => {
      const gain: object = axis["gain" as keyof typeof axis];
      const denominator = getValueFromObject(gain, "velocity", "denominator");
      const denominator_pi = getValueFromObject(
        gain,
        "velocity",
        "denominator_pi",
      );
      const currentDenominator = getValueFromObject(
        gain,
        "current",
        "denominator",
      );
      const p = getValueFromObject(gain, "velocity", "p");

      if (!denominator || !currentDenominator || !denominator_pi || !p) {
        return axis;
      }
      if (
        typeof denominator === "object" ||
        typeof denominator_pi === "object" ||
        typeof currentDenominator === "object" ||
        typeof p === "object"
      ) {
        return axis;
      }
      const i = calcVelocityI(
        denominator,
        denominator_pi,
        currentDenominator,
        p,
      );

      return {
        gain: {
          ...gain,
          velocity: {
            p: p,
            i: isNaN(i) ? "NaN" : i,
            denominator: denominator,
            denominator_pi: denominator_pi,
          },
        },
      };
    });
    return updateAxes;
  }

  function updateAxesArrayPosition(axes: object[]): object[] {
    const updateAxes = axes.map((axis) => {
      const gain: object = axis["gain" as keyof typeof axis];
      const currentDenominator = getValueFromObject(
        gain,
        "current",
        "denominator",
      );
      const velocityDenominator = getValueFromObject(
        gain,
        "velocity",
        "denominator",
      );
      const positionDenominator = getValueFromObject(
        gain,
        "position",
        "denominator",
      );

      if (!currentDenominator || !velocityDenominator || !positionDenominator) {
        return axis;
      }
      if (
        typeof currentDenominator === "object" ||
        typeof velocityDenominator === "object" ||
        typeof positionDenominator === "object"
      ) {
        return axis;
      }

      const p = calcPositionP(
        currentDenominator,
        velocityDenominator,
        positionDenominator,
      );

      return {
        gain: {
          ...gain,
          position: {
            p: isNaN(p) ? "NaN" : p,
            denominator: positionDenominator,
          },
        },
      };
    });

    return updateAxes;
  }

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
          accordionStatuses={accordionStatuses}
          linkedStatuses={linkedStatuses}
        />
      </div>
    </div>
  );
}

type ConfigObjectProps = JSX.HTMLAttributes<HTMLDivElement> & {
  id_prefix: string;
  object: object;
  onItemChange?: () => void;
  accordionStatuses: AccordionStatuses;
  linkedStatuses: LinkedStatuses;
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
            if (!props.accordionStatuses.has(key)) {
              props.accordionStatuses.set(key, createSignal<string[]>([]));
            }
            if (!props.linkedStatuses.has(key)) {
              props.linkedStatuses.set(
                key,
                createSignal<[boolean, number]>([false, 0]),
              );
            }
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
                    accordionStatuses={props.accordionStatuses}
                    linkedStatuses={props.linkedStatuses}
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
                  onItemChange={() => {
                    props.onItemChange?.();
                  }}
                  accordionStatuses={props.accordionStatuses}
                  linkedStatuses={props.linkedStatuses}
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
          if (typeof value === "number" || value === "NaN") {
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
  accordionStatuses: AccordionStatuses;
  linkedStatuses: LinkedStatuses;
};

function ConfigList(props: ConfigListProps) {
  const [, rest] = splitProps(props, ["items"]);

  const [items, setItems] = createStore<object[]>(props.items);

  // Store a deep copy string of the most recently edited item object. This is
  // necessary over storing e.g. the item index, as the signal that sets other
  // items to be a copy cannot depend on the `items` store itself. Depending
  // directly on the `items` store will cause an infinite effects loop.
  const [recentEditedItem, setRecentEditedItem] = createSignal<string>("");

  const changedItemIndex = props.linkedStatuses.get(props.label)?.[0]()[1];
  if (changedItemIndex !== undefined) {
    setRecentEditedItem(JSON.stringify(items[changedItemIndex]));
  }

  createEffect(() => {
    if (props.linkedStatuses.get(props.label)?.[0]()[0]) {
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
      value={props.accordionStatuses.get(props.label)?.[0]()}
      onValueChange={(e) => {
        props.accordionStatuses.get(props.label)?.[1](e.value);
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
                        const linked = props.linkedStatuses.get(
                          props.label,
                        )?.[0]()[0];

                        props.linkedStatuses.get(props.label)?.[1]([
                          !linked,
                          index(),
                        ]);

                        if (!props.linkedStatuses.get(props.label)?.[0]()) {
                          return;
                        }
                        setRecentEditedItem(JSON.stringify(item));
                      }}
                      marginTop="0.5rem"
                    >
                      <Show
                        when={props.linkedStatuses.get(props.label)?.[0]()[0]}
                        fallback={<IconLinkOff />}
                      >
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
                    props.onItemChange?.();
                    const linked = props.linkedStatuses.get(
                      props.label,
                    )?.[0]()[0];
                    if (linked) {
                      props.linkedStatuses.get(props.label)?.[1]([
                        linked,
                        index(),
                      ]);
                    }
                  }}
                  accordionStatuses={props.accordionStatuses}
                  linkedStatuses={props.linkedStatuses}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
