import { type Accessor, createEffect, JSX, on, type Setter } from "solid-js";
import { createStore } from "solid-js/store";
import { AccordionStates, Form } from "./Form";

export type ConfigFormProps = JSX.HTMLAttributes<HTMLFormElement> & {
  id: string;
  config: object;
  accordionStatuses: AccordionStates;
  linkedStatuses: LinkStates;
  gainLockStatuses: GainLockStates;
};

export type LinkStates = Map<
  string,
  [Accessor<[boolean, number]>, Setter<[boolean, number]>]
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
    <Form
      object={config}
      id={props.id}
      accordionStates={props.accordionStatuses}
      linkStates={props.linkedStatuses}
      gainLockStatuses={props.gainLockStatuses}
      gainKinds={dynamic}
    />
  );
}
