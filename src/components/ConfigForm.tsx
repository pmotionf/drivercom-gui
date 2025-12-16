import {
  type Accessor,
  createEffect,
  For,
  JSX,
  on,
  type Setter,
} from "solid-js";
import { createStore } from "solid-js/store";
import { AccordionStates, Form } from "./Form";
import { Tabs } from "./ui/tabs";
import { FormNumberInput } from "./Form/FormNumberInput";
import { FormCheckBox } from "./Form/FormCheckBox";
import { Stack } from "styled-system/jsx";
import JSON5 from "json5";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  id: string;
  description?: object;
  originalFile?: object;
  focusedTab?: string;
  onFocustTabChange?: (tabId: string) => void;
  config: object;
  accordionStatuses: AccordionStates;
  linkedStatuses: LinkStates;
  gainLockStatuses: GainLockStates;
};

export type LinkStates = Map<
  string,
  [Accessor<[boolean, string]>, Setter<[boolean, string]>]
>;

export type GainLockStates = Map<string, [Accessor<boolean>, Setter<boolean>]>;

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
          if (
            props.linkedStatuses.get("axis")![0]()[0] &&
            props.linkedStatuses.get("axis")![0]()[1] !== dynPos
          )
            return;
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
          if (
            props.linkedStatuses.get("axis")![0]()[0] &&
            props.linkedStatuses.get("axis")![0]()[1] !== dynPos
          )
            return;
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
          if (
            props.linkedStatuses.get("axis")![0]()[0] &&
            props.linkedStatuses.get("axis")![0]()[1] !== dynPos
          )
            return;
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
          if (
            props.linkedStatuses.get("axis")![0]()[0] &&
            props.linkedStatuses.get("axis")![0]()[1] !== dynPos
          )
            return;
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
          if (
            props.linkedStatuses.get("axis")![0]()[0] &&
            props.linkedStatuses.get("axis")![0]()[1] !== dynPos
          )
            return;
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

  const checkDesc = (key: string) => {
    const description = props.description;
    if (!description) return false;
    const descKeys = Array.from(Object.keys(description));
    if (descKeys.includes(key)) {
      return true;
    } else return false;
  };

  return (
    <Tabs.Root
      value={props.focusedTab ? props.focusedTab : props.id + "driver"}
      onValueChange={(details) => props.onFocustTabChange?.(details.value)}
      orientation="vertical"
      variant="outline"
      width="100%"
      height="100% "
    >
      <Tabs.List
        height={"100%"}
        background={"bg.canvas"}
        padding="0.5em"
        borderWidth={"1px"}
        borderBottomLeftRadius={"0.5em"}
      >
        <Tabs.Trigger
          value={props.id + "driver"}
          _selected={{
            background: "bg.default",
            opacity: "1",
            borderColor: "bg.disabled",
            borderRadius: "0.5em",
          }}
          opacity={"0.5"}
          style={{ padding: "0", "padding-right": "0.5em" }}
        >
          <Stack
            style={{
              width: "0.5em",
              height: "0.5em",
              "border-radius": "1em",
              "margin-left": "0.5em",
            }}
            background={
              props.originalFile &&
              Object.values(props.originalFile)
                .filter((val) => typeof val !== "object")
                .join() !==
                Object.values(config)
                  .filter((val) => typeof val !== "object")
                  .join()
                ? "accent.7"
                : undefined
            }
          />
          {"Driver"}
        </Tabs.Trigger>
        <For
          each={Object.entries(config).filter(
            (entry) => typeof entry === "object",
          )}
        >
          {(entry) => {
            const key = entry[0];
            const value = entry[1];
            const label = Array.from(key)
              .map((char, i) => {
                if (i === 0) return char.toUpperCase();
                if (char === "_") return " ";
                if (key[i - 1] === "_") return char.toUpperCase();
                return char.toLowerCase();
              })
              .join("");
            if (typeof value === "object") {
              return (
                <Tabs.Trigger
                  value={props.id + key}
                  _selected={{
                    background: "bg.default",
                    opacity: "1",
                    borderColor: "bg.disabled",
                    borderRadius: "0.5em",
                  }}
                  opacity={"0.5"}
                  style={{ padding: "0", "padding-right": "0.5em" }}
                >
                  <Stack
                    style={{
                      width: "0.5em",
                      height: "0.5em",
                      "border-radius": "1em",
                      "margin-left": "0.5em",
                    }}
                    background={
                      props.originalFile &&
                      JSON5.stringify(
                        props.originalFile[
                          key as keyof typeof props.originalFile
                        ],
                      ) !== JSON5.stringify(config[key as keyof typeof config])
                        ? "accent.7"
                        : undefined
                    }
                  />
                  {label}
                </Tabs.Trigger>
              );
            }
          }}
        </For>
        <Tabs.Indicator />
      </Tabs.List>

      <Tabs.Content
        value={props.id + "driver"}
        width="100%"
        height="100%"
        style={{
          "padding-top": "0",
          "padding-bottom": "0",
          "column-width": "500px",
          "column-count": "2",
        }}
        borderBottomRightRadius={"0.5em"}
      >
        <For
          each={Object.entries(config).filter(
            (entry) => typeof entry[1] !== "object",
          )}
        >
          {(entry) => {
            const key: string = entry[0];
            const value = entry[1];
            if (typeof value === "number") {
              return (
                <FormNumberInput
                  id={`${props.id}.${key}`}
                  label={key}
                  desc={
                    checkDesc(`__${key}`)
                      ? props.description![
                          `__${key}` as keyof typeof props.description
                        ]
                      : undefined
                  }
                  originalValue={
                    props.originalFile
                      ? props.originalFile[
                          key as keyof typeof props.originalFile
                        ]
                      : undefined
                  }
                  inputValue={config[key as keyof typeof config]}
                  onInputChange={(inputValue) => {
                    setConfig(
                      key as keyof typeof config,
                      // @ts-ignore: TSC unable to handle generic object type
                      // in store
                      inputValue,
                    );
                  }}
                />
              );
            } else if (typeof value === "boolean") {
              return (
                <FormCheckBox
                  id={`${props.id}.${key}`}
                  label={key}
                  desc={
                    checkDesc(`__${key}`)
                      ? props.description![
                          "key" as keyof typeof props.description
                        ]
                      : undefined
                  }
                  originalValue={
                    props.originalFile
                      ? props.originalFile[
                          key as keyof typeof props.originalFile
                        ]
                      : undefined
                  }
                  checked={config[key as keyof typeof config]}
                  onCheckedChange={(checked) =>
                    setConfig(
                      key as keyof typeof config,
                      // @ts-ignore: TSC unable to handle generic object type
                      // in store
                      checked,
                    )
                  }
                />
              );
            }
          }}
        </For>
      </Tabs.Content>
      <For
        each={Object.entries(config).filter(
          (entry) => typeof entry === "object",
        )}
      >
        {(entry) => {
          const key = entry[0];
          const value = entry[1];
          if (typeof value === "object") {
            return (
              <Tabs.Content
                value={props.id + key}
                style={{
                  "overflow-y": "auto",
                  width: " 100%",
                  height: "100%",
                  "padding-top": "0",
                }}
                borderBottomRightRadius={"0.5em"}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Form
                    id={`${props.id}.${key}`}
                    object={value}
                    description={
                      checkDesc(key)
                        ? props.description![
                            key as keyof typeof props.description
                          ]
                        : undefined
                    }
                    originalFile={
                      props.originalFile && key in props.originalFile
                        ? props.originalFile![
                            key as keyof typeof props.originalFile
                          ]
                        : undefined
                    }
                    accordionStates={props.accordionStatuses}
                    linkStates={props.linkedStatuses}
                    gainLockStatuses={props.gainLockStatuses}
                    gainKinds={dynamic}
                  />
                </div>
              </Tabs.Content>
            );
          }
        }}
      </For>
    </Tabs.Root>
  );
}
