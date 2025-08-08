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

import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text.tsx";
import { IconButton } from "./ui/icon-button.tsx";
import {
  IconChevronDown,
  IconLink,
  IconLinkOff,
  IconLock,
  IconLockOff,
  IconExclamationCircle,
} from "@tabler/icons-solidjs";
import { Tooltip } from "./ui/tooltip.tsx";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  config: object;
  label: string;
  accordionStatuses: AccordionStatuses;
  linkedStatuses: LinkedStatuses;
  gainLockStatuses: GainLockStatuses;
};

export type AccordionStatuses = Map<
  string,
  [Accessor<string[]>, Setter<string[]>]
>;

export type LinkedStatuses = Map<
  string,
  [Accessor<[boolean, number]>, Setter<[boolean, number]>]
>;

export type GainLockStatuses = Map<
  string,
  [Accessor<boolean>, Setter<boolean>]
>;

export function ConfigForm(props: ConfigFormProps) {
  const [config, setConfig] = createStore(props.config);

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
          if (props.gainLockStatuses.get(`${dynPos}.gain.current.p`)![0]())
            return;
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
          if (props.gainLockStatuses.get(`${dynPos}.gain.current.i`)![0]())
            return;

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
          if (props.gainLockStatuses.get(`${dynPos}.gain.velocity.p`)![0]())
            return;

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
          if (props.gainLockStatuses.get(`${dynPos}.gain.velocity.i`)![0]())
            return;
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
          if (props.gainLockStatuses.get(`${dynPos}.gain.position.p`)![0]())
            return;
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
        accordionStatuses={props.accordionStatuses}
        linkedStatuses={props.linkedStatuses}
        gainLockStatuses={props.gainLockStatuses}
        gainKinds={dynamic}
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
  gainLockStatuses: GainLockStatuses;
  gainKinds: string[];
  gainKey?: string;
};

