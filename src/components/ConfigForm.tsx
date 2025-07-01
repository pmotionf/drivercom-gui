import {
  type Accessor,
  createEffect,
  createSignal,
  For,
  JSX,
  on,
  type Setter,
  Show,
  splitProps,
} from "solid-js";
import { createStore } from "solid-js/store";

import { Accordion } from "~/components/ui/accordion.tsx";
import { Checkbox } from "~/components/ui/checkbox.tsx";
import { Input } from "~/components/ui/input.tsx";

import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text.tsx";
import { IconButton } from "./ui/icon-button.tsx";
import { IconChevronDown, IconLink, IconLinkOff } from "@tabler/icons-solidjs";
import { Tooltip } from "./ui/tooltip.tsx";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  config: object;
  label: string;
};

type AccordionStatuses = Map<string, [Accessor<string[]>, Setter<string[]>]>;

type LinkedStatuses = Map<
  string,
  [Accessor<[boolean, number]>, Setter<[boolean, number]>]
>;

export function ConfigForm(props: ConfigFormProps) {
  const [config, setConfig] = createStore(props.config);
  const accordionStatuses: AccordionStatuses = new Map();
  const linkedStatuses: LinkedStatuses = new Map();

  const dynamic = ["center", "between"];

  // Center gain
  dynamic.forEach((dynPos) => {
    if (
      !("axis" in config) ||
      !(dynPos in (config.axis as object)) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("gain" in config.axis[dynPos]) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("current" in config.axis[dynPos].gain) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("denominator" in config.axis[dynPos].gain.current) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("p" in config.axis[dynPos].gain.current) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("i" in config.axis[dynPos].gain.current) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("velocity" in config.axis[dynPos].gain) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("denominator" in config.axis[dynPos].gain.velocity) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("denominator_pi" in config.axis[dynPos].gain.velocity) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("p" in config.axis[dynPos].gain.velocity) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("i" in config.axis[dynPos].gain.velocity) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("position" in config.axis[dynPos].gain) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("denominator" in config.axis[dynPos].gain.position) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("p" in config.axis[dynPos].gain.position) ||
      !("coil" in config) ||
      !(dynPos in (config.coil as object)) ||
      //@ts-ignore dynPos guaranteed to exist from above check
      !("kf" in (config.coil[dynPos] as object)) ||
      !("ls" in (config.coil as object)) ||
      !("rs" in (config.coil as object)) ||
      !("magnet" in config) ||
      !("pitch" in (config.magnet as object)) ||
      !("carrier" in config) ||
      !("mass" in (config.carrier as object))
    ) {
      return;
    }

    // Current P
    createEffect(
      on(
        [
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.current.denominator,
          //@ts-ignore Guaranteed to exist from above check
          () => config.coil.ls,
        ],
        () => {
          const p = calcCurrentP(
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.current.denominator,
            //@ts-ignore Guaranteed to exist from above check
            config.coil.ls,
          );
          //@ts-ignore Below fields guaranteed to exist due to above checks
          setConfig("axis", dynPos, "gain", "current", "p", p);
        },
        { defer: true },
      ),
    );

    // Current I
    createEffect(
      on(
        [
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.current.denominator,
          //@ts-ignore Guaranteed to exist from above check
          () => config.coil.rs,
        ],
        () => {
          const i = calcCurrentI(
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.current.denominator,
            //@ts-ignore Guaranteed to exist from above check
            config.coil.rs,
          );
          //@ts-ignore Below fields guaranteed to exist due to above checks
          setConfig("axis", dynPos, "gain", "current", "i", i);
        },
        { defer: true },
      ),
    );

    // Velocity P
    createEffect(
      on(
        [
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.velocity.denominator,
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.current.p,
          //@ts-ignore Guaranteed to exist from above check
          () => config.coil[dynPos].kf,
          //@ts-ignore Guaranteed to exist from above check
          () => config.carrier.mass,
          //@ts-ignore Guaranteed to exist from above check
          () => config.magnet.pitch,
        ],
        () => {
          const wcc = calcWcc(
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.current.p,
            //@ts-ignore Guaranteed to exist from above check
            config.coil.ls,
          );
          const p = calcVelocityP(
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.velocity.denominator,
            wcc,
            //@ts-ignore Guaranteed to exist from above check
            config.magnet.pitch,
            //@ts-ignore Guaranteed to exist from above check
            config.carrier.mass,
            //@ts-ignore Guaranteed to exist from above check
            config.coil[dynPos].kf,
          );
          //@ts-ignore Below fields guaranteed to exist due to above checks
          setConfig("axis", dynPos, "gain", "velocity", "p", p);
        },
        { defer: true },
      ),
    );

    // Velocity I
    createEffect(
      on(
        [
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.velocity.denominator,
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.velocity.denominator_pi,
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.current.denominator,
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.velocity.p,
        ],
        () => {
          const i = calcVelocityI(
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.velocity.denominator,
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.velocity.denominator_pi,
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.current.denominator,
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.velocity.p,
          );
          //@ts-ignore Below fields guaranteed to exist due to above checks
          setConfig("axis", dynPos, "gain", "velocity", "i", i);
        },
        { defer: true },
      ),
    );

    // Position P
    createEffect(
      on(
        [
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.position.denominator,
          //@ts-ignore Guaranteed to exist from above check
          () => config.axis[dynPos].gain.velocity.p,
        ],
        () => {
          const wsc = calcWsc(
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.velocity.p,
            //@ts-ignore Guaranteed to exist from above check
            config.magnet.pitch,
            //@ts-ignore Guaranteed to exist from above check
            config.carrier.mass,
            //@ts-ignore Guaranteed to exist from above check
            config.coil[dynPos].kf,
          );
          const p = calcPositionP(
            wsc,
            //@ts-ignore Guaranteed to exist from above check
            config.axis[dynPos].gain.position.denominator,
          );
          //@ts-ignore Below fields guaranteed to exist due to above checks
          setConfig("axis", dynPos, "gain", "position", "p", p);
        },
        { defer: true },
      ),
    );
  });

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

  function calcWcc(currentP: number, ls: number): number {
    const wcc = currentP / ls;
    return wcc;
  }

  function calcVelocityP(
    denominator: number,
    wcc: number,
    pitch: number,
    mass: number,
    kf: number,
  ): number {
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

  function calcWsc(velocityP: number, pitch: number, mass: number, kf: number) {
    const radius = pitch / (2.0 * Math.PI);
    const inertia = (mass / 100) * radius * radius;
    const torque_constant = kf * radius;

    const inertiaWsc = velocityP * torque_constant;
    const wsc = inertiaWsc / inertia;
    return wsc;
  }

  function calcPositionP(wsc: number, positionDenominator: number) {
    const wpc = wsc / positionDenominator;
    const p = wpc;
    return p;
  }

  return (
    <div
      style={{
        "overflow-y": "auto",
        width: "100%",
        "border-top-width": "1px",
        "border-bottom-width": "1px",
        "padding-bottom": "0.5rem",
      }}
    >
      <ConfigObject
        object={config}
        id_prefix={props.label}
        accordionStatuses={accordionStatuses}
        linkedStatuses={linkedStatuses}
      />
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
                    {`${key[0].toUpperCase()}${Array.from(
                      key.slice(1, key.length),
                    )
                      .map((char, index) => {
                        if (key[index] === "_") {
                          return char.toUpperCase();
                        }
                        return char;
                      })
                      .toString()
                      .replaceAll(",", "")}`}
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

  createEffect(
    on(
      () => JSON.stringify(items),
      () => {
        if (
          props.linkedStatuses.get(props.label) &&
          props.linkedStatuses.get(props.label)?.[0]()[1]
        ) {
          const index = props.linkedStatuses.get(props.label)![0]()[1];
          setRecentEditedItem(JSON.stringify(items[index]));
        }
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      [
        () => recentEditedItem(),
        () => props.linkedStatuses.get(props.label)?.[0]()[0],
      ],
      () => {
        if (!Array.isArray(items)) return;
        if (props.linkedStatuses.get(props.label)?.[0]()[0]) {
          items.forEach((_, index) => {
            const item = JSON.parse(recentEditedItem().replaceAll("null", "0"));
            if (index === props.linkedStatuses.get(props.label)?.[0]()[1]) {
              return;
            }
            setItems(index, item);
          });
        }
      },
      { defer: true },
    ),
  );

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
                    {`${title[0].toUpperCase()}${Array.from(
                      title.slice(1, title.length),
                    )
                      .map((char, index) => {
                        if (title[index] === "_") {
                          return char.toUpperCase();
                        }
                        return char;
                      })
                      .toString()
                      .replaceAll(",", "")}`}
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
