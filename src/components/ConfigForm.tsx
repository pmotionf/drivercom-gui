import {
  type Accessor,
  createEffect,
  createSignal,
  For,
  JSX,
  on,
  type Setter,
} from "solid-js";
import { createStore } from "solid-js/store";

import { Stack } from "styled-system/jsx";
import { Text } from "./ui/text.tsx";
import { FormCheckBox } from "./Form/FormCheckBox.tsx";
import { FormNumberInput } from "./Form/FormNumberInput.tsx";
import { FormCollapsibleObject } from "./Form/FormCollapsibleObject.tsx";
import { FormList } from "./Form/FormList.tsx";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  id: string;
  config: object;
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
    <ConfigObject
      object={config}
      id_prefix={props.id}
      accordionStatuses={props.accordionStatuses}
      linkedStatuses={props.linkedStatuses}
      gainLockStatuses={props.gainLockStatuses}
      gainKinds={dynamic}
    />
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

export function ConfigObject(props: ConfigObjectProps) {
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
                  <FormList
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

            if (
              Object.values(value).length > 1 ||
              Object.values(value).some((val) => typeof val === "object")
            ) {
              return (
                <FormCollapsibleObject
                  id_prefix={props.id_prefix}
                  key={key}
                  object={value}
                  gainKey={gainkey}
                  gainKinds={props.gainKinds}
                  accordionStatuses={props.accordionStatuses}
                  linkedStatuses={props.linkedStatuses}
                  gainLockStatuses={props.gainLockStatuses}
                  onItemChange={() => props.onItemChange?.()}
                />
              );
            } else {
              return (
                <>
                  <div
                    style={{
                      "border-width": "1px",
                      padding: "0.5rem 1rem 0.5rem 1rem",
                      "margin-top": "0.5rem",
                      "border-radius": "0.5em",
                    }}
                  >
                    <Text fontWeight="bold" color="fg.subtle">
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
                  </div>
                </>
              );
            }
          }
          if (typeof value === "boolean") {
            return (
              <FormCheckBox
                id={props.id_prefix + key}
                label={key}
                checked={object[key as keyof typeof object]}
                onCheckedChange={(checked) =>
                  setObject(
                    key as keyof typeof object,
                    // @ts-ignore: TSC unable to handle generic object type
                    // in store
                    checked,
                  )
                }
              />
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

            return (
              <FormNumberInput
                id={props.id_prefix + key}
                label={key}
                lockStatus={lockStatus}
                lockStatusKey={
                  lockStatusKey.length > 0 ? lockStatusKey : undefined
                }
                inputValue={object[key as keyof typeof object]}
                onInputChange={(value) => {
                  setObject(
                    key as keyof typeof object,
                    // @ts-ignore: TSC unable to handle generic object type
                    // in store
                    value,
                  );
                  props.onItemChange?.();
                }}
              />
            );
          }
        }}
      </For>
    </div>
  );
}