function ConfigObject(props: ConfigObjectProps) {
  const [object, setObject] = createStore(props.object);

  function getComputedCSSVariableValue(variable: string) {
    let value = getComputedStyle(document.documentElement).getPropertyValue(
      variable,
    );

    while (value.startsWith("var(")) {
      // Extract the name of the referenced variable
      const referencedVarName = value.slice(4, value.length - 1);
      value = getComputedStyle(document.documentElement).getPropertyValue(
        referencedVarName,
      );
    }

    return value.trim();
  }

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
                    gainLockStatuses={props.gainLockStatuses}
                    gainKinds={props.gainKinds}
                  />
                </Stack>
              </>
            );
          }
          if (typeof value === "object") {
            let gainkey = props.gainKey ? props.gainKey : "";
            if (gainkey.length !== 0) {
              gainkey = `${props.gainKey}.${key}`;
            }

            const index = props.gainKinds.indexOf(key.toLowerCase());

            if (index !== -1) {
              gainkey = `${props.gainKinds[index]}`;
              if (
                !props.gainLockStatuses.has(gainkey) &&
                Object.keys(value).includes("gain")
              ) {
                props.gainLockStatuses.set(
                  `${gainkey}.gain`,
                  createSignal<boolean>(false),
                );
              }
            }
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
                <legend style={{ display: "flex" }}>
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
                  <Show
                    when={
                      props.gainLockStatuses.has(`${key}.gain`) &&
                      Object.keys(value).includes("gain")
                    }
                  >
                    <IconButton
                      size="sm"
                      width="1rem"
                      height="min-content"
                      paddingTop="0.2rem"
                      paddingBottom="0.2rem"
                      variant="ghost"
                      opacity={
                        props.gainLockStatuses.get(`${key}.gain`)![0]()
                          ? "1"
                          : "0.5"
                      }
                      onClick={() => {
                        const lockStatus = props.gainLockStatuses.get(
                          `${key}.gain`,
                        )![0]();
                        const mapKeys = Array.from(
                          props.gainLockStatuses.keys(),
                        ).filter((mapKey) => mapKey.includes(`${key}.gain`));
                        mapKeys.forEach((mapKey) => {
                          props.gainLockStatuses.get(mapKey)![1](!lockStatus);
                        });
                      }}
                    >
                      <Show
                        when={props.gainLockStatuses.get(`${key}.gain`)![0]()}
                        fallback={<IconLockOff />}
                      >
                        <IconLock />
                      </Show>
                    </IconButton>
                  </Show>
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
                  gainLockStatuses={props.gainLockStatuses}
                  gainKinds={props.gainKinds}
                  gainKey={gainkey}
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
            let lockStatusKey = "";
            const lockStatus = props.gainLockStatuses;
            if (
              props.gainKey &&
              props.gainKey.length !== 0 &&
              !props.gainKinds.includes(props.gainKey)
            ) {
              if (key.toLowerCase() === "p" || key.toLowerCase() === "i") {
                lockStatusKey = `${props.gainKey}.${key}`;
                if (!lockStatus.has(lockStatusKey)) {
                  lockStatus.set(lockStatusKey, createSignal<boolean>(false));
                }
              }
            }

            let divRef: HTMLDivElement | undefined;

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
                <Stack
                  ref={divRef}
                  style={{
                    width: "50%",
                    padding: "0.4rem",
                    "padding-right": "0.2rem",
                    "border-radius": "0.5rem",
                    "border-width": "1px",
                    gap: "0",
                  }}
                  borderColor={Number.isFinite(value) ? "bg.disabled" : "red"}
                  direction="row"
                >
                  <input
                    style={{
                      width: lockStatus.has(lockStatusKey)
                        ? `calc(100% - 2rem)`
                        : "100%",
                      outline: "none",
                      opacity: lockStatus.has(lockStatusKey)
                        ? lockStatus.get(lockStatusKey)![0]()
                          ? "0.4"
                          : "1"
                        : "1",
                    }}
                    disabled={
                      lockStatus.has(lockStatusKey)
                        ? lockStatus.get(lockStatusKey)![0]()
                        : false
                    }
                    onFocusIn={() => {
                      divRef!.style.borderWidth = "2px";
                      divRef!.style.borderColor = getComputedCSSVariableValue(
                        "--colors-accent-default",
                      );
                    }}
                    onFocusOut={() => {
                      divRef!.style.borderWidth = "1px";
                      divRef!.style.borderColor = getComputedCSSVariableValue(
                        "--colors-bg-disabled",
                      );
                    }}
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
                  <Show when={!Number.isFinite(value)}>
                    <IconExclamationCircle color="red" />
                  </Show>
                  <Show when={lockStatus.has(lockStatusKey)}>
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      borderRadius="3rem"
                      height="min-content"
                      paddingTop="0.2rem"
                      paddingBottom="0.2rem"
                      opacity={
                        lockStatus.get(lockStatusKey)![0]() ? "1" : "0.5"
                      }
                      onClick={() => {
                        lockStatus.get(lockStatusKey)![1](
                          !lockStatus.get(lockStatusKey)![0](),
                        );

                        const split = lockStatusKey.split(".");
                        const includingKeys = `${split[0]}.${split[1]}.`;
                        const mapValues = Array.from(
                          props.gainLockStatuses.entries(),
                        )
                          .filter((entries) =>
                            entries[0].includes(includingKeys),
                          )
                          .map((entries) => entries[1][0]());
                        const parseValues = [...new Set(mapValues)];
                        if (parseValues.length !== 1) {
                          lockStatus.get(includingKeys.slice(0, -1))![1](true);
                        } else {
                          lockStatus.get(includingKeys.slice(0, -1))![1](
                            parseValues[0],
                          );
                        }
                      }}
                    >
                      <Show
                        when={lockStatus.get(lockStatusKey)![0]()}
                        fallback={<IconLockOff />}
                      >
                        <IconLock />
                      </Show>
                    </IconButton>
                  </Show>
                </Stack>
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
  gainLockStatuses: GainLockStatuses;
  gainKinds: string[];
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
                  gainLockStatuses={props.gainLockStatuses}
                  gainKinds={props.gainKinds}
                />
              </Accordion.ItemContent>
            </Accordion.Item>
          );
        }}
      </For>
    </Accordion.Root>
  );
}
