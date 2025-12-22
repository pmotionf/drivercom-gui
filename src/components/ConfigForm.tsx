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
import { Stack } from "styled-system/jsx";
import JSON5 from "json5";
import { configTabForm } from "~/GlobalState";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  id: string;
  description?: object;
  originalFile?: object;
  changeUnits?: boolean;
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

  return (
    <Tabs.Root
      value={
        props.focusedTab
          ? props.focusedTab
          : props.id + Object.keys(configTabForm())[0]
      }
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
        <For each={Object.entries(configTabForm())}>
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

      <For each={Object.entries(configTabForm())}>
        {(entry) => {
          const key = entry[0];
          const format = entry[1];
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
              <Form
                id={`${props.id}.${key}`}
                format={format}
                value={props.config}
                description={props.description}
                originalFile={props.originalFile}
                changeUnits={props.changeUnits}
                accordionStates={props.accordionStatuses}
                linkStates={props.linkedStatuses}
                gainLockStatuses={props.gainLockStatuses}
                gainKinds={dynamic}
              />
            </Tabs.Content>
          );
        }}
      </For>
    </Tabs.Root>
  );
}
